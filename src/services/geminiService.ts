import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getAssetInsights(symbol: string, news: any[]) {
  try {
    const prompt = `Analyze the following news for ${symbol} and provide a concise sentiment analysis (Bullish/Bearish/Neutral) and 3 key takeaways. News: ${JSON.stringify(news.slice(0, 5))}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Could not generate insights at this time.";
  }
}
