import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, date, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (custom email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: varchar("verification_token"),
  verificationTokenExpires: timestamp("verification_token_expires"),
  role: text("role").notNull().default("user"),
  plan: text("plan").notNull().default("starter"),
  status: text("status").notNull().default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  credits: integer("credits").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull().default("groq"),
  modelId: text("model_id").notNull().default("meta-llama/llama-4-scout-17b-16e-instruct"),
  endpointUrl: text("endpoint_url"),
  systemPrompt: text("system_prompt").notNull(),
  useCustomApi: text("use_custom_api").notNull().default("false"),
  freeLimit: integer("free_limit").notNull().default(1),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
});

export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;

// AI Providers configuration table
export const aiProviders = pgTable("ai_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  apiKeyEnvVar: varchar("api_key_env_var").notNull(),
  baseUrl: text("base_url").notNull(),
  models: text("models").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiProviderSchema = createInsertSchema(aiProviders).omit({
  id: true,
  createdAt: true,
});

export type InsertAiProvider = z.infer<typeof insertAiProviderSchema>;
export type AiProvider = typeof aiProviders.$inferSelect;

export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: date("date").notNull().defaultNow(),
  analysisCount: integer("analysis_count").notNull().default(0),
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({
  id: true,
});

export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UsageTracking = typeof usageTracking.$inferSelect;

// Credit packages for purchase
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  credits: integer("credits").notNull(),
  priceZar: integer("price_zar").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
});

export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;

// Payment transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: varchar("package_id").references(() => creditPackages.id),
  amount: integer("amount").notNull(),
  credits: integer("credits").notNull(),
  status: varchar("status").notNull().default("pending"),
  paystackReference: varchar("paystack_reference").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Mobile money payments (Airtel Money)
export const mobilePayments = pgTable("mobile_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: varchar("package_id").references(() => creditPackages.id),
  amount: integer("amount").notNull(),
  credits: integer("credits").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  screenshotUrl: text("screenshot_url"),
  status: varchar("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertMobilePaymentSchema = createInsertSchema(mobilePayments).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export type InsertMobilePayment = z.infer<typeof insertMobilePaymentSchema>;
export type MobilePayment = typeof mobilePayments.$inferSelect;

// Encrypted API keys storage (for self-hosted deployments)
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyName: varchar("key_name").unique().notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  updatedAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Service logs for admin debugging
export const serviceLogs = pgTable("service_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service").notNull(),
  level: varchar("level").notNull().default("info"),
  message: text("message").notNull(),
  details: jsonb("details"),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceLogSchema = createInsertSchema(serviceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertServiceLog = z.infer<typeof insertServiceLogSchema>;
export type ServiceLog = typeof serviceLogs.$inferSelect;
