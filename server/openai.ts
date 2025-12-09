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
  useCustomApi: string;
}

function getOpenAIClient(config: AIConfig): OpenAI {
  const useCustom = config.useCustomApi === "true";
  
  if (useCustom) {
    const customApiKey = process.env.CUSTOM_OPENAI_API_KEY;
    if (!customApiKey) {
      throw new Error("Custom API key not configured. Please set CUSTOM_OPENAI_API_KEY in your environment variables.");
    }
    
    return new OpenAI({
      apiKey: customApiKey,
      baseURL: config.endpointUrl || "https://api.openai.com/v1",
    });
  }
  
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

export async function analyzeForexChart(
  imageData: string,
  systemPrompt?: string,
  config?: AIConfig
): Promise<ForexAnalysisResult> {
  const defaultPrompt = `You are an expert forex trading analyst. Analyze the provided forex chart image and provide detailed trading signals.

You must respond with a valid JSON object containing the following fields:
- symbol: The forex pair (e.g., "EUR/USD", "GBP/JPY")
- timeframe: The chart timeframe (e.g., "1H", "4H", "1D")
- trend: The current trend ("bullish", "bearish", or "neutral")
- confidence: Your confidence level as a percentage (0-100)
- entry: Suggested entry price as a string
- stopLoss: Suggested stop loss price as a string
- takeProfit: Array of take profit levels as strings (e.g., ["1.0890", "1.0950"])
- reasoning: Array of strings explaining your analysis (e.g., ["Double bottom detected at support", "RSI showing bullish divergence"])

Analyze the chart carefully and provide actionable trading signals based on technical analysis.`;

  const prompt = systemPrompt || defaultPrompt;
  
  const aiConfig: AIConfig = config || {
    provider: "openai",
    modelId: "gpt-4o",
    useCustomApi: "false",
  };
  
  const openai = getOpenAIClient(aiConfig);
  const model = aiConfig.modelId || "gpt-4o";

  try {
    const response = await openai.chat.completions.create({
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
      max_completion_tokens: 8192,
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
