/**
 * NGワードリストとの照合
 */

export function containsNGWord(text: string, ngWords: string[]): boolean {
  if (!ngWords || ngWords.length === 0) return false;
  const lower = text.toLowerCase();
  const normalized = lower.replace(/\s/g, "");
  for (const word of ngWords) {
    const w = word.trim().toLowerCase().replace(/\s/g, "");
    if (!w) continue;
    if (normalized.includes(w) || lower.includes(word.trim().toLowerCase())) {
      return true;
    }
  }
  return false;
}
