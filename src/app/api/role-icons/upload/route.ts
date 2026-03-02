import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "role-icons";
const MAX_SIZE = 512 * 1024; // 512KB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "papa") {
    return NextResponse.json({ error: "アップロードはパパのみ可能です" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const role = formData.get("role");
  const file = formData.get("file");
  if (!role || typeof role !== "string" || !["papa", "mama", "michi"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルを選択してください" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ファイルは512KB以内にしてください" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "JPEG、PNG、WebP の画像を選択してください" }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${role}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    if (error.message?.includes("Bucket not found") || error.message?.includes("does not exist")) {
      return NextResponse.json(
        { error: "ストレージバケットがありません。DEPLOY.md の「role-icons バケット」を確認してください" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl });
}
