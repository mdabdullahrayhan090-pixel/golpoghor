"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Story={id:string;title:string;excerpt:string|null;status:string;created_at:string;author_id:string;profiles?:{display_name:string|null}|null};
type Profile={id:string;display_name:string|null;role:string;created_at:string};
export default function AdminPage(){
 const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false),[stories,setStories]=useState<Story[]>([]),[users,setUsers]=useState<Profile[]>([]),[msg,setMsg]=useState("লোড হচ্ছে…"),[busy,setBusy]=useState("");
 const db=createClient();
 async function load(){
  const {data:{user}}=await db.auth.getUser();
  if(!user){setMsg("Admin panel দেখতে আগে লগইন করো।");setReady(true);return;}
  const {data:me}=await db.from("profiles").select("role").eq("id",user.id).single();
  if(me?.role!=="admin"){setMsg("এই পেজটি শুধু Admin-এর জন্য।");setReady(true);return;}
  setAllowed(true);
  const [s,u]=await Promise.all([
   db.from("stories").select("id,title,excerpt,status,created_at,author_id,profiles(display_name)").order("created_at",{ascending:false}),
   db.from("profiles").select("id,display_name,role,created_at").order("created_at",{ascending:false})
  ]);
  if(s.error||u.error){setMsg(s.error?.message||u.error?.message||"তথ্য আনা যায়নি।");}
  else {setStories((s.data||[]) as Story[]);setUsers((u.data||[]) as Profile[]);setMsg("");}
  setReady(true);
 }
 useEffect(()=>{load();},[]);
 async function publish(id:string,yes:boolean){setBusy(id);setMsg("");const {error}=await db.rpc("admin_publish_story",{story_id:id,publish:yes});if(error)setMsg(error.message);else await load();setBusy("");}
 async function changeRole(id:string,role:string){setBusy(id);const {error}=await db.from("profiles").update({role}).eq("id",id);if(error)setMsg(error.message);else await load();setBusy("");}
 if(!ready)return <main className="wrap"><p>{msg}</p></main>;
 if(!allowed)return <main className="formbox"><h1>Admin Panel</h1><p>{msg}</p><a className="btn" href="/login">লগইন</a></main>;
 return <main className="wrap">
  <div className="sectionhead"><h1>Admin Panel</h1><a className="outline" href="/dashboard">লেখক ড্যাশবোর্ড</a></div>
  {msg&&<p className="notice">{msg}</p>}
  <h2>গল্প ব্যবস্থাপনা ({stories.length})</h2>
  {stories.length===0?<p className="muted">এখনো কোনো গল্প জমা হয়নি।</p>:<div className="grid">{stories.map(s=><article className="storycard" key={s.id}><span className="tag">{s.status==="published"?"প্রকাশিত":"খসড়া"}</span><h3>{s.title}</h3><p>{s.excerpt}</p><small className="muted">লেখক: {s.profiles?.display_name||s.author_id.slice(0,8)}</small><div className="actions"><a className="outline" href={s.status==="published"?"/stories/"+s.id:"/dashboard"}>দেখুন</a><button className="btn" disabled={busy===s.id} onClick={()=>publish(s.id,s.status!=="published")}>{s.status==="published"?"আনপাবলিশ":"প্রকাশ করুন"}</button></div></article>)}</div>}
  <h2 style={{marginTop:42}}>ব্যবহারকারী ও Role ({users.length})</h2>
  <div className="grid">{users.map(u=><article className="storycard" key={u.id}><h3>{u.display_name||"নাম নেই"}</h3><p className="muted">{u.id.slice(0,8)}…</p><div className="field"><label>অ্যাকাউন্ট Role</label><select value={u.role} disabled={busy===u.id} onChange={e=>changeRole(u.id,e.target.value)}><option value="reader">Reader</option><option value="author">Author</option><option value="admin">Admin</option></select></div></article>)}</div>
 </main>;
}