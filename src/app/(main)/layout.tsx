import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
import { RoleProvider } from "@/contexts/RoleContext";
import { RoleIconsProvider } from "@/contexts/RoleIconsContext";

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
    <ResponsiveLayout role={role}>
      <RoleProvider role={role}>
        <RoleIconsProvider>{children}</RoleIconsProvider>
      </RoleProvider>
    </ResponsiveLayout>
  );
}
