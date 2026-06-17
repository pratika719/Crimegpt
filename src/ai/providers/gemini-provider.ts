import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Singleton provider for interacting with Gemini API.
 * Contains no business logic, only model communication, error handling, and retries.
 */
export class GeminiProvider {
  private static instance: GeminiProvider | null = null;
  private genAI: GoogleGenerativeAI;
  private modelName = "gemini-2.5-flash";

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Returns the singleton instance of GeminiProvider.
   */
  public static getInstance(): GeminiProvider {
    if (!GeminiProvider.instance) {
      GeminiProvider.instance = new GeminiProvider();
    }
    return GeminiProvider.instance;
  }

  /**
   * Generates JSON output from the Gemini 2.5 Flash model.
   * Includes simple retry logic for network resilience.
   * 
   * @param prompt System and user prompt text.
   * @returns Stringified JSON response.
   */
  async generateJSON(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`⚠️ Warning: Gemini API attempt ${attempt}/${maxRetries} failed:`, err.message || err);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      }
    }

    throw new Error(`❌ Gemini API call failed after ${maxRetries} retries. Reason: ${lastError?.message || lastError}`);
  }

  /**
   * Gets the active model name.
   */
  public getModelName(): string {
    return this.modelName;
  }
}

export const geminiProvider = GeminiProvider.getInstance();
export default geminiProvider;
