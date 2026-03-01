# かぞくのAIチャット

小学校2年生の児童・保護者・AI の3者が参加する単一スレッドのファミリー共有AIチャットです。  
Next.js（App Router）と Supabase（Realtime）を使用し、Gemini 2.5 Flash（デフォルト）で応答します。入力タブで「ＡＩにきく」を選んだメッセージにだけAIが返答します。

## 機能

- **単一スレッド**: 児童・保護者・AI が同じチャットで会話
- **Realtime**: Supabase Realtime で送信即時に全員の画面に反映
- **即時応答**: 承認フローなしで AI が即返答
- **フィルタリング**: 児童発言のみ PII マスク・NGワード・セマンティックフィルタを適用
- **保護者専用設定**: システムプロンプト・NGワード・セマンティックフィルタを DB で動的変更

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. 環境変数

`.env.local` に以下を設定（`.env.example` をコピーして編集）。

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase プロジェクトの URL と anon key
- **みち・パパ・ママの固定ログイン**: `FAMILY_MICHI_EMAIL` / `FAMILY_MICHI_PASSWORD`、`FAMILY_PAPA_EMAIL` / `FAMILY_PAPA_PASSWORD`、`FAMILY_MAMA_EMAIL` / `FAMILY_MAMA_PASSWORD`（各1アカウント用。初回ログイン時にユーザーが無ければ自動作成されます）
- `GEMINI_API_KEY`: Google AI Studio で発行した API キー
- （任意）`YOUTUBE_API_KEY`: 設定で「チャンネルごと許可」を使う場合のみ。Google Cloud で YouTube Data API v3 を有効化し API キーを発行

### 3. Supabase

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQL Editor でマイグレーションを順に実行  
   - `supabase/migrations/001_initial.sql`  
   - `supabase/migrations/002_roles_michi_papa_mama.sql`（ロールをみち/パパ/ママに変更）  
   - `supabase/migrations/003_add_channel.sql`（伝言板・AIチャット分離用の channel カラム）  
   - `supabase/migrations/004_enabled_menu_ids.sql`（設定で追加メニューをオン/オフする用）  
   - `supabase/migrations/005_youtube_settings_and_watch_logs.sql`（許可YouTube動画・チャンネル・プレイリスト・視聴時間制限・記録用）  
   - （005 を実行済みの場合は）`supabase/migrations/006_allowed_youtube_playlist_ids.sql`（プレイリスト用カラムのみ）
3. Authentication → URL Configuration にリダイレクト URL を追加:  
   `https://your-domain.com/auth/callback`（ローカルは `http://localhost:3000/auth/callback`）

### 4. 起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、ログイン画面で「だれではいる？」（みち／パパ／ママ）を選び、設定した固定パスワードでログイン。  
**パパ**でログインするとチャット画面に「せってい」リンクが表示され、設定画面でシステムプロンプト・NGワード・セマンティックフィルタを編集できます。  
チャット入力はタブで「みんなへ」（通常メッセージ）と「ＡＩにきく」（AIあて）を切り替えて使います。

## 外出先・モバイルから使う（デプロイ）

保護者2名がそれぞれのスマホから、こどもがパソコン（将来はモバイルも）から同じチャットに参加するには、アプリをインターネットに公開する必要があります。

- **手順**: [DEPLOY.md](./DEPLOY.md) を参照（Vercel へのデプロイと Supabase の本番URL設定）
- デプロイ後、全員が同じURLをブラウザで開き、各自のアカウントで「こども」または「ほごしゃ」としてログインすれば、同じスレッドで会話・AI返答を共有できます。スマホではブラウザの「ホームに追加」でアプリのように使えます。

## データと学習について

Gemini API に送信したデータは、Google のポリシーに基づきモデル学習には利用されません（Abuse 監視目的の一時保持のみ）。  
コード内でもコメントで明示しています（`src/lib/llm/gemini.ts`）。

## 技術構成

- **フロント**: Next.js 14 (App Router), React, Tailwind CSS
- **DB・Realtime・Auth**: Supabase
- **LLM**: Gemini 2.5 Pro / 2.5 Flash（`@google/generative-ai`）。デフォルトは 2.5 Flash。呼び出しは `src/lib/llm/factory.ts` で抽象化済みで、他モデルへの切り替えが可能
