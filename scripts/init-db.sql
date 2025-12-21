-- Forex Edge Database Initialization Script
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sessions table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    verification_token VARCHAR,
    verification_token_expires TIMESTAMP,
    role TEXT NOT NULL DEFAULT 'user',
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analyses table (chart analysis results)
CREATE TABLE IF NOT EXISTS analyses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    image_url TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    provider TEXT NOT NULL DEFAULT 'groq',
    model_id TEXT NOT NULL DEFAULT 'meta-llama/llama-4-scout-17b-16e-instruct',
    endpoint_url TEXT,
    system_prompt TEXT NOT NULL,
    use_custom_api TEXT NOT NULL DEFAULT 'false',
    free_limit INTEGER NOT NULL DEFAULT 1,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false
);

-- AI Providers
CREATE TABLE IF NOT EXISTS ai_providers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR NOT NULL,
    api_key_env_var VARCHAR NOT NULL,
    base_url TEXT NOT NULL,
    models TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    analysis_count INTEGER NOT NULL DEFAULT 0
);

-- Credit packages
CREATE TABLE IF NOT EXISTS credit_packages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR NOT NULL,
    credits INTEGER NOT NULL,
    price_zar INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    package_id VARCHAR REFERENCES credit_packages(id),
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    paystack_reference VARCHAR UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mobile payments
CREATE TABLE IF NOT EXISTS mobile_payments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    package_id VARCHAR REFERENCES credit_packages(id),
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    phone_number VARCHAR NOT NULL,
    screenshot_url TEXT,
    status VARCHAR NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Service logs
CREATE TABLE IF NOT EXISTS service_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    service VARCHAR NOT NULL,
    level VARCHAR NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB,
    user_id VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default system configuration
INSERT INTO system_config (id, provider, model_id, system_prompt, free_limit)
VALUES (
    'default',
    'groq',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'You are an expert forex trading analyst with years of experience. Analyze the provided forex chart image and provide detailed, actionable trading signals with comprehensive technical analysis.

CRITICAL INSTRUCTIONS:
1. Look at the price axis on the chart to read EXACT price values
2. Identify key support and resistance levels from the chart
3. Calculate entry, stop loss, and take profit based on visible price levels
4. Analyze trend direction, momentum, RSI conditions, and volume if visible
5. You MUST provide specific price values - never leave any field empty

REQUIRED JSON RESPONSE FORMAT (respond with JSON only, no other text):
{
  "symbol": "The forex pair visible on chart (e.g., EUR/USD, GBP/JPY)",
  "timeframe": "Chart timeframe (e.g., 1H, 4H, 1D, M15)",
  "trend": "bullish" or "bearish" or "neutral",
  "confidence": 0-100 (your confidence percentage),
  "entry": "Specific entry price from chart (e.g., 1.2650)",
  "stopLoss": "Stop loss price below/above recent swing (e.g., 1.2600)",
  "takeProfit": ["TP1 price", "TP2 price"] (e.g., ["1.2700", "1.2750"]),
  "support": "Key support level price (e.g., 1.2580)",
  "resistance": "Key resistance level price (e.g., 1.2720)",
  "momentum": "Momentum assessment (e.g., Strong Bullish, Weak Bearish, Neutral, Increasing, Decreasing)",
  "rsi": "RSI reading or estimate (e.g., 65 - Neutral, 75 - Overbought, 30 - Oversold)",
  "volume": "Volume analysis (e.g., High, Low, Increasing, Decreasing, Above Average)",
  "reasoning": ["Technical reason 1", "Technical reason 2", "Technical reason 3"]
}

ANALYSIS GUIDELINES:
- For BULLISH trades: entry near support, stop loss below support, take profit at resistance
- For BEARISH trades: entry near resistance, stop loss above resistance, take profit at support
- Read the actual price values from the Y-axis of the chart
- Identify candlestick patterns, trend lines, and key levels
- Estimate RSI based on price action if not shown (overbought >70, oversold <30)
- Assess momentum from candle size, trend strength, and price velocity
- Evaluate volume if visible, otherwise estimate based on candle body size

Remember: You MUST provide values for ALL fields including support, resistance, momentum, rsi, and volume.',
    1
) ON CONFLICT (id) DO NOTHING;

-- Insert default AI providers
INSERT INTO ai_providers (name, api_key_env_var, base_url, models, is_active)
VALUES 
    ('Groq', 'GROQ_API_KEY', 'https://api.groq.com/openai/v1', ARRAY['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], true),
    ('OpenAI', 'CUSTOM_OPENAI_API_KEY', 'https://api.openai.com/v1', ARRAY['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], true),
    ('Gemini', 'GEMINI_API_KEY', 'https://generativelanguage.googleapis.com/v1beta/openai', ARRAY['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'], true)
ON CONFLICT DO NOTHING;

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price_zar, description, is_active)
VALUES
    ('Starter Pack', 10, 4900, '10 chart analyses', true),
    ('Pro Pack', 50, 19900, '50 chart analyses - Best value', true),
    ('Enterprise Pack', 200, 59900, '200 chart analyses', true)
ON CONFLICT DO NOTHING;
