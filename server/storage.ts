import {
  type User,
  type InsertUser,
  type UpsertUser,
  type Analysis,
  type InsertAnalysis,
  type SystemConfig,
  type InsertSystemConfig,
  type UsageTracking,
  type InsertUsageTracking,
  users,
  analyses,
  systemConfig,
  usageTracking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined>;
  addCredits(userId: string, amount: number): Promise<User | undefined>;
  deductCredit(userId: string): Promise<{ success: boolean; user?: User; error?: string }>;
  
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  getAnalysesByUser(userId: string): Promise<Analysis[]>;
  
  getSystemConfig(): Promise<SystemConfig | undefined>;
  createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
  updateSystemConfig(id: string, config: Partial<InsertSystemConfig>): Promise<SystemConfig | undefined>;
  
  getUserUsageToday(userId: string): Promise<UsageTracking | undefined>;
  createUsageTracking(usage: InsertUsageTracking): Promise<UsageTracking>;
  incrementUsageCount(userId: string, date: string): Promise<UsageTracking>;
  
  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean, limit?: number, offset?: number): Promise<any[]>;
  listProductsWithPrices(active?: boolean, limit?: number, offset?: number): Promise<any[]>;
  getPrice(priceId: string): Promise<any>;
  listPrices(active?: boolean, limit?: number, offset?: number): Promise<any[]>;
  getPricesForProduct(productId: string): Promise<any[]>;
  getSubscription(subscriptionId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(insertAnalysis).returning();
    return analysis;
  }

  async getAnalysis(id: string): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async getAnalysesByUser(userId: string): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }

  async getSystemConfig(): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig).limit(1);
    return config || undefined;
  }

  async createSystemConfig(insertConfig: InsertSystemConfig): Promise<SystemConfig> {
    const [config] = await db.insert(systemConfig).values(insertConfig).returning();
    return config;
  }

  async updateSystemConfig(
    id: string,
    updates: Partial<InsertSystemConfig>
  ): Promise<SystemConfig | undefined> {
    const [config] = await db
      .update(systemConfig)
      .set(updates)
      .where(eq(systemConfig.id, id))
      .returning();
    return config || undefined;
  }

  async getUserUsageToday(userId: string): Promise<UsageTracking | undefined> {
    const today = new Date().toISOString().split("T")[0];
    const [usage] = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, today)));
    return usage || undefined;
  }

  async createUsageTracking(insertUsage: InsertUsageTracking): Promise<UsageTracking> {
    const [usage] = await db.insert(usageTracking).values(insertUsage).returning();
    return usage;
  }

  async incrementUsageCount(userId: string, date: string): Promise<UsageTracking> {
    const existing = await db
      .select()
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.date, date)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(usageTracking)
        .set({ analysisCount: existing[0].analysisCount + 1 })
        .where(eq(usageTracking.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [newUsage] = await db
        .insert(usageTracking)
        .values({ userId, date, analysisCount: 1 })
        .returning();
      return newUsage;
    }
  }

  async updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user || undefined;
  }

  async addCredits(userId: string, amount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    const newCredits = (user.credits || 0) + amount;
    const [updated] = await db.update(users).set({ credits: newCredits, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return updated || undefined;
  }

  async deductCredit(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const user = await this.getUser(userId);
    if (!user) return { success: false, error: 'User not found' };
    if ((user.credits || 0) < 1) return { success: false, error: 'Insufficient credits' };
    const [updated] = await db.update(users).set({ credits: user.credits - 1, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return { success: true, user: updated };
  }

  async getProduct(productId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true, limit = 20, offset = 0): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true, limit = 20, offset = 0): Promise<any[]> {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
          ORDER BY id
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async listPrices(active = true, limit = 20, offset = 0): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async getPricesForProduct(productId: string): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE product = ${productId} AND active = true`
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }
}

export const storage = new DatabaseStorage();
