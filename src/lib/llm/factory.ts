import type { LLMProvider } from "./types";
import { createGeminiProvider } from "./gemini";

export type { LLMProvider, LLMGenerateOptions, LLMModelId } from "./types";

const DEFAULT_MODEL_ID = "gemini-2.5-flash" as const;

export function createLLMProvider(modelId?: string): LLMProvider {
  const id = (modelId ?? DEFAULT_MODEL_ID) as string;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  switch (id) {
    case "gemini-2.5-pro":
    case "gemini-2.5-flash":
      return createGeminiProvider(apiKey, id);
    default:
      return createGeminiProvider(apiKey, DEFAULT_MODEL_ID);
  }
}
