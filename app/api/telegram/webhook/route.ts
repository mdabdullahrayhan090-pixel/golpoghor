import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: { id: number; type?: string };
  from?: { id: number; first_name?: string; username?: string };
};

type TelegramUpdate = { message?: TelegramMessage };

const siteUrl = "https://golpoghor-kappa.vercel.app";

function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Subscriber storage is not configured");
  return createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
}

async function telegram(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Telegram API request failed");
  return response.json();
}

async function send(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}

function isAdmin(id: number) {
  const ids = (process.env.TELEGRAM_ADMIN_IDS || "").split(",").map((v) => v.trim()).filter(Boolean);
  return ids.includes(String(id));
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat?.id;
  const userId = message.from?.id;
  const text = (message.text || "").trim();
  if (!chatId || !userId || !text) return;

  if (text === "/start") {
    try {
      const db = getAdminDb();
      const { error } = await db.from("telegram_subscribers").upsert({ chat_id: String(chatId), user_id: String(userId), username: message.from?.username || null, first_name: message.from?.first_name || null, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
      if (error) throw error;
    } catch (error) {
      console.error("Telegram subscriber registration failed:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      await send(chatId, "সাবস্ক্রিপশন চালু করা যায়নি। পরে আবার /start দাও।");
      return;
    }
    await send(chatId, "✅ গল্পঘরের নতুন গল্পের নোটিফিকেশন চালু হয়েছে!\nবন্ধ করতে /stop লিখো।\n\nওয়েবসাইট: " + siteUrl);
    return;
  }

  if (text === "/stop") {
    try {
      const db = getAdminDb();
      const { error } = await db.from("telegram_subscribers").update({ is_active: false, updated_at: new Date().toISOString() }).eq("chat_id", String(chatId));
      if (error) throw error;
      await send(chatId, "নতুন গল্পের নোটিফিকেশন বন্ধ করা হয়েছে। আবার চালু করতে /start দাও।");
    } catch {
      await send(chatId, "এখন নোটিফিকেশন বন্ধ করা যাচ্ছে না। পরে চেষ্টা করো।");
    }
    return;
  }

  if (text === "/help") {
    await send(chatId,
      "📚 গল্পঘর Telegram Bot-এ স্বাগতম!\n\n" +
      "/stories — সাম্প্রতিক প্রকাশিত গল্প\n" +
      "/support আপনার সমস্যা লিখুন — সহায়তা/অভিযোগ\n" +
      "/id — আপনার Telegram ID\n" +
      "/help — এই নির্দেশিকা\n\n" +
      "ওয়েবসাইট: " + siteUrl
    );
    return;
  }

  if (text === "/id") {
    await send(chatId, `আপনার Telegram ID: ${userId}\nAdmin সেটআপের জন্য এই ID ওয়েবসাইটের মালিককে দিন।`);
    return;
  }

  if (text === "/stories") {
    let data: Array<{ id: string; title: string; excerpt?: string | null; created_at?: string }> | null = null;
    try {
      const db = getAdminDb();
      const result = await db.from("stories")
        .select("id,title,excerpt,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(8);
      if (result.error) throw result.error;
      data = result.data;
    } catch (error) {
      console.error("Telegram stories query failed:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      await send(chatId, "এই মুহূর্তে গল্পের তালিকা আনা যাচ্ছে না। পরে আবার চেষ্টা করো।");
      return;
    }
    if (!data?.length) {
      await send(chatId, "এখনো কোনো প্রকাশিত গল্প পাওয়া যায়নি।");
      return;
    }
    const lines = data.map((story: { id: string; title: string; excerpt?: string | null }, index: number) =>
      `${index + 1}. ${story.title}\n${(story.excerpt || "").slice(0, 160)}\n${siteUrl}/stories/${encodeURIComponent(story.id)}`
    );
    await send(chatId, "📖 গল্পঘরের সাম্প্রতিক গল্প:\n\n" + lines.join("\n\n"));
    return;
  }

  if (text.startsWith("/support")) {
    const body = text.replace(/^\/support\s*/i, "").trim();
    if (body.length < 5) {
      await send(chatId, "সমস্যা/অভিযোগ পাঠাতে এভাবে লিখো:\n/support তোমার সমস্যাটি এখানে লিখো");
      return;
    }
    const adminIds = (process.env.TELEGRAM_ADMIN_IDS || "").split(",").map((v) => v.trim()).filter(Boolean);
    if (!adminIds.length) {
      await send(chatId, "সহায়তা গ্রহণের ব্যবস্থা এখনো সম্পূর্ণ সেটআপ হয়নি।");
      return;
    }
    const sender = message.from?.username ? "@" + message.from.username : (message.from?.first_name || "Telegram user");
    await Promise.all(adminIds.map((id) =>
      send(Number(id), `📩 গল্পঘর Support\nপ্রেরক: ${sender}\nTelegram ID: ${userId}\nবার্তা:\n${body.slice(0, 3000)}`)
    ));
    await send(chatId, "ধন্যবাদ! তোমার বার্তাটি গল্পঘর Admin-এর কাছে পাঠানো হয়েছে।");
    return;
  }

  if (text === "/stats") {
    if (!isAdmin(userId)) {
      await send(chatId, "এই কমান্ডটি শুধু Admin ব্যবহার করতে পারবেন।");
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      await send(chatId, "ডেটাবেস সংযোগ পাওয়া যায়নি।");
      return;
    }
    const db = createSupabaseClient(url, key, { auth: { persistSession: false } });
    const [{ count: stories }, { count: published }, { count: drafts }] = await Promise.all([
      db.from("stories").select("id", { count: "exact", head: true }),
      db.from("stories").select("id", { count: "exact", head: true }).eq("status", "published"),
      db.from("stories").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);
    await send(chatId, `📊 গল্পঘর রিপোর্ট\nমোট গল্প: ${stories ?? "—"}\nপ্রকাশিত: ${published ?? "—"}\nDraft: ${drafts ?? "—"}`);
    return;
  }

  await send(chatId, "কমান্ডটি বুঝতে পারিনি। /help লিখে কমান্ডগুলো দেখো।");
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const update = (await request.json()) as TelegramUpdate;
    if (update.message) await handleMessage(update.message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ service: "Golpoghor Telegram Bot", configured: Boolean(process.env.TELEGRAM_BOT_TOKEN) });
}
