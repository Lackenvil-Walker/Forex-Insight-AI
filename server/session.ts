// Simple session configuration for custom auth
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express } from "express";

export function setupSession(app: Express) {
  const PgSession = connectPgSimple(session);
  
  const sessionSecret = process.env.SESSION_SECRET || "forexai-secret-key-change-in-production";
  
  app.set("trust proxy", 1);
  
  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "sessions",
        createTableIfMissing: false,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );
}
