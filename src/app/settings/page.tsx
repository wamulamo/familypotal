import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "papa") {
    redirect("/");
  }

  const { data: settings } = await supabase
    .from("chat_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="py-4 px-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <h1 className="text-2xl font-bold text-center">設定</h1>
        <p className="text-base text-center text-[var(--text-muted)] mt-1">
          保護者専用のページです
        </p>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        <SettingsForm
          initial={{
            system_prompt: settings?.system_prompt ?? "",
            ng_words: settings?.ng_words ?? [],
            semantic_filter_prompt: settings?.semantic_filter_prompt ?? "",
            enabled_menu_ids: (settings?.enabled_menu_ids as string[] | null) ?? [],
            allowed_youtube_urls: (settings as { allowed_youtube_urls?: string[] } | null)?.allowed_youtube_urls ?? [],
            allowed_youtube_channel_ids: (settings as { allowed_youtube_channel_ids?: string[] } | null)?.allowed_youtube_channel_ids ?? [],
            allowed_youtube_playlist_ids: (settings as { allowed_youtube_playlist_ids?: string[] } | null)?.allowed_youtube_playlist_ids ?? [],
            daily_watch_limit_minutes: (settings as { daily_watch_limit_minutes?: number } | null)?.daily_watch_limit_minutes ?? 30,
            role_icons: (() => {
              const raw = (settings as { role_icons?: { papa?: string; mama?: string; michi?: string } } | null)?.role_icons;
              return {
                papa: raw?.papa ?? "👨",
                mama: raw?.mama ?? "👩",
                michi: raw?.michi ?? "👧",
              };
            })(),
          }}
        />
        <p className="mt-6 text-base text-[var(--text-muted)]">
          <a href="/" className="underline text-[var(--accent)]">
            ← チャットに戻る
          </a>
        </p>
      </main>
    </div>
  );
}
