import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const siteUrl = "https://golpoghor-kappa.vercel.app";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!accessToken) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!url || !anonKey || !serviceKey || !botToken) {
      return NextResponse.json({ error: "Telegram notification সেটআপ অসম্পূর্ণ। Vercel environment variables পরীক্ষা করো।" }, { status: 500 });
    }

    const authDb = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await authDb.auth.getUser(accessToken);
    if (authError || !user) return NextResponse.json({ error: "লগইন যাচাই করা যায়নি।" }, { status: 401 });

    const { data: profile, error: profileError } = await authDb.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin" || (user.email || "").toLowerCase() !== "baginam674@gmail.com") {
      return NextResponse.json({ error: "শুধু Admin এই কাজ করতে পারবেন।" }, { status: 403 });
    }

    const body = await request.json();
    const storyId = typeof body.storyId === "string" ? body.storyId : "";
    if (!storyId) return NextResponse.json({ error: "গল্পের ID পাওয়া যায়নি।" }, { status: 400 });

    const adminDb = createClient(url, serviceKey, { auth: { persistSession: false } });
    const [{ data: story, error: storyError }, { data: subscribers, error: subscriberError }] = await Promise.all([
      adminDb.from("stories").select("id,title,excerpt").eq("id", storyId).eq("status", "published").single(),
      adminDb.from("telegram_subscribers").select("chat_id").eq("is_active", true),
    ]);
    if (storyError || !story) return NextResponse.json({ error: "প্রকাশিত গল্পটি পাওয়া যায়নি।" }, { status: 404 });
    if (subscriberError) return NextResponse.json({ error: "সাবস্ক্রাইবার তালিকা পাওয়া যায়নি।" }, { status: 500 });
    if (!subscribers?.length) return NextResponse.json({ sent: 0, failed: 0, message: "এখনো কেউ বটের /start দিয়ে সাবস্ক্রাইব করেনি।" });

    const message = "📚 গল্পঘরে নতুন গল্প প্রকাশিত হয়েছে!\n\n" +
      "📖 " + story.title + "\n" +
      ((story.excerpt || "").slice(0, 350) ? (story.excerpt || "").slice(0, 350) + "\n" : "") +
      "\nপড়তে এখানে চাপ দাও:\n" + siteUrl + "/stories/" + encodeURIComponent(story.id);

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < subscribers.length; i += 20) {
      const batch = subscribers.slice(i, i + 20);
      const results = await Promise.all(batch.map(async (subscriber: { chat_id: string }) => {
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat_id: subscriber.chat_id, text: message, disable_web_page_preview: true }),
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error("Telegram send failed");
          return true;
        } catch {
          return false;
        }
      }));
      sent += results.filter(Boolean).length;
      failed += results.length - results.filter(Boolean).length;
    }
    return NextResponse.json({ sent, failed, message: `নতুন গল্পের নোটিফিকেশন: ${sent} জনের কাছে পাঠানো হয়েছে।${failed ? ` ${failed} জনের কাছে পাঠানো যায়নি।` : ""}` });
  } catch {
    return NextResponse.json({ error: "নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।" }, { status: 500 });
  }
}
