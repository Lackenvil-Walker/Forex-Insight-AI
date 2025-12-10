import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeForexChart } from "./openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const GUEST_USER_ID = "guest-user";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const pgSession = connectPgSimple(session);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  app.set("trust proxy", 1);
  app.use(session({
    store: new pgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'forexai-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  }));

  async function ensureGuestUser() {
    let user = await storage.getUser(GUEST_USER_ID);
    if (!user) {
      user = await storage.upsertUser({
        id: GUEST_USER_ID,
        email: 'guest@forexai.app',
        firstName: 'Guest',
        lastName: 'User',
        profileImageUrl: null,
      });
    }
    return user;
  }

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const user = await ensureGuestUser();
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/analyze', async (req: any, res) => {
    try {
      const userId = GUEST_USER_ID;
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const today = new Date().toISOString().split('T')[0];
      const usage = await storage.getUserUsageToday(userId);

      if (user.plan === 'starter' && usage && usage.analysisCount >= 1) {
        return res.status(402).json({ error: 'Daily limit reached. Please upgrade your plan.' });
      }

      let config = await storage.getSystemConfig();
      if (!config) {
        config = await storage.createSystemConfig({
          provider: 'openai',
          modelId: 'gpt-4o',
          systemPrompt: 'You are an expert forex trading analyst. Analyze the provided chart image and provide trading signals including entry points, stop loss, take profit levels, and detailed reasoning.'
        });
      }

      const analysisResult = await analyzeForexChart(imageData, config.systemPrompt, {
        provider: config.provider,
        modelId: config.modelId,
        endpointUrl: config.endpointUrl,
        useCustomApi: config.useCustomApi,
      });

      const analysis = await storage.createAnalysis({
        userId,
        imageUrl: imageData,
        result: analysisResult
      });

      await storage.incrementUsageCount(userId, today);

      res.json(analysis);
    } catch (error: any) {
      console.error("Error creating analysis:", error);
      res.status(500).json({ error: error.message || 'Failed to create analysis' });
    }
  });

  app.get('/api/analyses', async (req: any, res) => {
    try {
      const analyses = await storage.getAnalysesByUser(GUEST_USER_ID);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: 'Failed to fetch analyses' });
    }
  });

  app.get('/api/analyses/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const analysis = await storage.getAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: 'Failed to fetch analysis' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/config', async (req, res) => {
    try {
      let config = await storage.getSystemConfig();
      
      if (!config) {
        config = await storage.createSystemConfig({
          provider: 'openai',
          modelId: 'gpt-4o',
          systemPrompt: 'You are an expert forex trading analyst. Analyze the provided chart image and provide trading signals including entry points, stop loss, take profit levels, and detailed reasoning.'
        });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  app.put('/api/admin/config', async (req, res) => {
    try {
      const { provider, modelId, endpointUrl, systemPrompt, useCustomApi } = req.body;
      
      let config = await storage.getSystemConfig();
      
      if (!config) {
        config = await storage.createSystemConfig({
          provider: provider || 'openai',
          modelId: modelId || 'gpt-4o',
          endpointUrl,
          systemPrompt: systemPrompt || 'You are an expert forex trading analyst.',
          useCustomApi: useCustomApi || 'false'
        });
      } else {
        const updates: any = {};
        if (provider !== undefined) updates.provider = provider;
        if (modelId !== undefined) updates.modelId = modelId;
        if (endpointUrl !== undefined) updates.endpointUrl = endpointUrl;
        if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
        if (useCustomApi !== undefined) updates.useCustomApi = useCustomApi;
        
        config = await storage.updateSystemConfig(config.id, updates);
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  app.get('/api/stripe/publishable-key', async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ error: 'Failed to get publishable key' });
    }
  });

  app.get('/api/stripe/products', async (req, res) => {
    try {
      const rows = await storage.listProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.get('/api/stripe/subscription', async (req: any, res) => {
    try {
      const user = await storage.getUser(GUEST_USER_ID);
      
      if (!user?.stripeSubscriptionId) {
        return res.json({ subscription: null });
      }

      const subscription = await storage.getSubscription(user.stripeSubscriptionId);
      res.json({ subscription });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  app.post('/api/stripe/checkout', async (req: any, res) => {
    try {
      const user = await ensureGuestUser();
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          metadata: { userId: GUEST_USER_ID },
        });
        await storage.updateUserStripeInfo(GUEST_USER_ID, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/dashboard?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/pricing?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  app.post('/api/stripe/portal', async (req: any, res) => {
    try {
      const user = await storage.getUser(GUEST_USER_ID);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing account found' });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/dashboard`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  return httpServer;
}
