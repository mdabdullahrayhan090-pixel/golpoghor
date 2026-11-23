import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, message: "TELEGRAM_BOT_TOKEN is not configured in Vercel." }, { status: 503 });
  }

  const webhookUrl = "https://golpoghor-kappa.vercel.app/api/telegram/webhook";
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const payload: Record<string, string> = { url: webhookUrl };
  if (secret) payload.secret_token = secret;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return NextResponse.json({ ok: false, message: "Telegram could not register the webhook." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: "Golpoghor Telegram webhook registered." });
  } catch {
    return NextResponse.json({ ok: false, message: "Could not reach Telegram API." }, { status: 502 });
  }
}
