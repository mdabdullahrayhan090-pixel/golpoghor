"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Story={id:string;title:string;excerpt:string|null;status:string;created_at:string;author_id:string;profiles?:{display_name:string|null}[]|null};
type Profile={id:string;display_name:string|null;role:string;created_at:string};
type AdSlot={id:string;placement:string;title:string;target_url:string;enabled:boolean};
export default function AdminPage(){
 const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false);
 const [stories,setStories]=useState<Story[]>([]),[users,setUsers]=useState<Profile[]>([]),[views,setViews]=useState<{story_id:string}[]>([]);
 const [ads,setAds]=useState<AdSlot[]>([]),[rate,setRate]=useState("0"),[newUrl,setNewUrl]=useState(""),[newTitle,setNewTitle]=useState("স্পন্সর"),[placement,setPlacement]=useState("before_story");
 const [msg,setMsg]=useState("লোড হচ্ছে…"),[busy,setBusy]=useState(""),[storySearch,setStorySearch]=useState("");
 const db=createClient();
 async function load(){
  const {data:{user}}=await db.auth.getUser();
  if(!user){setMsg("Admin Panel দেখতে আগে লগইন করো।");setReady(true);return;}
  const {data:me}=await db.from("profiles").select("role").eq("id",user.id).single();
  if(me?.role!=="admin"){setMsg("এই পেজটি শুধু Admin-এর জন্য।");setReady(true);return;}
  setAllowed(true);
  const [s,u,v,settings,a]=await Promise.all([
   db.from("stories").select("id,title,excerpt,status,created_at,author_id,profiles(display_name)").order("created_at",{ascending:false}),
   db.from("profiles").select("id,display_name,role,created_at").order("created_at",{ascending:false}),
   db.from("story_views").select("story_id"),
   db.from("platform_settings").select("rate_bdt_per_1000_views").eq("id",1).single(),
   db.from("ad_slots").select("id,placement,title,target_url,enabled").order("created_at",{ascending:true})
  ]);
  const error=s.error||u.error||v.error||settings.error||a.error;
  if(error)setMsg(error.message);
  else {setStories((s.data||[]) as Story[]);setUsers((u.data||[]) as Profile[]);setViews((v.data||[]) as {story_id:string}[]);setRate(String(settings.data?.rate_bdt_per_1000_views??0));setAds((a.data||[]) as AdSlot[]);setMsg("");}
  setReady(true);
 }
 useEffect(()=>{load();},[]);
 const countViews=(id:string)=>views.filter(v=>v.story_id===id).length;
 const rateNum=Number(rate)||0;
 const totalViews=views.length;
 const totalEstimate=stories.reduce((sum,s)=>sum+countViews(s.id)*rateNum/1000,0);
 async function publish(id:string,yes:boolean){setBusy(id);setMsg("");const {error}=await db.rpc("admin_publish_story",{story_id:id,publish:yes});if(error)setMsg(error.message);else await load();setBusy("");}
 async function changeRole(id:string,role:string){setBusy(id);const {error}=await db.from("profiles").update({role}).eq("id",id);if(error)setMsg(error.message);else await load();setBusy("");}
 async function saveRate(){setBusy("rate");const {error}=await db.from("platform_settings").update({rate_bdt_per_1000_views:rateNum,updated_at:new Date().toISOString()}).eq("id",1);setMsg(error?error.message:"প্রতি ১,০০০ যাচাইকৃত ভিউয়ের হার সংরক্ষিত হয়েছে।");setBusy("");}
 async function addAd(e:React.FormEvent){e.preventDefault();setBusy("ad");const {error}=await db.from("ad_slots").insert({placement,title:newTitle,target_url:newUrl,enabled:false});setMsg(error?error.message:"বিজ্ঞাপন লিংক যোগ হয়েছে। চালু করতে নিচের সুইচ অন করো।");if(!error){setNewUrl("");await load();}setBusy("");}
 async function toggleAd(ad:AdSlot){setBusy(ad.id);const {error}=await db.from("ad_slots").update({enabled:!ad.enabled}).eq("id",ad.id);if(error)setMsg(error.message);else await load();setBusy("");}
 async function deleteAd(id:string){setBusy(id);const {error}=await db.from("ad_slots").delete().eq("id",id);if(error)setMsg(error.message);else await load();setBusy("");}
 if(!ready)return <main className="wrap"><p>{msg}</p></main>;
 if(!allowed)return <main className="formbox"><h1>Admin Panel</h1><p>{msg}</p><a className="btn" href="/login">লগইন</a></main>;
 return <main className="wrap">
  <div className="sectionhead"><h1>গল্পঘর · Admin Panel</h1><a className="outline" href="/dashboard">লেখক ড্যাশবোর্ড</a></div>
  {msg&&<p className="notice">{msg}</p>}
  <div className="grid">
   <article className="storycard"><span className="muted">মোট গল্প</span><h2>{stories.length}</h2></article>
   <article className="storycard"><span className="muted">প্রকাশিত গল্প</span><h2>{stories.filter(s=>s.status==="published").length}</h2></article>
   <article className="storycard"><span className="muted">যাচাইকৃত ভিউ</span><h2>{totalViews}</h2></article>
   <article className="storycard"><span className="muted">আনুমানিক লেখক আয়</span><h2>৳{totalEstimate.toFixed(2)}</h2></article>
  </div>
  <h2 style={{marginTop:38}}>গল্প ও ভিউ ব্যবস্থাপনা</h2>
  <div className="field" style={{marginTop:14}}><label>গল্প খুঁজুন — নাম, লেখক বা Story ID</label><input value={storySearch} onChange={e=>setStorySearch(e.target.value)} placeholder="গল্পের নাম / লেখকের নাম / #StoryID"/></div>
  {stories.length===0?<p className="muted">এখনো কোনো গল্প জমা হয়নি।</p>:<div className="grid">{stories.map((s,index)=>({s,index})).filter(({s})=>[s.title,s.profiles?.[0]?.display_name||"",s.id].some(v=>v.toLowerCase().includes(storySearch.trim().toLowerCase()))).map(({s,index})=><article className="storycard" key={s.id}><span className="tag">{s.status==="published"?"প্রকাশিত":"খসড়া"}</span><p className="muted">#{String(index+1).padStart(4,"0")} · Story ID: {s.id.slice(0,8)}</p><h3>{s.title}</h3><p>{s.excerpt}</p><p className="muted">লেখক: {s.profiles?.[0]?.display_name||"লেখক"} · ভিউ: {countViews(s.id)} · আনুমানিক আয়: ৳{(countViews(s.id)*rateNum/1000).toFixed(2)}</p><div className="actions">{s.status==="published"?<a className="outline" href={"/stories/"+s.id} target="_blank" rel="noreferrer">গল্পের আলাদা লিংক ↗</a>:<span className="muted">প্রকাশের পর আলাদা লিংক চালু হবে</span>}<button className="btn" disabled={busy===s.id} onClick={()=>publish(s.id,s.status!=="published")}>{s.status==="published"?"আনপাবলিশ":"প্রকাশ করুন"}</button></div></article>)}</div>}
  {stories.length>0&&stories.every(s=>![s.title,s.profiles?.[0]?.display_name||"",s.id].some(v=>v.toLowerCase().includes(storySearch.trim().toLowerCase())))&&<p className="muted">এই নামে কোনো গল্প পাওয়া যায়নি।</p>}
  <h2 style={{marginTop:38}}>লেখকের আয় নির্ধারণ</h2>
  <section className="formbox" style={{margin:"15px 0",maxWidth:"100%"}}>
   <p>প্রতি ১,০০০ যাচাইকৃত ভিউয়ের জন্য লেখককে কত টাকা হিসাব করা হবে তা নির্ধারণ করো। এটি আনুমানিক আয়; পেমেন্ট আলাদাভাবে যাচাই ও পরিচালনা করতে হবে।</p>
   <div className="field"><label>প্রতি ১,০০০ ভিউয়ের হার (BDT)</label><input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></div>
   <button className="btn" disabled={busy==="rate"} onClick={saveRate}>আয়ের হার সংরক্ষণ</button>
  </section>
  <h2 style={{marginTop:38}}>বিজ্ঞাপন ব্যবস্থাপনা</h2>
  <section className="formbox" style={{margin:"15px 0",maxWidth:"100%"}}>
   <p>এখানে বিজ্ঞাপনের গন্তব্য লিংক ও অবস্থান রাখা যাবে। এটি স্পন্সর লিংক; কোনো বিজ্ঞাপন নেটওয়ার্কের স্ক্রিপ্ট/আসল বিজ্ঞাপন কোড নয়। নেটওয়ার্কের অনুমোদিত কোড আলাদাভাবে নিরাপদভাবে সংযুক্ত করতে হবে। বিজ্ঞাপনে ক্লিক করতে পাঠককে বাধ্য করা যাবে না।</p>
   <form onSubmit={addAd}>
    <div className="field"><label>বিজ্ঞাপনের শিরোনাম</label><input required value={newTitle} onChange={e=>setNewTitle(e.target.value)}/></div>
    <div className="field"><label>বিজ্ঞাপনের লিংক (https://)</label><input type="url" required placeholder="https://example.com" value={newUrl} onChange={e=>setNewUrl(e.target.value)}/></div>
    <div className="field"><label>কোথায় দেখাবে</label><select value={placement} onChange={e=>setPlacement(e.target.value)}><option value="before_story">গল্পের আগে</option><option value="in_story">গল্পের মাঝে</option><option value="after_story">গল্পের শেষে</option></select></div>
    <button className="btn" disabled={busy==="ad"}>বিজ্ঞাপন লিংক যোগ করো</button>
   </form>
   {ads.map(ad=><article className="storycard" key={ad.id} style={{marginTop:12}}><b>{ad.title}</b><p className="muted">{ad.placement} · {ad.target_url}</p><div className="actions"><button className="outline" disabled={busy===ad.id} onClick={()=>toggleAd(ad)}>{ad.enabled?"বন্ধ করো":"চালু করো"}</button><button className="outline" disabled={busy===ad.id} onClick={()=>deleteAd(ad.id)}>মুছে ফেলো</button><span className="muted">{ad.enabled?"চালু":"বন্ধ"}</span></div></article>)}
  </section>
  <h2 style={{marginTop:38}}>ব্যবহারকারী ও Role ({users.length})</h2>
  <div className="grid">{users.map(u=><article className="storycard" key={u.id}><h3>{u.display_name||"নাম নেই"}</h3><p className="muted">অ্যাকাউন্ট ID: {u.id.slice(0,8)}…</p><div className="field"><label>অ্যাকাউন্ট Role</label><select value={u.role} disabled={busy===u.id} onChange={e=>changeRole(u.id,e.target.value)}><option value="reader">Reader</option><option value="author">Author</option><option value="admin">Admin</option></select></div></article>)}</div>
 </main>;
}
