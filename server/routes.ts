import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { analyzeForexChart } from "./openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  function requireAdmin(req: any, res: any, next: any) {
    if (req.user?.claims?.sub) {
      storage.getUser(req.user.claims.sub).then(user => {
        if (user?.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }
        next();
      }).catch(() => {
        res.status(403).json({ error: 'Admin access required' });
      });
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  }

  app.post('/api/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/analyses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analyses = await storage.getAnalysesByUser(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: 'Failed to fetch analyses' });
    }
  });

  app.get('/api/analyses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const analysis = await storage.getAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      
      if (analysis.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: 'Failed to fetch analysis' });
    }
  });

  app.get('/api/admin/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/config', isAuthenticated, requireAdmin, async (req, res) => {
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

  app.put('/api/admin/config', isAuthenticated, requireAdmin, async (req, res) => {
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

  return httpServer;
}
