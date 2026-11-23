import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export default async function Story({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createClient();const adminDb=createAdminClient();
 if(!adminDb)return <main className="reader"><div className="notice">গল্প পড়তে Supabase সংযোগ সেটআপ করতে হবে।</div></main>;
 const {data}=await adminDb.from("stories").select("id,title,content,category,created_at,next_part_url,profiles(display_name)").eq("id",id).eq("status","published").single();
 if(!data)notFound();
 if(db) await db.rpc("record_story_view",{p_story_id:id});
 const {data:ads}=await adminDb.from("ad_slots").select("id,title,target_url,placement").eq("enabled",true);
 const adList=ads||[];
 const adBlock=(placement:string)=><>{adList.filter(a=>a.placement===placement).map(a=><aside key={a.id} className="notice" style={{margin:"22px 0"}}><small>বিজ্ঞাপন · স্পন্সর</small><p><a href={a.target_url} target="_blank" rel="sponsored nofollow noopener">{a.title}</a></p></aside>)}</>;
 return <main className="reader">
  {adBlock("before_story")}
  <span className="tag">{data.category||"গল্প"}</span><h1>{data.title}</h1>
  <p className="muted">লেখক: {(data.profiles as any)?.display_name||"গল্পঘর লেখক"}</p>
  <div className="readerbody">{data.content}</div>
  {adBlock("in_story")}
  {adBlock("after_story")}
  {data.next_part_url&&<aside className="notice" style={{margin:"24px 0"}}><b>পরবর্তী পর্ব</b><p><a href={data.next_part_url} target="_blank" rel="noopener noreferrer">পরের অংশ পড়ুন →</a></p></aside>}
  <p className="muted">গল্পঘর · পড়ার জন্য ধন্যবাদ</p>
 </main>;
}