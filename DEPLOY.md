# かぞくポータル ローンチ手順

保護者・こどもが外出先やスマホから同じチャットに参加するには、**アプリをインターネットに公開**します。

---

## ローンチ前チェックリスト

| # | 項目 | 確認 |
|---|------|------|
| 1 | Supabase マイグレーション 001〜007 をすべて実行済み | ☐ |
| 2 | ローカルで `npm run dev` し、みち・パパ・ママでログインできる | ☐ |
| 3 | GitHub にリポジトリを作成し、コードを push（`.env.local` は含めない） | ☐ |
| 4 | Vercel でプロジェクト作成・デプロイ | ☐ |
| 5 | Vercel に環境変数を設定し、Redeploy | ☐ |
| 6 | Supabase の Redirect URLs に本番URLの `/auth/callback` を追加 | ☐ |
| 7 | 本番URLでログイン・伝言板・AIチャットが動作することを確認 | ☐ |

---

## 0. マイグレーション適用状況の確認

「どのマイグレーションを Run したかわからない」ときは、次で確認できます。

1. [Supabase ダッシュボード](https://supabase.com/dashboard) → 対象プロジェクト
2. **SQL Editor** を開く
3. プロジェクト内の **`supabase/check_applied.sql`** の内容をすべてコピーして貼り付け、**Run** を実行
4. 結果テーブルを確認:
   - **applied が `true`** → そのマイグレーションは適用済み
   - **applied が `false`** → 未適用の可能性が高い。該当する `supabase/migrations/00X_xxx.sql` を SQL Editor で開き、内容をコピーして Run する

実行後、`false` の行に対応するマイグレーションだけ、順番に実行すればよいです。

---

## 1. Supabase の準備（まだなら）

1. [Supabase](https://supabase.com) でプロジェクト作成
2. **SQL Editor** でマイグレーションを**順に**実行:
   - `001_initial.sql`
   - `002_roles_michi_papa_mama.sql`
   - `003_add_channel.sql`
   - `004_enabled_menu_ids.sql`
   - `005_youtube_settings_and_watch_logs.sql`
   - `006_allowed_youtube_playlist_ids.sql`（005 実行済みならこれのみでも可）
   - `007_messages_delete_policy.sql`（AIチャット履歴削除に必要）
3. **Authentication** → **URL Configuration** に  
   `http://localhost:3000/auth/callback` を追加（ローカル用）

---

## 2. アプリを Vercel にデプロイ

### 2-1. リポジトリを GitHub に置く

#### まだ GitHub アカウントがない場合

1. [github.com](https://github.com) を開く
2. **Sign up** でメールアドレスを登録し、アカウントを作成（無料）
3. メール認証など、表示される手順に従う

#### GitHub にリポジトリを作る

1. ログインした状態で [github.com](https://github.com) の右上 **＋** → **New repository**
2. **Repository name** に `family-ai-chat` など好きな名前を入力
3. **Public** のままにして **Create repository** をクリック
4. 作成後、表示される「…or push an existing repository from the command line」のところに、あとで使う URL とコマンドが出ます（いったん閉じてOK）

#### パソコンから push する

- プロジェクトには **`.gitignore`** が入っており、`.env.local` や `node_modules` は自動的に push されません（秘密情報が GitHub に上がらないようにするため）
- **ターミナル（PowerShell やコマンドプロンプト）** を開き、プロジェクトのフォルダに移動してから、次を**順に**実行します（`あなたのユーザー名` は GitHub のユーザー名に置き換え）

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/あなたのユーザー名/family-ai-chat.git
git branch -M main
git push -u origin main
```

- 初回の `git push` で GitHub の **ユーザー名** と **パスワード** を聞かれた場合:
  - パスワードには **Personal Access Token（PAT）** を使います。GitHub → Settings → Developer settings → Personal access tokens で「Generate new token」し、`repo` にチェックを入れて発行したトークンを、パスワードの代わりに入力します。

#### すでにリポジトリがある場合（変更を反映するとき）

ターミナルでプロジェクトのフォルダに移動してから、次を**順に**実行します。

```bash
git add .
git commit -m "コミットメッセージ（例: メンバーアイコン設定を追加）"
git push
```

### 2-2. Vercel でプロジェクト作成

1. [vercel.com](https://vercel.com) にログイン（GitHub 連携推奨）
2. **Add New…** → **Project**
3. **family-ai-chat** リポジトリを選択 → **Deploy**

### 2-3. 環境変数を設定

Vercel のプロジェクト → **Settings** → **Environment Variables** で以下を追加（`.env.local` と同じ値でOK）。

| Name | Value | 備考 |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | 必須 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | （anon key） | 必須 |
| `GEMINI_API_KEY` | （Gemini API キー） | 必須（AI返答用） |
| `FAMILY_MICHI_EMAIL` | みち用メール | 必須 |
| `FAMILY_MICHI_PASSWORD` | みち用パスワード | 必須 |
| `FAMILY_PAPA_EMAIL` | パパ用メール | 必須 |
| `FAMILY_PAPA_PASSWORD` | パパ用パスワード | 必須 |
| `FAMILY_MAMA_EMAIL` | ママ用メール | 必須 |
| `FAMILY_MAMA_PASSWORD` | ママ用パスワード | 必須 |
| `YOUTUBE_API_KEY` | （YouTube Data API キー） | 任意・チャンネル許可を使う場合 |

**Save** 後、**Deployments** から **Redeploy** を実行して環境変数を反映させます。

### 2-4. 本番URLを控える

デプロイ後のURL（例: `https://family-ai-chat-xxxx.vercel.app`）が本番のアプリのアドレスです。

---

## 3. Supabase で本番URLを許可

1. [Supabase ダッシュボード](https://supabase.com/dashboard) → 対象プロジェクト
2. **Authentication** → **URL Configuration**
3. **Redirect URLs** に次を**追加**:
   - `https://あなたの本番URL/auth/callback`  
     例: `https://family-ai-chat-xxxx.vercel.app/auth/callback`
4. **Save**

---

## 4. 動作確認

1. 本番URLをブラウザで開く
2. 「だれではいる？」で **みち** を選び、設定したみち用パスワードでログイン
3. かぞく伝言板・AIへの質問が表示されることを確認
4. ログアウト（設定メニューから）し、**パパ**でログイン → 設定画面が開けることを確認
5. スマホでも同じURLを開き、**ママ**でログインして伝言板が共有されていることを確認

---

## 5. 使い方（家族への案内）

| 誰 | やること |
|----|----------|
| パパ・ママ | 本番URLをブラウザで開く → 各自のパスワードでログイン。スマホなら「ホームに追加」でアプリのように使える |
| みち | 同じURLを開く → みち用パスワードでログイン |

- アカウントは **みち・パパ・ママの3つ**（固定ログイン）
- 全員が **同じ1つの伝言板・同じAIチャット** を共有

---

## 6. トラブルシューティング

| 症状 | 確認すること |
|------|----------------|
| ログイン後にエラー・リダイレクトがおかしい | Supabase の **Redirect URLs** に `https://本番URL/auth/callback` が入っているか |
| メッセージが届かない | 全員が同じ本番URLを開いているか。ページを再読み込み |
| AIが返答しない | Vercel の環境変数に `GEMINI_API_KEY` が入っているか。**Redeploy** したか |
| 設定が保存できない | パパでログインしているか。Supabase のマイグレーション 004・005 を実行済みか |

---

## 7. ほかのデプロイ先（Railway / Render など）

- 手順は同じ: **本番URLを決める → 環境変数を設定 → Supabase の Redirect URLs に `https://本番URL/auth/callback` を追加**
- 独自ドメインを使う場合も、Redirect URLs に `https://あなたのドメイン/auth/callback` を追加すれば利用できます。
