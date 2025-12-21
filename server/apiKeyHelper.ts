import { storage } from './storage';

export async function getApiKey(keyName: string): Promise<string | null> {
  const envValue = process.env[keyName];
  if (envValue) {
    return envValue;
  }
  
  const dbValue = await storage.getApiKey(keyName);
  return dbValue;
}

export async function getGroqApiKey(): Promise<string | null> {
  return getApiKey('GROQ_API_KEY');
}

export async function getGeminiApiKey(): Promise<string | null> {
  return getApiKey('GEMINI_API_KEY');
}

export async function getOpenAIApiKey(): Promise<string | null> {
  return getApiKey('CUSTOM_OPENAI_API_KEY');
}

export async function getResendApiKey(): Promise<string | null> {
  return getApiKey('RESEND_API_KEY');
}

export async function getPaystackSecretKey(): Promise<string | null> {
  return getApiKey('PAYSTACK_SECRET_KEY');
}
