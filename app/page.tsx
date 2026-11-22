import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function Home(){
 const supabase=await createClient();
 let stories:any[]=[];
 if(supabase){const {data}=await supabase.from("stories").select("id,title,excerpt,category,created_at").eq("status","published").order("created_at",{ascending:false}).limit(6);stories=data||[];}
 return <><section className="hero"><small>বাংলা গল্পের আপন ঠিকানা</small><h1>গল্পের ভেতরেই<br/>খুঁজে নাও অন্য এক পৃথিবী।</h1><p>পড়ো, লেখো, আর নিজের কল্পনার গল্প ছড়িয়ে দাও সবার মাঝে। গল্পঘর তোমার সৃজনশীলতার ছোট্ট ঠিকানা।</p><div className="actions"><Link className="btn" href="/stories">গল্প পড়া শুরু করো</Link><Link className="outline" href="/dashboard">নিজের গল্প লেখো</Link></div></section><main className="wrap"><div className="sectionhead"><h2>নতুন প্রকাশিত গল্প</h2><Link className="plainlink" href="/stories">সব গল্প দেখুন →</Link></div>{stories.length?<div className="grid">{stories.map(s=><article className="storycard" key={s.id}><span className="tag">{s.category||"গল্প"}</span><h3>{s.title}</h3><p>{s.excerpt||"গল্পটি পড়তে প্রবেশ করুন।"}</p><Link className="plainlink" href={"/stories/"+s.id}>পড়ুন →</Link></article>)}</div>:<div className="empty">এখনো কোনো গল্প প্রকাশিত হয়নি। খুব শিগগিরই গল্প আসছে!</div>}</main></>;
}