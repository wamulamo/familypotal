import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { RoleProvider } from "@/contexts/RoleContext";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as "michi" | "papa" | "mama") ?? "michi";

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      <Sidebar role={role} />
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
        <RoleProvider role={role}>{children}</RoleProvider>
      </main>
    </div>
  );
}
