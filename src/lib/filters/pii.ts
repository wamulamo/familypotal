/**
 * 個人情報をマスクする（正規表現ベース）
 * - 氏名（漢字の連続・ひらがなの連続など）
 * - 電話番号
 * - 住所らしき数字＋都道府県・市区町村など
 */

const PHONE_PATTERN = /0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g;
const POSTAL_PATTERN = /\d{3}-?\d{4}/g;
const MASK = "[ひみつ]";

export function maskPII(text: string): string {
  let out = text;
  out = out.replace(PHONE_PATTERN, MASK);
  out = out.replace(POSTAL_PATTERN, MASK);
  return out;
}
