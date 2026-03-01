import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["michi", "papa", "mama"] as const;

function getCredentials(role: string): { email: string; password: string } | null {
  switch (role) {
    case "michi":
      return process.env.FAMILY_MICHI_EMAIL && process.env.FAMILY_MICHI_PASSWORD
        ? { email: process.env.FAMILY_MICHI_EMAIL, password: process.env.FAMILY_MICHI_PASSWORD }
        : null;
    case "papa":
      return process.env.FAMILY_PAPA_EMAIL && process.env.FAMILY_PAPA_PASSWORD
        ? { email: process.env.FAMILY_PAPA_EMAIL, password: process.env.FAMILY_PAPA_PASSWORD }
        : null;
    case "mama":
      return process.env.FAMILY_MAMA_EMAIL && process.env.FAMILY_MAMA_PASSWORD
        ? { email: process.env.FAMILY_MAMA_EMAIL, password: process.env.FAMILY_MAMA_PASSWORD }
        : null;
    default:
      return null;
  }
}

export async function POST(req: Request) {
  let body: { role: string; password: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { role, password } = body;
  if (!role || !password || !ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "だれで はいりますか？ と パスワードを いれてね" }, { status: 400 });
  }

  const creds = getCredentials(role);
  if (!creds) {
    return NextResponse.json({ error: "このアカウントは まだ せってい されていません" }, { status: 500 });
  }
  if (password !== creds.password) {
    return NextResponse.json({ error: "パスワードが ちがいます" }, { status: 401 });
  }

  const supabase = await createClient();
  let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (signInError) {
    // 初回: ユーザーがなければ作成
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
    });
    if (signUpError) {
      const msg =
        signUpError.message?.includes("already been registered") ||
        signUpError.message?.includes("already exists")
          ? "このメールは もう つかわれています。Supabase の Authentication → Users で ユーザーを さくじょ してから もういちど ためしてね。"
          : signUpError.message || "ログインできませんでした";
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (!signUpData.user) {
      return NextResponse.json({ error: "ログインできませんでした" }, { status: 401 });
    }
    await supabase.from("profiles").upsert({
      id: signUpData.user.id,
      role,
      display_name: role === "michi" ? "みち" : role === "papa" ? "パパ" : "ママ",
      updated_at: new Date().toISOString(),
    });
    // 作成後はサインインし直してセッションを確実に作る（メール確認オフのとき）
    const signInAgain = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });
    if (signInAgain.error) {
      const msg = signInAgain.error.message?.includes("Email not confirmed")
        ? "メールかくにんが ひつようです。Supabase の Authentication → Providers → Email で「Confirm email」を オフに して もういちど ためしてね。"
        : signInAgain.error.message || "ログインできませんでした";
      return NextResponse.json({ error: msg }, { status: 401 });
    }
  } else if (signInData.user) {
    await supabase.from("profiles").upsert({
      id: signInData.user.id,
      role,
      display_name: role === "michi" ? "みち" : role === "papa" ? "パパ" : "ママ",
      updated_at: new Date().toISOString(),
    });
  }
  return NextResponse.json({ ok: true });
}
