import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupSession } from "./session";
import { seedAdminUser } from "./storage";
import { logError } from "./logger";

// Load environment variables from /root/forex.env for production deployments
const prodEnvPath = "/root/forex.env";
const localEnvPath = resolve(process.cwd(), ".env");

if (existsSync(prodEnvPath)) {
  console.log(`Loading environment from ${prodEnvPath}`);
  dotenv.config({ path: prodEnvPath });
} else if (existsSync(localEnvPath)) {
  console.log(`Loading environment from ${localEnvPath}`);
  dotenv.config({ path: localEnvPath });
}

const app = express();
const httpServer = createServer(app);

const ENV = process.env.NODE_ENV || 'development';

app.use((req, res, next) => {
  express.json({ limit: '50mb' })(req, res, (err) => {
    if (err) {
      const userId = (req as any).session?.userId || null;
      logError('system', `[${ENV.toUpperCase()}] Body parser error: ${err.message}`, {
        environment: ENV,
        path: req.path,
        method: req.method,
        errorName: err.name || 'Error',
        errorMessage: err.message,
        contentLength: req.headers['content-length'],
        contentType: req.headers['content-type'],
      }, userId);
    }
    next(err);
  });
});
app.use((req, res, next) => {
  express.urlencoded({ extended: false, limit: '50mb' })(req, res, (err) => {
    if (err) {
      const userId = (req as any).session?.userId || null;
      logError('system', `[${ENV.toUpperCase()}] URL parser error: ${err.message}`, {
        environment: ENV,
        path: req.path,
        method: req.method,
        errorName: err.name || 'Error',
        errorMessage: err.message,
      }, userId);
    }
    next(err);
  });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  setupSession(app);
  await registerRoutes(httpServer, app);
  
  await seedAdminUser();

  app.use(async (err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log all errors to database
    const userId = (req as any).session?.userId || null;
    const errorDetails = {
      environment: ENV,
      path: req.path,
      method: req.method,
      status,
      errorName: err.name || 'Error',
      errorMessage: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };
    
    await logError('system', `[${ENV.toUpperCase()}] ${err.name || 'Error'}: ${message} on ${req.method} ${req.path}`, errorDetails, userId);
    console.error(`[${ENV.toUpperCase()}] [ERROR] ${req.method} ${req.path}:`, err.message);

    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
