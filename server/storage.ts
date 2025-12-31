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
  type CreditPackage,
  type InsertCreditPackage,
  type Transaction,
  type InsertTransaction,
  type MobilePayment,
  type InsertMobilePayment,
  type ServiceLog,
  type InsertServiceLog,
  type AiProvider,
  type InsertAiProvider,
  type ApiKey,
  type InsertApiKey,
  users,
  analyses,
  systemConfig,
  usageTracking,
  creditPackages,
  transactions,
  mobilePayments,
  serviceLogs,
  aiProviders,
  apiKeys,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, max, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  addCredits(userId: string, amount: number): Promise<User | undefined>;
  deductCredit(userId: string): Promise<{ success: boolean; user?: User; error?: string }>;
  
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  getAnalysesByUser(userId: string): Promise<Analysis[]>;
  getAllAnalyses(): Promise<Analysis[]>;
  getUserAnalysisStats(): Promise<{ userId: string; count: number; lastAnalysis: Date | null }[]>;
  getRecentAnalysesCount(days: number): Promise<number>;
  getAnalysesByDay(days: number): Promise<Record<string, number>>;
  
  getSystemConfig(): Promise<SystemConfig | undefined>;
  createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
  updateSystemConfig(id: string, config: Partial<InsertSystemConfig>): Promise<SystemConfig | undefined>;
  
  getUserUsageToday(userId: string): Promise<UsageTracking | undefined>;
  createUsageTracking(usage: InsertUsageTracking): Promise<UsageTracking>;
  incrementUsageCount(userId: string, date: string): Promise<UsageTracking>;

  getCreditPackages(): Promise<CreditPackage[]>;
  getCreditPackage(id: string): Promise<CreditPackage | undefined>;
  createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage>;
  
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getTransactionByReference(reference: string): Promise<Transaction | undefined>;
  updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined>;

  createMobilePayment(payment: InsertMobilePayment): Promise<MobilePayment>;
  getMobilePaymentsByUser(userId: string): Promise<MobilePayment[]>;
  getPendingMobilePayments(): Promise<MobilePayment[]>;
  getAllMobilePayments(status?: string): Promise<MobilePayment[]>;
  getMobilePayment(id: string): Promise<MobilePayment | undefined>;
  updateMobilePaymentStatus(id: string, status: string, adminNotes?: string): Promise<MobilePayment | undefined>;

  createLog(log: InsertServiceLog): Promise<ServiceLog>;
  getLogs(limit?: number, service?: string, level?: string): Promise<ServiceLog[]>;
  clearLogs(olderThanDays?: number): Promise<number>;

  // AI Providers
  getAiProviders(): Promise<AiProvider[]>;
  getAiProvider(id: string): Promise<AiProvider | undefined>;
  createAiProvider(provider: InsertAiProvider): Promise<AiProvider>;
  updateAiProvider(id: string, updates: Partial<InsertAiProvider>): Promise<AiProvider | undefined>;
  deleteAiProvider(id: string): Promise<boolean>;

  // API Keys
  getApiKey(keyName: string): Promise<string | null>;
  setApiKey(keyName: string, value: string): Promise<void>;
  deleteApiKey(keyName: string): Promise<boolean>;
  getAllApiKeyNames(): Promise<string[]>;
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

  async getAllAnalyses(): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .orderBy(desc(analyses.createdAt));
  }

  async getUserAnalysisStats(): Promise<{ userId: string; count: number; lastAnalysis: Date | null }[]> {
    const result = await db
      .select({
        userId: analyses.userId,
        count: count(analyses.id),
        lastAnalysis: max(analyses.createdAt),
      })
      .from(analyses)
      .groupBy(analyses.userId);
    
    return result.map(r => ({
      userId: r.userId,
      count: Number(r.count),
      lastAnalysis: r.lastAnalysis
    }));
  }

  async getRecentAnalysesCount(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db
      .select({ count: count(analyses.id) })
      .from(analyses)
      .where(gte(analyses.createdAt, cutoffDate));
    
    return Number(result[0]?.count || 0);
  }

  async getAnalysesByDay(days: number): Promise<Record<string, number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db
      .select({
        day: sql<string>`DATE(${analyses.createdAt})::text`,
        count: count(analyses.id),
      })
      .from(analyses)
      .where(gte(analyses.createdAt, cutoffDate))
      .groupBy(sql`DATE(${analyses.createdAt})`);
    
    const byDay: Record<string, number> = {};
    for (const row of result) {
      byDay[row.day] = Number(row.count);
    }
    return byDay;
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

  async getCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages).where(eq(creditPackages.isActive, true));
  }

  async getCreditPackage(id: string): Promise<CreditPackage | undefined> {
    const [pkg] = await db.select().from(creditPackages).where(eq(creditPackages.id, id));
    return pkg || undefined;
  }

  async createCreditPackage(insertPkg: InsertCreditPackage): Promise<CreditPackage> {
    const [pkg] = await db.insert(creditPackages).values(insertPkg).returning();
    return pkg;
  }

  async createTransaction(insertTx: InsertTransaction): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values(insertTx).returning();
    return tx;
  }

  async getTransactionByReference(reference: string): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.paystackReference, reference));
    return tx || undefined;
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    const [tx] = await db.update(transactions).set({ status }).where(eq(transactions.id, id)).returning();
    return tx || undefined;
  }

  async createMobilePayment(payment: InsertMobilePayment): Promise<MobilePayment> {
    const [mp] = await db.insert(mobilePayments).values(payment).returning();
    return mp;
  }

  async getMobilePaymentsByUser(userId: string): Promise<MobilePayment[]> {
    return await db.select().from(mobilePayments).where(eq(mobilePayments.userId, userId)).orderBy(desc(mobilePayments.createdAt));
  }

  async getPendingMobilePayments(): Promise<MobilePayment[]> {
    return await db.select().from(mobilePayments).where(eq(mobilePayments.status, 'pending')).orderBy(desc(mobilePayments.createdAt));
  }

  async getAllMobilePayments(status?: string): Promise<MobilePayment[]> {
    if (status && status !== 'all') {
      return await db.select().from(mobilePayments).where(eq(mobilePayments.status, status)).orderBy(desc(mobilePayments.createdAt));
    }
    return await db.select().from(mobilePayments).orderBy(desc(mobilePayments.createdAt));
  }

  async getMobilePayment(id: string): Promise<MobilePayment | undefined> {
    const [mp] = await db.select().from(mobilePayments).where(eq(mobilePayments.id, id));
    return mp || undefined;
  }

  async updateMobilePaymentStatus(id: string, status: string, adminNotes?: string): Promise<MobilePayment | undefined> {
    const updates: any = { status, processedAt: new Date() };
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    const [mp] = await db.update(mobilePayments).set(updates).where(eq(mobilePayments.id, id)).returning();
    return mp || undefined;
  }

  async createLog(log: InsertServiceLog): Promise<ServiceLog> {
    const [entry] = await db.insert(serviceLogs).values(log).returning();
    return entry;
  }

  async getLogs(limit: number = 100, service?: string, level?: string, userId?: string): Promise<ServiceLog[]> {
    let query = db.select().from(serviceLogs);
    const conditions = [];
    if (service) conditions.push(eq(serviceLogs.service, service));
    if (level) conditions.push(eq(serviceLogs.level, level));
    if (userId) conditions.push(eq(serviceLogs.userId, userId));
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return await query.orderBy(desc(serviceLogs.createdAt)).limit(limit);
  }

  async clearLogs(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    await db.delete(serviceLogs);
    return 0;
  }

  async getAiProviders(): Promise<AiProvider[]> {
    return await db.select().from(aiProviders).orderBy(aiProviders.name);
  }

  async getAiProvider(id: string): Promise<AiProvider | undefined> {
    const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, id));
    return provider || undefined;
  }

  async createAiProvider(provider: InsertAiProvider): Promise<AiProvider> {
    const [newProvider] = await db.insert(aiProviders).values(provider).returning();
    return newProvider;
  }

  async updateAiProvider(id: string, updates: Partial<InsertAiProvider>): Promise<AiProvider | undefined> {
    const [provider] = await db.update(aiProviders).set(updates).where(eq(aiProviders.id, id)).returning();
    return provider || undefined;
  }

  async deleteAiProvider(id: string): Promise<boolean> {
    const result = await db.delete(aiProviders).where(eq(aiProviders.id, id));
    return true;
  }

  async getApiKey(keyName: string): Promise<string | null> {
    try {
      const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyName, keyName));
      if (!key) return null;
      
      const { decrypt } = await import('./encryption');
      return decrypt(key.encryptedValue);
    } catch (error) {
      console.error('Failed to get API key:', keyName, error);
      return null;
    }
  }

  async setApiKey(keyName: string, value: string): Promise<void> {
    const { encrypt } = await import('./encryption');
    const encryptedValue = encrypt(value);
    
    await db.insert(apiKeys)
      .values({ keyName, encryptedValue })
      .onConflictDoUpdate({
        target: apiKeys.keyName,
        set: { encryptedValue, updatedAt: new Date() }
      });
  }

  async deleteApiKey(keyName: string): Promise<boolean> {
    await db.delete(apiKeys).where(eq(apiKeys.keyName, keyName));
    return true;
  }

  async getAllApiKeyNames(): Promise<string[]> {
    const keys = await db.select({ keyName: apiKeys.keyName }).from(apiKeys);
    return keys.map(k => k.keyName);
  }
}

export const storage = new DatabaseStorage();

import bcrypt from "bcryptjs";

export async function seedAdminUser(): Promise<void> {
  const adminEmail = "emmanuel.m@alintatechsolutions.co.za";
  const adminPassword = "p2Admin@1012!";
  
  try {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (existingAdmin) {
      await storage.updateUser(existingAdmin.id, {
        passwordHash,
        role: "admin",
        plan: "pro",
        emailVerified: true,
      });
      console.log("Admin user password reset:", adminEmail);
      return;
    }
    
    await storage.createUser({
      email: adminEmail,
      firstName: "Emmanuel",
      lastName: "Admin",
      passwordHash,
      role: "admin",
      plan: "pro",
      credits: 1000,
      emailVerified: true,
    });
    
    console.log("Admin user created successfully:", adminEmail);
  } catch (error) {
    console.error("Failed to seed admin user:", error);
  }
}
