import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMGenerateOptions } from "./types";

/**
 * Gemini API 経由のデータは Google のポリシーにより
 * モデル学習に利用されません（Abuse 監視目的の一時保持のみ）。
 * 明示的にドキュメントで確認: https://ai.google.dev/gemini-api/docs/usage-policies
 */
const GEMINI_NO_TRAINING_NOTE =
  "API data is not used for model training (Google Gemini API policy).";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function createGeminiProvider(apiKey: string, modelId?: string): LLMProvider {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = modelId ?? DEFAULT_GEMINI_MODEL;

  return {
    async generate(options: LLMGenerateOptions): Promise<string> {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemPrompt,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });

      const history = options.messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));
      const lastMessage = options.messages[options.messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        throw new Error("Last message must be user");
      }

      const chat = model.startChat({
        history: history.length > 0 ? history : undefined,
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      const text = response.text();
      if (!text) {
        throw new Error("Empty response from Gemini");
      }
      return text;
    },
  };
}

// 参照のみ（学習利用無効の明示用）
void GEMINI_NO_TRAINING_NOTE;
