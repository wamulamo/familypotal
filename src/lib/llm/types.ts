export interface LLMGenerateOptions {
  systemPrompt: string;
  messages: { role: "user" | "model"; content: string }[];
}

export interface LLMProvider {
  generate(options: LLMGenerateOptions): Promise<string>;
}

export type LLMModelId = "gemini-2.5-pro" | "gemini-2.5-flash";
