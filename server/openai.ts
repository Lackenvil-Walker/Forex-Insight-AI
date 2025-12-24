import OpenAI from "openai";
import { getGroqApiKey, getGeminiApiKey, getOpenAIApiKey } from "./apiKeyHelper";

export interface ForexAnalysisResult {
  symbol: string;
  timeframe: string;
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  entry: string;
  stopLoss: string;
  takeProfit: string[];
  support: string;
  resistance: string;
  momentum: string;
  rsi: string;
  volume: string;
  reasoning: string[];
}

export interface AIConfig {
  provider: string;
  modelId: string;
  endpointUrl?: string | null;
  useCustomApi?: string;
}

async function getAIClient(config: AIConfig): Promise<OpenAI> {
  const provider = config.provider || "groq";
  
  switch (provider) {
    case "openai": {
      const openaiApiKey = await getOpenAIApiKey();
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not configured. Please set it in Admin > Settings > API Keys.");
      }
      return new OpenAI({
        apiKey: openaiApiKey,
        baseURL: "https://api.openai.com/v1",
      });
    }
    
    case "gemini": {
      const geminiApiKey = await getGeminiApiKey();
      if (!geminiApiKey) {
        throw new Error("Gemini API key not configured. Please set it in Admin > Settings > API Keys.");
      }
      return new OpenAI({
        apiKey: geminiApiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
    }
    
    case "groq":
    default: {
      const groqApiKey = await getGroqApiKey();
      if (!groqApiKey) {
        throw new Error("Groq API key not configured. Please set it in Admin > Settings > API Keys.");
      }
      return new OpenAI({
        apiKey: groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
    }
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai":
      return "gpt-4o";
    case "gemini":
      return "gemini-2.0-flash";
    case "groq":
    default:
      return "meta-llama/llama-4-scout-17b-16e-instruct";
  }
}

export async function analyzeForexChart(
  imageData: string,
  systemPrompt?: string,
  config?: AIConfig
): Promise<ForexAnalysisResult> {
  const defaultPrompt = `You are an expert forex trading analyst with years of experience. Analyze the provided forex chart image and provide detailed, actionable trading signals with comprehensive technical analysis.

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

Remember: You MUST provide values for ALL fields including support, resistance, momentum, rsi, and volume.`;

  let prompt = systemPrompt || defaultPrompt;
  
  // Groq/OpenAI require "json" in the message when using response_format: json_object
  if (!prompt.toLowerCase().includes('json')) {
    prompt += '\n\nIMPORTANT: You must respond with valid JSON format only.';
  }
  
  const aiConfig: AIConfig = config || {
    provider: "groq",
    modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
  };
  
  const client = await getAIClient(aiConfig);
  const model = aiConfig.modelId || getDefaultModel(aiConfig.provider);

  try {
    // Build the message content based on provider
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt
      },
      {
        type: "image_url",
        image_url: {
          url: imageData,
          detail: "high"
        }
      }
    ];

    console.log("Sending request to AI provider:", aiConfig.provider, "model:", model);
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a forex chart analysis expert. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: messageContent
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8192,
    });

    console.log("AI Response received:", JSON.stringify({
      id: response.id,
      model: response.model,
      choices_length: response.choices?.length,
      finish_reason: response.choices?.[0]?.finish_reason,
      message_role: response.choices?.[0]?.message?.role,
      content_length: response.choices?.[0]?.message?.content?.length,
      usage: response.usage
    }, null, 2));

    const message = response.choices[0]?.message;
    const content = message?.content;
    
    // Check for refusal (OpenAI content moderation)
    if (message?.refusal) {
      console.error("AI refused to analyze:", message.refusal);
      throw new Error(`AI provider refused the request: ${message.refusal}. Try using a different AI provider (Groq or Gemini) in Admin Settings.`);
    }
    
    if (!content) {
      console.error("Empty AI response. Full response object:", JSON.stringify(response, null, 2));
      throw new Error("No response from AI. Try using a different provider (Groq or Gemini) in Admin Settings.");
    }

    console.log("=== AI RAW RESPONSE START ===");
    console.log(content);
    console.log("=== AI RAW RESPONSE END ===");
    
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      throw new Error("AI returned invalid JSON response");
    }
    
    console.log("Parsed JSON keys:", Object.keys(parsed));
    
    // Handle case where response might be nested (e.g., { analysis: {...} } or { data: {...} })
    let result: any = parsed;
    if (parsed.analysis && typeof parsed.analysis === 'object') {
      result = parsed.analysis;
      console.log("Found nested 'analysis' object");
    } else if (parsed.data && typeof parsed.data === 'object') {
      result = parsed.data;
      console.log("Found nested 'data' object");
    } else if (parsed.result && typeof parsed.result === 'object') {
      result = parsed.result;
      console.log("Found nested 'result' object");
    } else if (parsed.signal && typeof parsed.signal === 'object') {
      result = parsed.signal;
      console.log("Found nested 'signal' object");
    } else if (parsed.trading_signal && typeof parsed.trading_signal === 'object') {
      result = parsed.trading_signal;
      console.log("Found nested 'trading_signal' object");
    }
    
    console.log("Result object keys:", Object.keys(result));
    console.log("Result values:", JSON.stringify(result, null, 2));
    
    // Helper to find value from multiple possible keys
    const findValue = (obj: any, ...keys: string[]): any => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return obj[key];
        }
        // Also check camelCase and snake_case variations
        const camelCase = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (obj[camelCase] !== undefined && obj[camelCase] !== null && obj[camelCase] !== '') {
          return obj[camelCase];
        }
        if (obj[snakeCase] !== undefined && obj[snakeCase] !== null && obj[snakeCase] !== '') {
          return obj[snakeCase];
        }
      }
      return undefined;
    };
    
    // Validate and provide defaults for missing fields
    const rawSymbol = findValue(result, 'symbol', 'pair', 'currency_pair', 'instrument', 'ticker', 'asset');
    const rawTimeframe = findValue(result, 'timeframe', 'time_frame', 'interval', 'period', 'tf');
    const rawTrend = findValue(result, 'trend', 'direction', 'bias', 'signal_type', 'market_direction');
    const rawConfidence = findValue(result, 'confidence', 'confidence_level', 'probability', 'score');
    const rawEntry = findValue(result, 'entry', 'entry_price', 'entryPrice', 'entry_point', 'suggested_entry', 'buy_price', 'sell_price');
    const rawStopLoss = findValue(result, 'stopLoss', 'stop_loss', 'stoploss', 'sl', 'stop');
    const rawTakeProfit = findValue(result, 'takeProfit', 'take_profit', 'takeprofit', 'tp', 'targets', 'target', 'take_profit_levels');
    const rawSupport = findValue(result, 'support', 'support_level', 'supportLevel', 'key_support');
    const rawResistance = findValue(result, 'resistance', 'resistance_level', 'resistanceLevel', 'key_resistance');
    const rawMomentum = findValue(result, 'momentum', 'momentum_status', 'price_momentum');
    const rawRsi = findValue(result, 'rsi', 'RSI', 'rsi_value', 'rsi_reading');
    const rawVolume = findValue(result, 'volume', 'volume_analysis', 'volume_status');
    const rawReasoning = findValue(result, 'reasoning', 'reasons', 'analysis', 'analysis_notes', 'explanation', 'rationale', 'notes');
    
    console.log("Extracted raw values:", { rawSymbol, rawTimeframe, rawTrend, rawConfidence, rawEntry, rawStopLoss, rawTakeProfit, rawSupport, rawResistance, rawMomentum, rawRsi, rawVolume, rawReasoning });
    
    // Process trend value
    let trendValue: "bullish" | "bearish" | "neutral" = "neutral";
    if (rawTrend) {
      const trendLower = String(rawTrend).toLowerCase();
      if (trendLower.includes('bull') || trendLower.includes('up') || trendLower.includes('long') || trendLower.includes('buy')) {
        trendValue = "bullish";
      } else if (trendLower.includes('bear') || trendLower.includes('down') || trendLower.includes('short') || trendLower.includes('sell')) {
        trendValue = "bearish";
      }
    }
    
    // Process take profit array
    let takeProfitArray: string[] = [];
    if (Array.isArray(rawTakeProfit)) {
      takeProfitArray = rawTakeProfit.map(tp => String(tp));
    } else if (rawTakeProfit) {
      takeProfitArray = [String(rawTakeProfit)];
    }
    
    // Process reasoning array
    let reasoningArray: string[] = [];
    if (Array.isArray(rawReasoning)) {
      reasoningArray = rawReasoning.map(r => String(r));
    } else if (rawReasoning) {
      reasoningArray = [String(rawReasoning)];
    } else {
      reasoningArray = ["Technical analysis completed based on chart patterns"];
    }
    
    const finalResult: ForexAnalysisResult = {
      symbol: rawSymbol ? String(rawSymbol) : "Unknown",
      timeframe: rawTimeframe ? String(rawTimeframe) : "Unknown",
      trend: trendValue,
      confidence: typeof rawConfidence === 'number' ? rawConfidence : (parseInt(String(rawConfidence)) || 50),
      entry: rawEntry ? String(rawEntry) : "N/A",
      stopLoss: rawStopLoss ? String(rawStopLoss) : "N/A",
      takeProfit: takeProfitArray,
      support: rawSupport ? String(rawSupport) : "N/A",
      resistance: rawResistance ? String(rawResistance) : "N/A",
      momentum: rawMomentum ? String(rawMomentum) : "N/A",
      rsi: rawRsi ? String(rawRsi) : "N/A",
      volume: rawVolume ? String(rawVolume) : "N/A",
      reasoning: reasoningArray
    };
    
    console.log("=== FINAL PROCESSED RESULT ===");
    console.log(JSON.stringify(finalResult, null, 2));
    console.log("=== END FINAL RESULT ===");
    
    // Only throw if we truly have no useful data
    if (finalResult.symbol === "Unknown" && finalResult.trend === "neutral" && finalResult.entry === "N/A") {
      console.error("AI response missing critical fields:", parsed);
      throw new Error("AI could not analyze the chart properly. Please try a clearer chart image.");
    }

    return finalResult;
  } catch (error: any) {
    console.error("Error analyzing forex chart:", error);
    
    // Return a fallback result instead of throwing - analysis should never fail completely
    const fallbackResult: ForexAnalysisResult = {
      symbol: "Unable to detect",
      timeframe: "Unable to detect",
      trend: "neutral",
      confidence: 0,
      entry: "Analysis failed",
      stopLoss: "Analysis failed",
      takeProfit: ["Analysis failed"],
      support: "Analysis failed",
      resistance: "Analysis failed",
      momentum: "Unable to analyze",
      rsi: "Unable to analyze",
      volume: "Unable to analyze",
      reasoning: [
        `Analysis error: ${error.message}`,
        "Please try uploading a clearer chart image",
        "Or check AI provider settings in Admin panel"
      ]
    };
    
    return fallbackResult;
  }
}
