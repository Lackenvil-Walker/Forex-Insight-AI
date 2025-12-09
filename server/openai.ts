import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

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

export async function analyzeForexChart(
  imageData: string,
  systemPrompt?: string
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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o for vision capabilities
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
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as ForexAnalysisResult;
    
    // Validate the response has required fields
    if (!result.symbol || !result.trend || !result.confidence) {
      throw new Error("Invalid response format from OpenAI");
    }

    return result;
  } catch (error: any) {
    console.error("Error analyzing forex chart:", error);
    throw new Error(`Failed to analyze chart: ${error.message}`);
  }
}
