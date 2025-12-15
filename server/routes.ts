import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeForexChart } from "./openai";
import { sendVerificationEmail } from "./email";
import { logInfo, logError, logWarn } from "./logger";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

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

      await logInfo('auth', `New user signup: ${email}`, { userId: user.id });
      res.json({ 
        message: 'Account created. Please check your email to verify your account.',
        requiresVerification: true 
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      await logError('auth', `Signup failed: ${error.message}`, { error: error.message });
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
      req.session.regenerate(async (err: any) => {
        if (err) {
          console.error('Session regeneration error:', err);
          await logError('auth', `Login session error: ${err.message}`, { email });
          return res.status(500).json({ error: 'Failed to log in' });
        }
        
        req.session.userId = user.id;
        
        await logInfo('auth', `User logged in: ${email}`, { userId: user.id });
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
      await logError('auth', `Login failed: ${error.message}`, { error: error.message });
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
          provider: 'groq',
          modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
          systemPrompt: 'You are an expert forex trading analyst. Analyze the provided chart image and provide trading signals including entry points, stop loss, take profit levels, and detailed reasoning.'
        });
      }

      await logInfo('ai', `Starting chart analysis`, { provider: config.provider, model: config.modelId }, userId);

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

      await logInfo('ai', `Chart analysis completed: ${analysisResult.trend} trend with ${analysisResult.confidence}% confidence`, { analysisId: analysis.id }, userId);
      res.json(analysis);
    } catch (error: any) {
      const env = process.env.NODE_ENV || 'development';
      console.error(`[${env.toUpperCase()}] Error creating analysis:`, error);
      await logError('ai', `[${env.toUpperCase()}] Chart analysis failed: ${error.message}`, { 
        environment: env,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        name: error.name || 'Error'
      }, getUserId(req));
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

  // User profile update route
  app.put('/api/auth/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { firstName, lastName, email, currentPassword, newPassword } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updates: any = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;

      // Handle email change
      if (email && email.toLowerCase() !== user.email) {
        const existingUser = await storage.getUserByEmail(email.toLowerCase());
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        updates.email = email.toLowerCase();
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change password' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, user.passwordHash || '');
        if (!validPassword) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        if (newPassword.length < 8) {
          return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        updates.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      const updatedUser = await storage.updateUser(userId, updates);

      res.json({
        id: updatedUser!.id,
        email: updatedUser!.email,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        role: updatedUser!.role,
        plan: updatedUser!.plan,
        credits: updatedUser!.credits,
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
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

  // Admin: Update any user's details
  app.put('/api/admin/users/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email, role, plan, credits, newPassword, emailVerified } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updates: any = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (role !== undefined) updates.role = role;
      if (plan !== undefined) updates.plan = plan;
      if (credits !== undefined) updates.credits = credits;
      if (emailVerified !== undefined) updates.emailVerified = emailVerified;

      // Handle email change
      if (email && email.toLowerCase() !== user.email) {
        const existingUser = await storage.getUserByEmail(email.toLowerCase());
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        updates.email = email.toLowerCase();
      }

      // Handle password change (admin can set new password without knowing current)
      if (newPassword) {
        if (newPassword.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        updates.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      const updatedUser = await storage.updateUser(userId, updates);

      res.json({
        id: updatedUser!.id,
        email: updatedUser!.email,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        role: updatedUser!.role,
        plan: updatedUser!.plan,
        credits: updatedUser!.credits,
        emailVerified: updatedUser!.emailVerified,
        createdAt: updatedUser!.createdAt,
      });
    } catch (error: any) {
      console.error('Admin user update error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.get('/api/admin/config', requireAdmin, async (req, res) => {
    try {
      let config = await storage.getSystemConfig();
      
      if (!config) {
        config = await storage.createSystemConfig({
          provider: 'groq',
          modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
          provider: provider || 'groq',
          modelId: modelId || 'meta-llama/llama-4-scout-17b-16e-instruct',
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

  // API Keys status endpoint (admin only) - shows which keys are configured without exposing values
  app.get('/api/admin/api-keys-status', requireAdmin, async (req, res) => {
    try {
      res.json({
        groq: !!process.env.GROQ_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.CUSTOM_OPENAI_API_KEY,
      });
    } catch (error) {
      console.error("Error fetching API keys status:", error);
      res.status(500).json({ error: 'Failed to fetch API keys status' });
    }
  });

  // System info endpoint (admin only)
  const serverStartTime = new Date();
  
  app.get('/api/system-info', requireAdmin, async (req, res) => {
    try {
      const uptimeSeconds = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
      
      res.json({
        version: '1.0.0',
        deployedAt: serverStartTime.toISOString(),
        uptime: uptimeSeconds,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error("Error fetching system info:", error);
      res.status(500).json({ error: 'Failed to fetch system info' });
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

  // Credit packages routes
  app.get('/api/credit-packages', async (req, res) => {
    try {
      const packages = await storage.getCreditPackages();
      
      // Seed default packages if none exist
      if (packages.length === 0) {
        const defaultPackages = [
          { name: 'Starter', credits: 10, priceZar: 5000, description: '10 chart analyses' },
          { name: 'Pro', credits: 50, priceZar: 20000, description: '50 chart analyses - Best value!' },
          { name: 'Enterprise', credits: 200, priceZar: 60000, description: '200 chart analyses for serious traders' },
        ];
        
        for (const pkg of defaultPackages) {
          await storage.createCreditPackage(pkg);
        }
        
        const seededPackages = await storage.getCreditPackages();
        return res.json(seededPackages);
      }
      
      res.json(packages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      res.status(500).json({ error: 'Failed to fetch credit packages' });
    }
  });

  // Paystack payment routes
  app.post('/api/paystack/initialize', requireAuth, async (req: any, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment system not configured' });
      }

      const { packageId } = req.body;
      const userId = req.session.userId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const creditPackage = await storage.getCreditPackage(packageId);
      if (!creditPackage) {
        return res.status(404).json({ error: 'Package not found' });
      }

      const reference = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        packageId,
        amount: creditPackage.priceZar,
        credits: creditPackage.credits,
        status: 'pending',
        paystackReference: reference,
      });

      // Initialize Paystack transaction
      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: creditPackage.priceZar, // Already in kobo/cents
          reference,
          metadata: {
            userId,
            packageId,
            credits: creditPackage.credits,
          },
          callback_url: `${req.protocol}://${req.get('host')}/pricing?reference=${reference}`,
        }),
      });

      const data = await response.json();

      if (!data.status) {
        console.error('Paystack initialization failed:', data);
        return res.status(500).json({ error: data.message || 'Payment initialization failed' });
      }

      res.json({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
      });
    } catch (error: any) {
      console.error("Error initializing payment:", error);
      res.status(500).json({ error: 'Failed to initialize payment' });
    }
  });

  app.get('/api/paystack/verify/:reference', requireAuth, async (req: any, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment system not configured' });
      }

      const { reference } = req.params;
      const userId = req.session.userId;

      // Check if transaction exists and belongs to user
      const transaction = await storage.getTransactionByReference(reference);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (transaction.status === 'success') {
        return res.json({ status: 'success', message: 'Payment already verified', credits: transaction.credits });
      }

      // Verify with Paystack
      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      const data = await response.json();

      if (!data.status || data.data.status !== 'success') {
        await storage.updateTransactionStatus(transaction.id, 'failed');
        return res.status(400).json({ error: 'Payment verification failed' });
      }

      // Update transaction and add credits
      await storage.updateTransactionStatus(transaction.id, 'success');
      await storage.addCredits(userId, transaction.credits);

      res.json({ 
        status: 'success', 
        message: 'Payment verified successfully', 
        credits: transaction.credits 
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  });

  // Paystack webhook for automatic verification
  app.post('/api/paystack/webhook', async (req, res) => {
    try {
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const event = req.body;

      if (event.event === 'charge.success') {
        const { reference } = event.data;
        
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === 'pending') {
          await storage.updateTransactionStatus(transaction.id, 'success');
          await storage.addCredits(transaction.userId, transaction.credits);
          console.log(`Webhook: Added ${transaction.credits} credits to user ${transaction.userId}`);
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook error:", error);
      res.sendStatus(500);
    }
  });

  // Mobile payment routes (Airtel Money)
  app.post('/api/mobile-payments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { packageId, phoneNumber, screenshotUrl } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const creditPackage = await storage.getCreditPackage(packageId);
      if (!creditPackage) {
        return res.status(404).json({ error: 'Package not found' });
      }

      const payment = await storage.createMobilePayment({
        userId,
        packageId,
        amount: creditPackage.priceZar,
        credits: creditPackage.credits,
        phoneNumber,
        screenshotUrl: screenshotUrl || null,
        status: 'pending',
      });

      res.json(payment);
    } catch (error: any) {
      console.error("Error creating mobile payment:", error);
      res.status(500).json({ error: 'Failed to submit payment' });
    }
  });

  app.get('/api/mobile-payments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const payments = await storage.getMobilePaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching mobile payments:", error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  app.get('/api/admin/mobile-payments', requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string || undefined;
      const payments = await storage.getAllMobilePayments(status);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching mobile payments:", error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  app.put('/api/admin/mobile-payments/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
      }

      const payment = await storage.getMobilePayment(id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status !== 'pending') {
        return res.status(400).json({ error: 'Payment has already been processed' });
      }

      const updatedPayment = await storage.updateMobilePaymentStatus(id, status, adminNotes);

      if (status === 'approved') {
        await storage.addCredits(payment.userId, payment.credits);
      }

      await logInfo('mobile_payment', `Payment ${status} for ${payment.credits} credits`, { paymentId: id, userId: payment.userId }, req.session.userId);
      res.json(updatedPayment);
    } catch (error: any) {
      console.error("Error updating mobile payment:", error);
      await logError('mobile_payment', `Failed to update payment: ${error.message}`, { error: error.message });
      res.status(500).json({ error: 'Failed to update payment' });
    }
  });

  // Admin logs routes
  app.get('/api/admin/logs', requireAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const service = req.query.service as string || undefined;
      const level = req.query.level as string || undefined;
      const logs = await storage.getLogs(limit, service, level);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  app.delete('/api/admin/logs', requireAdmin, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const deleted = await storage.clearLogs(days);
      await logInfo('system', `Cleared logs older than ${days} days`, { deleted }, req.session.userId);
      res.json({ message: `Cleared logs older than ${days} days`, deleted });
    } catch (error: any) {
      console.error("Error clearing logs:", error);
      res.status(500).json({ error: 'Failed to clear logs' });
    }
  });

  return httpServer;
}
