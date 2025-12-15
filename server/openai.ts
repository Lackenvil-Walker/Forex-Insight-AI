import OpenAI from "openai";

export interface ForexAnalysisResult {
  symbol: string;
  timeframe: string;
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  entry: string;
  stopLoss: string;
  takeProfit: string[];
  reasoning: string[];
}

export interface AIConfig {
  provider: string;
  modelId: string;
  endpointUrl?: string | null;
  useCustomApi?: string;
}

function getAIClient(config: AIConfig): OpenAI {
  const provider = config.provider || "groq";
  
  switch (provider) {
    case "openai": {
      const openaiApiKey = process.env.CUSTOM_OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not configured. Please set CUSTOM_OPENAI_API_KEY in your environment secrets.");
      }
      return new OpenAI({
        apiKey: openaiApiKey,
        baseURL: "https://api.openai.com/v1",
      });
    }
    
    case "groq":
    default: {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        throw new Error("Groq API key not configured. Please set GROQ_API_KEY in your environment secrets.");
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
  const defaultPrompt = `You are an expert forex trading analyst with years of experience. Analyze the provided forex chart image and provide detailed, actionable trading signals.

CRITICAL INSTRUCTIONS:
1. Look at the price axis on the chart to read EXACT price values
2. Identify key support and resistance levels from the chart
3. Calculate entry, stop loss, and take profit based on visible price levels
4. You MUST provide specific price values - never leave entry, stopLoss, or takeProfit empty

REQUIRED JSON RESPONSE FORMAT (respond with JSON only, no other text):
{
  "symbol": "The forex pair visible on chart (e.g., EUR/USD, GBP/JPY)",
  "timeframe": "Chart timeframe (e.g., 1H, 4H, 1D, M15)",
  "trend": "bullish" or "bearish" or "neutral",
  "confidence": 0-100 (your confidence percentage),
  "entry": "Specific entry price from chart (e.g., 1.2650)",
  "stopLoss": "Stop loss price below/above recent swing (e.g., 1.2600)",
  "takeProfit": ["TP1 price", "TP2 price"] (e.g., ["1.2700", "1.2750"]),
  "reasoning": ["Technical reason 1", "Technical reason 2", "Technical reason 3"]
}

ANALYSIS GUIDELINES:
- For BULLISH trades: entry near support, stop loss below support, take profit at resistance
- For BEARISH trades: entry near resistance, stop loss above resistance, take profit at support
- Read the actual price values from the Y-axis of the chart
- Identify candlestick patterns, trend lines, and key levels
- Base your confidence on the strength of the setup

Remember: You MUST provide specific numeric prices for entry, stopLoss, and takeProfit fields.`;

  let prompt = systemPrompt || defaultPrompt;
  
  // Groq/OpenAI require "json" in the message when using response_format: json_object
  if (!prompt.toLowerCase().includes('json')) {
    prompt += '\n\nIMPORTANT: You must respond with valid JSON format only.';
  }
  
  const aiConfig: AIConfig = config || {
    provider: "groq",
    modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
  };
  
  const client = getAIClient(aiConfig);
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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI Raw Response:", content);
    
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      throw new Error("AI returned invalid JSON response");
    }
    
    // Handle case where response might be nested (e.g., { analysis: {...} } or { data: {...} })
    let result: any = parsed;
    if (parsed.analysis && typeof parsed.analysis === 'object') {
      result = parsed.analysis;
    } else if (parsed.data && typeof parsed.data === 'object') {
      result = parsed.data;
    } else if (parsed.result && typeof parsed.result === 'object') {
      result = parsed.result;
    }
    
    // Validate and provide defaults for missing fields
    const finalResult: ForexAnalysisResult = {
      symbol: result.symbol || result.pair || result.currency_pair || "Unknown",
      timeframe: result.timeframe || result.time_frame || result.interval || "Unknown",
      trend: ["bullish", "bearish", "neutral"].includes(result.trend?.toLowerCase()) 
        ? result.trend.toLowerCase() as "bullish" | "bearish" | "neutral"
        : "neutral",
      confidence: typeof result.confidence === 'number' 
        ? result.confidence 
        : (parseInt(result.confidence) || 50),
      entry: result.entry || result.entry_price || result.entryPrice || "N/A",
      stopLoss: result.stopLoss || result.stop_loss || result.stoploss || "N/A",
      takeProfit: Array.isArray(result.takeProfit) 
        ? result.takeProfit 
        : (Array.isArray(result.take_profit) 
          ? result.take_profit 
          : (result.takeProfit || result.take_profit ? [String(result.takeProfit || result.take_profit)] : [])),
      reasoning: Array.isArray(result.reasoning) 
        ? result.reasoning 
        : (Array.isArray(result.reasons) 
          ? result.reasons 
          : (result.reasoning || result.analysis_notes ? [String(result.reasoning || result.analysis_notes)] : ["Analysis completed"]))
    };
    
    console.log("Processed Result:", JSON.stringify(finalResult));
    
    // Only throw if we truly have no useful data
    if (finalResult.symbol === "Unknown" && finalResult.trend === "neutral" && finalResult.entry === "N/A") {
      console.error("AI response missing critical fields:", parsed);
      throw new Error("AI could not analyze the chart properly. Please try a clearer chart image.");
    }

    return finalResult;
  } catch (error: any) {
    console.error("Error analyzing forex chart:", error);
    throw new Error(`Failed to analyze chart: ${error.message}`);
  }
}
