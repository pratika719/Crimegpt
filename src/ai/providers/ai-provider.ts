export type AIProviderName = "groq" | "gemini";

export type GenerateTextInput = {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type GenerateJSONInput = GenerateTextInput & {
  schemaName?: string;
  schemaDescription?: string;
};

export type AIUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type AIProviderResult<T> = {
  data: T;
  provider: AIProviderName;
  model: string;
  latencyMs: number;
  usage?: AIUsage;
  fallbackUsed: boolean;
};

export interface AITextProvider {
  readonly name: AIProviderName;
  readonly model: string;

  generateText(input: GenerateTextInput): Promise<AIProviderResult<string>>;
  generateJSON<T>(input: GenerateJSONInput): Promise<AIProviderResult<T>>;
}

export const JSON_ONLY_INSTRUCTIONS = `Return valid JSON only.
Do not include markdown.
Do not include explanations.
Do not use code fences.
Use double quotes for keys and string values.
Do not include trailing commas.
The response must parse successfully with JSON.parse.`;
