import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
export const metadata: Metadata = { title: "গল্পঘর — গল্পের আপন ঠিকানা", description: "বাংলা গল্প পড়ুন, লিখুন ও ভাগ করে নিন।", metadataBase: new URL("https://golpoghor-kappa.vercel.app") };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="bn"><body><header className="top"><Link className="brand" href="/">গল্পঘর<span>。</span></Link><nav><Link href="/stories">গল্প পড়ুন</Link><Link href="/dashboard">লেখালেখি</Link><Link className="navbtn" href="/login">প্রবেশ / নিবন্ধন</Link></nav></header>{children}<footer>© {new Date().getFullYear()} গল্পঘর · বাংলা গল্পের আপন ঠিকানা</footer></body></html>;
}