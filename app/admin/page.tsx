"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Story={id:string;title:string;excerpt:string|null;status:string;created_at:string;author_id:string;profiles?:{display_name:string|null}[]|null};
type Profile={id:string;display_name:string|null;role:string;created_at:string};
type AdSlot={id:string;placement:string;title:string;target_url:string;enabled:boolean};
type NetworkSettings={home_enabled:boolean;home_code:string;story_enabled:boolean;story_code:string};
type ImportPreview={title:string;author:string;content:string;sourceUrl:string};
type StoryEdit={id:string;title:string;excerpt:string;content:string;next_part_url:string};
export default function AdminPage(){
 const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false);
 const [stories,setStories]=useState<Story[]>([]),[users,setUsers]=useState<Profile[]>([]),[views,setViews]=useState<{story_id:string}[]>([]);
 const [ads,setAds]=useState<AdSlot[]>([]),[newUrl,setNewUrl]=useState(""),[newTitle,setNewTitle]=useState("স্পন্সর"),[placement,setPlacement]=useState("before_story");
 const [network,setNetwork]=useState<NetworkSettings>({home_enabled:false,home_code:"",story_enabled:false,story_code:""});
 const [msg,setMsg]=useState("লোড হচ্ছে…"),[busy,setBusy]=useState(""),[storySearch,setStorySearch]=useState("");
 const [importUrl,setImportUrl]=useState(""),[importPreview,setImportPreview]=useState<ImportPreview|null>(null),[permission,setPermission]=useState(false);
 const [editing,setEditing]=useState<StoryEdit|null>(null);
 const editFormRef=useRef<HTMLElement|null>(null);
 const db=createClient();
 async function load(){
  const {data:{user}}=await db.auth.getUser();
  if(!user){setMsg("Admin Panel দেখতে আগে লগইন করো।");setReady(true);return;}
  if((user.email||"").toLowerCase()!=="baginam674@gmail.com"){setMsg("এই Admin Panel শুধু নির্ধারিত মালিকের অ্যাকাউন্টের জন্য।");setReady(true);return;}
  const {data:me}=await db.from("profiles").select("role").eq("id",user.id).single();
  if(me?.role!=="admin"){setMsg("এই পেজটি শুধু নির্ধারিত Admin-এর জন্য।");setReady(true);return;}
  setAllowed(true);
  const [s,u,v,a,n]=await Promise.all([
   db.from("stories").select("id,title,excerpt,status,created_at,author_id,profiles(display_name)").order("created_at",{ascending:false}),
   db.from("profiles").select("id,display_name,role,created_at").order("created_at",{ascending:false}),
   db.from("story_views").select("story_id"),
   db.from("ad_slots").select("id,placement,title,target_url,enabled").order("created_at",{ascending:true}),
   db.from("ad_network_settings").select("home_enabled,home_code,story_enabled,story_code").eq("id",1).maybeSingle()
  ]);
  const error=s.error||u.error||v.error||a.error||n.error;
  if(error)setMsg(error.message);
  else {setStories((s.data||[]) as Story[]);setUsers((u.data||[]) as Profile[]);setViews((v.data||[]) as {story_id:string}[]);setAds((a.data||[]) as AdSlot[]);if(n.data)setNetwork(n.data as NetworkSettings);setMsg("");}
  setReady(true);
 }
 useEffect(()=>{load();},[]);
 useEffect(()=>{if(editing) editFormRef.current?.scrollIntoView({behavior:"smooth",block:"start"});},[editing]);
 const countViews=(id:string)=>views.filter(v=>v.story_id===id).length;
 async function openEdit(id:string){setBusy("edit");setMsg("");const {data,error}=await db.from("stories").select("id,title,excerpt,content,next_part_url").eq("id",id).single();if(error){setMsg(error.message.includes("next_part_url")?"পরবর্তী পর্বের সুবিধার জন্য Supabase-এ migration SQL চালাতে হবে।":error.message);}else setEditing({id,title:data.title||"",excerpt:data.excerpt||"",content:data.content||"",next_part_url:data.next_part_url||""});setBusy("");}
 async function saveStoryEdit(e:React.FormEvent){e.preventDefault();if(!editing)return;setBusy("edit-save");const {error}=await db.from("stories").update({title:editing.title.trim(),excerpt:editing.excerpt,content:editing.content,next_part_url:editing.next_part_url.trim()||null,updated_at:new Date().toISOString()}).eq("id",editing.id);setMsg(error?error.message:"গল্পের পরিবর্তন সংরক্ষণ হয়েছে।");if(!error){setEditing(null);await load();}setBusy("");}
 async function copyStoryLink(id:string){const url=window.location.origin+"/stories/"+id;try{await navigator.clipboard.writeText(url);setMsg("গল্পের লিংক কপি হয়েছে: "+url);}catch{setMsg("লিংক কপি করা যায়নি। লিংকটি: "+url);}}
 const totalViews=views.length;
 async function publish(id:string,yes:boolean){setBusy(id);setMsg("");const {error}=await db.rpc("admin_publish_story",{story_id:id,publish:yes});if(error)setMsg(error.message);else await load();setBusy("");}
 async function changeRole(id:string,role:string){setBusy(id);const {error}=await db.from("profiles").update({role}).eq("id",id);if(error)setMsg(error.message);else await load();setBusy("");}
 async function addAd(e:React.FormEvent){e.preventDefault();setBusy("ad");const {error}=await db.from("ad_slots").insert({placement,title:newTitle,target_url:newUrl,enabled:false});setMsg(error?error.message:"বিজ্ঞাপন লিংক যোগ হয়েছে। চালু করতে নিচের সুইচ অন করো।");if(!error){setNewUrl("");await load();}setBusy("");}
 async function toggleAd(ad:AdSlot){setBusy(ad.id);const {error}=await db.from("ad_slots").update({enabled:!ad.enabled}).eq("id",ad.id);if(error)setMsg(error.message);else await load();setBusy("");}
 async function deleteAd(id:string){setBusy(id);const {error}=await db.from("ad_slots").delete().eq("id",id);if(error)setMsg(error.message);else await load();setBusy("");}
 async function previewImport(e:React.FormEvent){e.preventDefault();setBusy("import");setMsg("");setImportPreview(null);try{const res=await fetch("/api/admin/story-import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"preview",url:importUrl})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Preview করা যায়নি।");setImportPreview(data);setMsg("গল্প Preview তৈরি হয়েছে। লেখা দেখে নাও।");}catch(err){setMsg(err instanceof Error?err.message:"গল্প আনা যায়নি।");}finally{setBusy("");}}
 async function saveImportedStory(){if(!importPreview||!permission)return;setBusy("import-save");const {data:{user}}=await db.auth.getUser();if(!user){setMsg("Admin হিসেবে আবার লগইন করো।");setBusy("");return;}const {error}=await db.from("stories").insert({author_id:user.id,title:importPreview.title,category:"আমদানিকৃত গল্প",excerpt:(importPreview.author?"মূল লেখক: "+importPreview.author+" · ":"")+"উৎস: "+importPreview.sourceUrl,content:importPreview.content,status:"draft",source_url:importPreview.sourceUrl});if(error)setMsg(error.message);else{setMsg("গল্প Draft হিসেবে Import হয়েছে। Story তালিকায় পাবে।");setImportPreview(null);setImportUrl("");setPermission(false);await load();}setBusy("");}
 async function saveNetwork(e:React.FormEvent){e.preventDefault();setBusy("network");const {error}=await db.from("ad_network_settings").upsert({id:1,...network,updated_at:new Date().toISOString()},{onConflict:"id"});setMsg(error?error.message:"বিজ্ঞাপন নেটওয়ার্কের সেটিংস সংরক্ষণ হয়েছে।");setBusy("");}
 if(!ready)return <main className="wrap"><p>{msg}</p></main>;
 if(!allowed)return <main className="formbox"><h1>Admin Panel</h1><p>{msg}</p><a className="btn" href="/login">লগইন</a></main>;
 return <main className="wrap">
  <div className="sectionhead"><h1>গল্পঘর · Admin Panel</h1><a className="outline" href="/dashboard">লেখক ড্যাশবোর্ড</a></div>
  {msg&&<p className="notice">{msg}</p>}
  <div className="grid">
   <article className="storycard"><span className="muted">মোট গল্প</span><h2>{stories.length}</h2></article>
   <article className="storycard"><span className="muted">প্রকাশিত গল্প</span><h2>{stories.filter(s=>s.status==="published").length}</h2></article>
   <article className="storycard"><span className="muted">যাচাইকৃত ভিউ</span><h2>{totalViews}</h2></article>
  </div>
  <h2 style={{marginTop:30}}>লিংক দিয়ে গল্প Import</h2>
  <section className="formbox" style={{margin:"15px 0",maxWidth:"100%"}}>
   <p>পাবলিক ওয়েবপেজের লিংক দিলে গল্পের শিরোনাম ও লেখা শনাক্ত করে Preview দেখাবে। লগইন/পেওয়াল বা অনুমতি-নিষেধাজ্ঞা এড়িয়ে কোনো লেখা আনা হবে না। শুধু নিজের লেখা, অনুমতিপ্রাপ্ত বা উন্মুক্ত লাইসেন্সের গল্প Import করবে।</p>
   <form onSubmit={previewImport}>
    <div className="field"><label>গল্পের ওয়েব লিংক</label><input type="url" required value={importUrl} onChange={e=>setImportUrl(e.target.value)} placeholder="https://example.com/story"/></div>
    <button className="btn" disabled={busy==="import"}>{busy==="import"?"গল্প খোঁজা হচ্ছে…":"গল্প Preview করো"}</button>
   </form>
   {importPreview&&<article className="storycard" style={{marginTop:16}}>
    <span className="tag">Preview · Draft হবে</span><h3>{importPreview.title}</h3>
    {importPreview.author&&<p className="muted">মূল লেখক: {importPreview.author}</p>}
    <p className="muted">উৎস: <a href={importPreview.sourceUrl} target="_blank" rel="noreferrer">{importPreview.sourceUrl}</a></p>
    <div style={{whiteSpace:"pre-wrap",maxHeight:360,overflowY:"auto",lineHeight:1.8,border:"1px solid var(--border, #ddd)",padding:12,borderRadius:10}}>{importPreview.content}</div>
    <label style={{display:"flex",gap:8,alignItems:"flex-start",margin:"14px 0"}}><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/>আমি নিশ্চিত করছি যে এই গল্পটি আমার নিজের, অথবা এটি Import ও প্রকাশের প্রয়োজনীয় অনুমতি/লাইসেন্স আমার আছে।</label>
    <div className="actions"><button className="btn" disabled={!permission||busy==="import-save"} onClick={saveImportedStory}>Draft হিসেবে Import করো</button><button className="outline" onClick={()=>setImportPreview(null)}>বাতিল</button></div>
   </article>}
  </section>
  <h2 style={{marginTop:38}}>গল্প ও ভিউ ব্যবস্থাপনা</h2>
  <div className="field" style={{marginTop:14}}><label>গল্প খুঁজুন — নাম, লেখক বা Story ID</label><input value={storySearch} onChange={e=>setStorySearch(e.target.value)} placeholder="গল্পের নাম / লেখকের নাম / #StoryID"/></div>
  {stories.length===0?<p className="muted">এখনো কোনো গল্প জমা হয়নি।</p>:<div className="grid">{stories.map((s,index)=>({s,index})).filter(({s})=>[s.title,s.profiles?.[0]?.display_name||"",s.id].some(v=>v.toLowerCase().includes(storySearch.trim().toLowerCase()))).map(({s,index})=><article className="storycard" key={s.id}><span className="tag">{s.status==="published"?"প্রকাশিত":"খসড়া"}</span><p className="muted">#{String(index+1).padStart(4,"0")} · Story ID: {s.id.slice(0,8)}</p><h3>{s.title}</h3><p>{s.excerpt}</p><p className="muted">লেখক: {s.profiles?.[0]?.display_name||"লেখক"} · ভিউ: {countViews(s.id)}</p><div className="actions"><button type="button" className="outline" disabled={busy==="edit"} onClick={()=>openEdit(s.id)}>{busy==="edit"?"লোড হচ্ছে…":"গল্প Edit"}</button><button className="outline" onClick={()=>copyStoryLink(s.id)}>লিংক Copy</button>{s.status==="published"?<a className="outline" href={"/stories/"+s.id} target="_blank" rel="noreferrer">গল্প দেখুন ↗</a>:<span className="muted">প্রকাশের পর পাঠকরা দেখতে পাবে</span>}<button className="btn" disabled={busy===s.id} onClick={()=>publish(s.id,s.status!=="published")}>{s.status==="published"?"আনপাবলিশ":"প্রকাশ করুন"}</button></div></article>)}</div>}
  {editing&&<section ref={editFormRef} className="formbox" style={{margin:"18px 0",maxWidth:"100%",scrollMarginTop:24}}><h2>গল্প Edit</h2><form onSubmit={saveStoryEdit}><div className="field"><label>গল্পের শিরোনাম</label><input required value={editing.title} onChange={e=>setEditing(v=>v?({...v,title:e.target.value}):v)}/></div><div className="field"><label>সংক্ষিপ্ত পরিচিতি</label><textarea rows={3} value={editing.excerpt} onChange={e=>setEditing(v=>v?({...v,excerpt:e.target.value}):v)}/></div><div className="field"><label>গল্পের সম্পূর্ণ লেখা</label><textarea required rows={12} value={editing.content} onChange={e=>setEditing(v=>v?({...v,content:e.target.value}):v)}/></div><div className="field"><label>পরবর্তী পর্বের লিংক (ঐচ্ছিক)</label><input type="url" placeholder="https://golpoghor-kappa.vercel.app/stories/..." value={editing.next_part_url} onChange={e=>setEditing(v=>v?({...v,next_part_url:e.target.value}):v)}/></div><div className="actions"><button className="btn" disabled={busy==="edit-save"}>পরিবর্তন সংরক্ষণ</button><button type="button" className="outline" onClick={()=>setEditing(null)}>বাতিল</button></div></form></section>}
  {stories.length>0&&stories.every(s=>![s.title,s.profiles?.[0]?.display_name||"",s.id].some(v=>v.toLowerCase().includes(storySearch.trim().toLowerCase())))&&<p className="muted">এই নামে কোনো গল্প পাওয়া যায়নি।</p>}
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
  <h2 style={{marginTop:30}}>বিজ্ঞাপন নেটওয়ার্ক কোড</h2>
  <section className="formbox" style={{margin:"15px 0",maxWidth:"100%"}}>
   <p>Monetag বা অনুমোদিত বিজ্ঞাপন নেটওয়ার্কের কোড এখানে সংরক্ষণ করা যাবে। হোমপেজ ও গল্পের জন্য আলাদা কোড এবং On/Off সুইচ আছে। কোডটি শুধু বিশ্বস্ত, অনুমোদিত নেটওয়ার্কের কাছ থেকে নেবে।</p>
   <form onSubmit={saveNetwork}>
    <h3>হোমপেজ বিজ্ঞাপন</h3>
    <div className="field"><label>হোমপেজ বিজ্ঞাপন চালু</label><select value={network.home_enabled?"on":"off"} onChange={e=>setNetwork(v=>({...v,home_enabled:e.target.value==="on"}))}><option value="off">বন্ধ</option><option value="on">চালু</option></select></div>
    <div className="field"><label>হোমপেজ Ad Code</label><textarea rows={5} value={network.home_code} onChange={e=>setNetwork(v=>({...v,home_code:e.target.value}))} placeholder="এখানে অনুমোদিত বিজ্ঞাপন কোড পেস্ট করো"/></div>
    <h3>গল্পের পেজ বিজ্ঞাপন</h3>
    <div className="field"><label>গল্পের পেজ বিজ্ঞাপন চালু</label><select value={network.story_enabled?"on":"off"} onChange={e=>setNetwork(v=>({...v,story_enabled:e.target.value==="on"}))}><option value="off">বন্ধ</option><option value="on">চালু</option></select></div>
    <div className="field"><label>গল্পের পেজ Ad Code</label><textarea rows={5} value={network.story_code} onChange={e=>setNetwork(v=>({...v,story_code:e.target.value}))} placeholder="এখানে অনুমোদিত বিজ্ঞাপন কোড পেস্ট করো"/></div>
    <button className="btn" disabled={busy==="network"}>কোড ও সেটিংস সংরক্ষণ</button>
   </form>
   <p className="muted">নিরাপত্তার জন্য এই সংস্করণে কোড সংরক্ষণ হবে; যাচাই ছাড়া সরাসরি চালানো হবে না।</p>
  </section>
  <h2 style={{marginTop:38}}>ব্যবহারকারী ও Role ({users.length})</h2>
  <div className="grid">{users.map(u=><article className="storycard" key={u.id}><h3>{u.display_name||"নাম নেই"}</h3><p className="muted">অ্যাকাউন্ট ID: {u.id.slice(0,8)}…</p><div className="field"><label>অ্যাকাউন্ট Role</label>{u.role==="admin"?<span className="tag">Admin (সুরক্ষিত)</span>:<select value={u.role} disabled={busy===u.id} onChange={e=>changeRole(u.id,e.target.value)}><option value="reader">Reader</option><option value="author">Author</option></select>}</div></article>)}</div>
 </main>;
}
