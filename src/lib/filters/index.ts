import { maskPII } from "./pii";
import { containsNGWord } from "./ng-words";
import { checkSemanticFilter } from "./semantic";

export interface FilterSettings {
  ngWords: string[];
  semanticFilterPrompt: string;
}

export interface FilterResult {
  passed: boolean;
  maskedContent: string;
  reason?: string;
}

export async function runFilters(
  content: string,
  settings: FilterSettings
): Promise<FilterResult> {
  const maskedContent = maskPII(content);

  if (containsNGWord(maskedContent, settings.ngWords)) {
    return {
      passed: false,
      maskedContent,
      reason: "ng_word",
    };
  }

  const semantic = await checkSemanticFilter(
    maskedContent,
    settings.semanticFilterPrompt,
    settings.ngWords
  );
  if (!semantic.allowed) {
    return {
      passed: false,
      maskedContent,
      reason: "semantic",
    };
  }

  return { passed: true, maskedContent };
}

export { maskPII, containsNGWord, checkSemanticFilter };
