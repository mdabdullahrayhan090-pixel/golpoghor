import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPublicIp(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return !(v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:") || v.startsWith("::ffff:"));
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b] = p;
  return !(a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127));
}
async function validateUrl(raw: string) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("শুধু নিরাপদ http/https গল্পের লিংক দেওয়া যাবে।");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("এই ঠিকানাটি গ্রহণযোগ্য নয়।");
  if (isIP(host)) {
    if (!isPublicIp(host)) throw new Error("এই ঠিকানাটি গ্রহণযোগ্য নয়।");
  } else {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some(r => !isPublicIp(r.address))) throw new Error("এই ওয়েবসাইটের ঠিকানা নিরাপদ নয়।");
  }
  return url;
}
function decode(s: string) {
  return s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function cleanText(html: string) {
  return decode(html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|article|section|h[1-6]|li|blockquote)>/gi, "\n\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t\u00a0]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function extract(html: string, url: URL) {
  const title = decode((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, "")).trim();
  const author = decode(html.match(/<meta[^>]+(?:name|property)=["'](?:author|article:author)["'][^>]+content=["']([^"']+)/i)?.[1] || "");
  const article = html.match(/<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || html;
  const content = cleanText(article);
  if (!title || content.length < 120) throw new Error("এই পেজ থেকে সম্পূর্ণ গল্প শনাক্ত করা যায়নি। অন্য লিংক বা মূল লেখার অনুমতিপ্রাপ্ত কপি ব্যবহার করো।");
  if (content.length > 50000) throw new Error("গল্পটি অনেক বড়। আপাতত ৫০,০০০ অক্ষরের মধ্যে গল্প Import করা যাবে।");
  return { title: title.slice(0, 180), author: author.slice(0, 120), content, sourceUrl: url.toString() };
}
export async function POST(req: Request) {
  try {
    const db = await createClient();
    if (!db) return NextResponse.json({ error: "Supabase সংযোগ পাওয়া যায়নি।" }, { status: 503 });
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "আগে Admin হিসেবে লগইন করো।" }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "শুধু Admin এই কাজ করতে পারবেন।" }, { status: 403 });
    const body = await req.json();
    if (body?.action !== "preview" || typeof body.url !== "string" || body.url.length > 2048) return NextResponse.json({ error: "সঠিক গল্পের লিংক দাও।" }, { status: 400 });
    let url = await validateUrl(body.url);
    let response: Response | undefined;
    for (let i = 0; i < 4; i++) {
      response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10000), headers: { "User-Agent": "GolpoghorStoryImporter/1.0 (+public-page-preview)", Accept: "text/html,application/xhtml+xml" } });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || i === 3) throw new Error("ওয়েবসাইটের Redirect অনুসরণ করা যায়নি।");
        url = await validateUrl(new URL(location, url).toString());
        continue;
      }
      break;
    }
    if (!response?.ok) throw new Error("ওয়েবসাইট থেকে গল্প আনা যায়নি (HTTP " + (response?.status || "unknown") + ")।");
    if (!(response.headers.get("content-type") || "").includes("text/html")) throw new Error("লিংকটি HTML গল্পের পেজ নয়।");
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > 1500000) throw new Error("ওয়েবপেজটি অতিরিক্ত বড়।");
    const html = await response.text();
    if (html.length > 1500000) throw new Error("ওয়েবপেজটি অতিরিক্ত বড়।");
    return NextResponse.json(extract(html, url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "গল্প Preview করা যায়নি।" }, { status: 400 });
  }
}
