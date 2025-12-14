import { storage } from "./storage";

export type LogLevel = "info" | "warn" | "error" | "debug";
export type ServiceType = "ai" | "auth" | "payment" | "paystack" | "mobile_payment" | "system";

interface LogOptions {
  service: ServiceType;
  level: LogLevel;
  message: string;
  details?: any;
  userId?: string;
}

export async function log(options: LogOptions): Promise<void> {
  try {
    await storage.createLog({
      service: options.service,
      level: options.level,
      message: options.message,
      details: options.details || null,
      userId: options.userId || null,
    });
  } catch (error) {
    console.error("Failed to write log:", error);
  }
}

export async function logInfo(service: ServiceType, message: string, details?: any, userId?: string) {
  await log({ service, level: "info", message, details, userId });
}

export async function logWarn(service: ServiceType, message: string, details?: any, userId?: string) {
  await log({ service, level: "warn", message, details, userId });
}

export async function logError(service: ServiceType, message: string, details?: any, userId?: string) {
  await log({ service, level: "error", message, details, userId });
}

export async function logDebug(service: ServiceType, message: string, details?: any, userId?: string) {
  await log({ service, level: "debug", message, details, userId });
}
