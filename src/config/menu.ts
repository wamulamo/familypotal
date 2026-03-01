/**
 * サイドメニュー用の定義。
 * 固定項目（伝言板・AI）は Sidebar で扱い、ここでは「追加でオン/オフできる項目」のみ。
 *
 * 新機能を追加する手順:
 * 1. OptionalMenuItemId に id を追加（例: "quiz"）
 * 2. OPTIONAL_MENU_ITEMS に { id, label, path } を追加
 * 3. src/app/(main)/{path}/page.tsx を新規作成（例: /quiz → (main)/quiz/page.tsx）
 * 4. 設定画面でパパがオンにするとサイドメニューに表示される
 */

export type OptionalMenuItemId = "game" | "youtube";

export interface OptionalMenuItem {
  id: OptionalMenuItemId;
  label: string;
  path: string;
}

/** 設定で追加・削除できるメニュー候補（パパがオン/オフ可能） */
export const OPTIONAL_MENU_ITEMS: OptionalMenuItem[] = [
  { id: "game", label: "計算ゲーム", path: "/game" },
  { id: "youtube", label: "Youtube", path: "/youtube" },
];

export function getOptionalItemsByIds(ids: string[]): OptionalMenuItem[] {
  const set = new Set(ids);
  return OPTIONAL_MENU_ITEMS.filter((item) => set.has(item.id));
}
