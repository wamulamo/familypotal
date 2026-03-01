/**
 * セマンティック・フィルタリング
 * ガードレール用プロンプトで「禁止トピックに触れているか」を LLM に判定させる簡易実装。
 * ng_words も禁止トピックとして渡すことで、言い換え（例：性行為⇔セックス）もブロックする。
 */

import { createLLMProvider } from "@/lib/llm/factory";

const GUARD_SYSTEM = `あなたはガードレール用の判定だけを行います。
ユーザーのメッセージが、設定で禁止されているトピックや概念に該当するかどうかだけを判定してください。
禁止トピックには、同じ意味の言い換え・別表現（例：性行為とセックス）も含めて該当するか判定してください。
返答は必ず次のいずれか1行だけにしてください：
YES（禁止に該当する）
NO（禁止に該当しない）`;

export interface SemanticFilterResult {
  allowed: boolean;
}

function buildForbiddenTopicsText(semanticFilterPrompt: string, ngWords: string[]): string {
  const parts: string[] = [];
  if (semanticFilterPrompt.trim()) {
    parts.push(semanticFilterPrompt.trim());
  }
  if (ngWords?.length) {
    const words = ngWords.map((w) => w.trim()).filter(Boolean);
    if (words.length) {
      parts.push(`上記に加え、以下のキーワードおよびそれに関連する表現・言い換えにも該当する場合は禁止とします：${words.join("、")}`);
    }
  }
  return parts.join("\n\n");
}

export async function checkSemanticFilter(
  userMessage: string,
  semanticFilterPrompt: string,
  ngWords: string[] = []
): Promise<SemanticFilterResult> {
  const forbiddenText = buildForbiddenTopicsText(semanticFilterPrompt, ngWords);
  if (!forbiddenText) {
    return { allowed: true };
  }

  const provider = createLLMProvider();
  const prompt = `禁止トピックの定義：
${forbiddenText}

ユーザーのメッセージ：
${userMessage}`;

  const answer = await provider.generate({
    systemPrompt: GUARD_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const normalized = answer.trim().toUpperCase();
  const allowed = !normalized.startsWith("YES");
  return { allowed };
}
