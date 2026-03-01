import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLLMProvider } from "@/lib/llm/factory";
import { runFilters, maskPII, containsNGWord } from "@/lib/filters";

const FILTERED_MESSAGE = "AIには返答が困難な質問です。保護者にお聞きください。";

const KEEP_MESSAGE_COUNT = 100;

async function trimChannel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channel: "dennnon" | "ai"
) {
  const { data: cutoffRow } = await supabase
    .from("messages")
    .select("created_at")
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .range(KEEP_MESSAGE_COUNT - 1, KEEP_MESSAGE_COUNT - 1)
    .maybeSingle();
  if (!cutoffRow?.created_at) return;
  await supabase
    .from("messages")
    .delete()
    .eq("channel", channel)
    .lt("created_at", cutoffRow.created_at);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    content: string;
    role: "michi" | "papa" | "mama";
    channel: "dennnon" | "ai";
    forAi?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { content, role, channel = "ai", forAi = false } = body;
  if (!content || typeof content !== "string" || !["michi", "papa", "mama"].includes(role)) {
    return NextResponse.json({ error: "Invalid content or role" }, { status: 400 });
  }
  if (!["dennnon", "ai"].includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profileRole = profile?.role as "michi" | "papa" | "mama" | undefined;
  if (!profileRole) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }
  if (profileRole !== role) {
    return NextResponse.json({ error: "Role mismatch" }, { status: 403 });
  }

  let { data: threads } = await supabase
    .from("threads")
    .select("id")
    .limit(1)
    .order("created_at", { ascending: true });
  let threadId = threads?.[0]?.id;
  if (!threadId) {
    const { data: inserted } = await supabase
      .from("threads")
      .insert({})
      .select("id")
      .single();
    threadId = inserted?.id;
  }
  if (!threadId) {
    return NextResponse.json({ error: "No thread" }, { status: 500 });
  }

  let contentToUse = content.trim();
  let isFiltered = false;

  if (role === "michi") {
    const { data: settingsRow } = await supabase
      .from("chat_settings")
      .select("ng_words, semantic_filter_prompt")
      .limit(1)
      .maybeSingle();
    const ngWords = (settingsRow?.ng_words as string[]) ?? [];
    const semanticFilterPrompt = settingsRow?.semantic_filter_prompt ?? "";
    if (channel === "dennnon") {
      contentToUse = maskPII(contentToUse);
      if (containsNGWord(contentToUse, ngWords)) isFiltered = true;
    } else {
      // AIチャット: forAiのときだけセマンティック判定
      if (forAi) {
        try {
          const filterResult = await runFilters(contentToUse, {
            ngWords,
            semanticFilterPrompt,
          });
          if (!filterResult.passed) {
            isFiltered = true;
            contentToUse = filterResult.maskedContent;
          } else {
            contentToUse = filterResult.maskedContent;
          }
        } catch {
          contentToUse = maskPII(contentToUse);
          if (containsNGWord(contentToUse, ngWords)) isFiltered = true;
        }
      } else {
        contentToUse = maskPII(contentToUse);
        if (containsNGWord(contentToUse, ngWords)) isFiltered = true;
      }
    }
  }

  const { data: insertedMsg, error: insertErr } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      role,
      content: contentToUse,
      channel,
    })
    .select("id, created_at")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await trimChannel(supabase, channel);

  // 伝言板のときはここで返す（AIは呼ばない）
  if (channel === "dennnon") {
    return NextResponse.json({
      messageId: insertedMsg.id,
      created_at: insertedMsg.created_at,
    });
  }

  if (isFiltered) {
    const { data: aiMsg, error: aiInsertErr } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        role: "ai",
        content: FILTERED_MESSAGE,
        channel: "ai",
      })
      .select("id, created_at")
      .single();
    if (aiInsertErr) {
      return NextResponse.json({ error: aiInsertErr.message }, { status: 500 });
    }
    return NextResponse.json({
      messageId: insertedMsg.id,
      aiMessageId: aiMsg.id,
      role: "ai",
      content: FILTERED_MESSAGE,
      created_at: aiMsg.created_at,
    });
  }

  // タブで「AIにきく」を選んだときだけAIが回答する
  if (!forAi) {
    return NextResponse.json({
      messageId: insertedMsg.id,
      created_at: insertedMsg.created_at,
    });
  }

  const { data: settings } = await supabase
    .from("chat_settings")
    .select("system_prompt, ng_words, semantic_filter_prompt")
    .limit(1)
    .maybeSingle();
  const baseSystemPrompt = settings?.system_prompt ?? "あなたはやさしいAIです。";
  const ngWords = (settings?.ng_words as string[] | undefined) ?? [];
  const semanticFilterPrompt = (settings?.semantic_filter_prompt as string | undefined) ?? "";
  const forbiddenParts: string[] = [];
  if (semanticFilterPrompt.trim()) forbiddenParts.push(semanticFilterPrompt.trim());
  if (ngWords.length) forbiddenParts.push(`以下のキーワードおよび関連する表現・言い換えには絶対に答えないでください：${ngWords.join("、")}`);
  const systemPrompt = forbiddenParts.length
    ? `${baseSystemPrompt}\n\n【重要】以下のトピックには答えないでください。該当する質問には「AIには返答が困難な質問です。保護者にお聞きください。」とだけ答えてください。\n${forbiddenParts.join("\n")}`
    : baseSystemPrompt;

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .eq("channel", "ai")
    .order("created_at", { ascending: true });
  const llmMessages = (history ?? []).map((m) => ({
    role: (m.role === "ai" ? "model" : "user") as "user" | "model",
    content: m.content,
  }));
  const lastIsUser = llmMessages[llmMessages.length - 1]?.role === "user";
  if (!lastIsUser || llmMessages.length === 0) {
    return NextResponse.json({ error: "Invalid history" }, { status: 500 });
  }

  try {
    const provider = createLLMProvider();
    const aiContent = await provider.generate({
      systemPrompt,
      messages: llmMessages,
    });

    const { data: aiMsg, error: aiInsertErr } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        role: "ai",
        content: aiContent,
        channel: "ai",
      })
      .select("id, created_at")
      .single();
    if (aiInsertErr) {
      return NextResponse.json({ error: aiInsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      messageId: insertedMsg.id,
      aiMessageId: aiMsg.id,
      role: "ai",
      content: aiContent,
      created_at: aiMsg.created_at,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "LLM error";
    const fallback = "AIには返答が困難な質問です。保護者にお聞きください。";
    const { data: aiMsg, error: aiInsertErr } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        role: "ai",
        content: fallback,
        channel: "ai",
      })
      .select("id, created_at")
      .single();
    if (aiInsertErr) {
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
    return NextResponse.json({
      messageId: insertedMsg.id,
      aiMessageId: aiMsg.id,
      role: "ai",
      content: fallback,
      created_at: aiMsg.created_at,
    });
  }
}
