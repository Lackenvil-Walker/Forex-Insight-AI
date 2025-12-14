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
  const defaultPrompt = `You are an expert forex trading analyst. Analyze the provided forex chart image and provide detailed trading signals.

IMPORTANT: You must respond ONLY with a valid JSON object, no other text. Your response must be valid JSON format with the following fields:
- symbol: The forex pair (e.g., "EUR/USD", "GBP/JPY")
- timeframe: The chart timeframe (e.g., "1H", "4H", "1D")
- trend: The current trend ("bullish", "bearish", or "neutral")
- confidence: Your confidence level as a percentage (0-100)
- entry: Suggested entry price as a string
- stopLoss: Suggested stop loss price as a string
- takeProfit: Array of take profit levels as strings (e.g., ["1.0890", "1.0950"])
- reasoning: Array of strings explaining your analysis (e.g., ["Double bottom detected at support", "RSI showing bullish divergence"])

Analyze the chart carefully and provide actionable trading signals based on technical analysis. Remember: respond with JSON only.`;

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
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as ForexAnalysisResult;
    
    if (!result.symbol || !result.trend || !result.confidence) {
      throw new Error("Invalid response format from AI");
    }

    return result;
  } catch (error: any) {
    console.error("Error analyzing forex chart:", error);
    throw new Error(`Failed to analyze chart: ${error.message}`);
  }
}
