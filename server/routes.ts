import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeForexChart } from "./openai";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendVerificationEmail } from "./email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const GUEST_USER_ID = "guest-user";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function getUserId(req: any): string {
  if (req.session?.userId) {
    return req.session.userId;
  }
  return GUEST_USER_ID;
}

function isAuthenticated(req: any): boolean {
  return !!req.session?.userId;
}

const requireAuth: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  async function ensureGuestUser() {
    let user = await storage.getUser(GUEST_USER_ID);
    if (!user) {
      user = await storage.upsertUser({
        id: GUEST_USER_ID,
        email: 'guest@forexai.app',
        passwordHash: '',
        firstName: 'Guest',
        lastName: 'User',
        profileImageUrl: null,
      });
    }
    return user;
  }

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: false,
        verificationToken,
        verificationTokenExpires,
        role: isAdmin ? 'admin' : 'user',
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      res.json({ 
        message: 'Account created. Please check your email to verify your account.',
        requiresVerification: true 
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: 'Please verify your email before logging in',
          requiresVerification: true 
        });
      }

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ error: 'Failed to log in' });
        }
        
        req.session.userId = user.id;
        
        res.json({ 
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          plan: user.plan,
          emailVerified: user.emailVerified,
        });
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
        return res.status(400).json({ error: 'Verification token has expired' });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      });

      res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error: any) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Failed to verify email' });
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.json({ message: 'If an account exists, a verification email will be sent.' });
      }

      if (user.emailVerified) {
        return res.json({ message: 'Email is already verified. You can log in.' });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        verificationToken,
        verificationTokenExpires,
      });

      await sendVerificationEmail(email, verificationToken);

      res.json({ message: 'If an account exists, a verification email will be sent.' });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  });

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (req.session?.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            plan: user.plan,
            credits: user.credits,
            emailVerified: user.emailVerified,
            profileImageUrl: user.profileImageUrl,
          });
          return;
        }
      }
      const user = await ensureGuestUser();
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        plan: user.plan,
        credits: user.credits,
        isGuest: true,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/analyze', async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if ((user.credits || 0) < 1) {
        return res.status(402).json({ error: 'No credits remaining. Please purchase credits to continue.', needsCredits: true });
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

      await storage.deductCredit(userId);

      res.json(analysis);
    } catch (error: any) {
      console.error("Error creating analysis:", error);
      res.status(500).json({ error: error.message || 'Failed to create analysis' });
    }
  });

  app.get('/api/analyses', async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const analyses = await storage.getAnalysesByUser(userId);
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

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/config', requireAdmin, async (req, res) => {
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

  app.put('/api/admin/config', requireAdmin, async (req, res) => {
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

  app.post('/api/admin/users/:userId/credits', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, action } = req.body;

      if (typeof amount !== 'number' || amount < 1) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let updatedUser;
      if (action === 'add') {
        updatedUser = await storage.addCredits(userId, amount);
      } else if (action === 'remove') {
        const newCredits = Math.max(0, (user.credits || 0) - amount);
        updatedUser = await storage.updateUser(userId, { credits: newCredits });
      } else {
        return res.status(400).json({ error: 'Action must be "add" or "remove"' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ error: 'Failed to update user credits' });
    }
  });

  app.post('/api/credits/checkout', async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required to purchase credits' });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          metadata: { userId },
        });
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: '5 Analysis Credits',
              description: 'Get 5 AI-powered forex chart analyses',
            },
            unit_amount: 2000,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/dashboard?credits_purchased=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/dashboard?canceled=true`,
        metadata: {
          userId,
          creditsPurchase: 'true',
          creditsAmount: '5',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating credits checkout:", error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  app.post('/api/stripe/webhook/credits', async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const sig = req.headers['stripe-signature'];
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        if (session.metadata?.creditsPurchase === 'true') {
          const userId = session.metadata.userId;
          const creditsAmount = parseInt(session.metadata.creditsAmount || '5', 10);
          await storage.addCredits(userId, creditsAmount);
          console.log(`Added ${creditsAmount} credits to user ${userId}`);
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing credits webhook:", error);
      res.status(500).json({ error: 'Webhook processing failed' });
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
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
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
      const userId = getUserId(req);
      let user = await storage.getUser(userId);
      if (!user) {
        user = await ensureGuestUser();
      }
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          metadata: { userId },
        });
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
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
      const userId = getUserId(req);
      const user = await storage.getUser(userId);

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
