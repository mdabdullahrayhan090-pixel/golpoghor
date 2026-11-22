# গল্পঘর — Vercel + Supabase starter

এটি মৌলিক, বয়স-উপযোগী বাংলা গল্পের সাইটের starter project। এতে public story pages, signup/login, Reader/Author/Admin role, draft story creation এবং admin publish/user-role UI আছে।

## ১) Supabase সেটআপ
1. https://supabase.com এ নিজের অ্যাকাউন্ট খুলে New project তৈরি করো।
2. Project → SQL Editor → New query খুলে `supabase/schema.sql`-এর SQL চালাও।
3. Project Settings → API থেকে Project URL এবং anon/publishable key কপি করো।
4. Authentication → URL Configuration-এ পরে Vercel site URL যোগ করবে।
5. Authentication → Providers-এ Email চালু রাখো। Email confirmation চালু থাকলে signup-এর পর ইমেইল যাচাই করতে হবে।

## ২) প্রথম Admin তৈরি
1. সাইটে `/login` থেকে নিজের অ্যাকাউন্ট তৈরি করো এবং ইমেইল যাচাই করো।
2. Supabase → Authentication → Users থেকে নিজের user UUID কপি করো।
3. SQL Editor-এ চালাও:
   `update public.profiles set role='admin' where id='তোমার-UUID';`
4. এরপর `/dashboard`-এ লগইন করলে Admin controls দেখা যাবে।

## ৩) Vercel-এ প্রকাশ
1. এই ফোল্ডারটি GitHub repository-তে upload করো.
2. https://vercel.com এ GitHub দিয়ে লগইন করে Add New → Project থেকে repository import করো.
3. Environment Variables-এ `.env.example`-এর দুইটি variable যোগ করো:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy চাপো. Vercel একটি `*.vercel.app` ঠিকানা দেবে।
5. Supabase → Authentication → URL Configuration-এ Site URL হিসেবে Vercel URL দাও এবং Redirect URLs-এ `https://তোমার-সাইট.vercel.app/**` যোগ করো।

## ৪) লোকাল পরীক্ষা
Node.js 20+ লাগবে। `.env.example` কপি করে `.env.local` বানাও, নিজের Supabase values বসাও, তারপর:
`npm install`
`npm run dev`

## গুরুত্বপূর্ণ নিরাপত্তা ও অসম্পূর্ণতা
- নতুন signup ডিফল্টভাবে Reader; Admin-কে SQL দিয়ে Author/Admin করতে হবে।
- কখনো `service_role` secret browser বা `NEXT_PUBLIC_` variable-এ দেবে না।
- Role management-এর UPDATE policy কেবল Admin-এর জন্য; সাধারণ ব্যবহারকারী নিজের role পরিবর্তন করতে পারে না। Author নিজের draft সম্পাদনা করতে পারে, কিন্তু প্রকাশ করতে পারে না—Admin প্রকাশ করে।
- লেখক নিজের গল্প খসড়া হিসেবে তৈরি করতে পারে; Admin প্রকাশ করতে পারে। আলাদা episode management, password reset, image storage, moderation/reporting, rate limiting, backups, privacy policy ও terms পরবর্তী ধাপে যোগ করা দরকার।
- Vercel/Supabase-এর free plan-এ usage limits ও inactivity policies থাকে; সম্পূর্ণ বিনামূল্যে/চিরস্থায়ী থাকার নিশ্চয়তা নেই।
- বিজ্ঞাপন বসানোর আগে সংশ্লিষ্ট নেটওয়ার্কের বয়স, কনটেন্ট, ট্রাফিক ও publisher eligibility নীতি যাচাই করতে হবে। এই starter-এ শুধু placeholder আছে।
- কেবল নিজের লেখা বা ব্যবহারের অনুমতি থাকা কনটেন্ট প্রকাশ করবে। এই সাইটের উদ্দেশ্য মৌলিক, বয়স-উপযোগী গল্প।


## বিজ্ঞাপন স্লট (সতর্কতা)
- গল্পের পাতায় একটি স্পষ্টভাবে চিহ্নিত ঐচ্ছিক স্পন্সর বার্তা এবং মোবাইলের নিচে বন্ধ করা যায় এমন ব্যানার placeholder যোগ করা হয়েছে।
- এটি এখনো কোনো বাস্তব বিজ্ঞাপন দেখায় না এবং কোনো বিজ্ঞাপন নেটওয়ার্কের সঙ্গে সংযুক্ত নয়।
- বিজ্ঞাপন নেটওয়ার্ক অনুমোদনের পর তাদের দেওয়া official ad code-ই নির্দিষ্ট slot-এ বসাতে হবে।
- Google AdSense বা অন্য নেটওয়ার্কের বিজ্ঞাপনকে ৫–১০ সেকেন্ড জোর করে আটকে রাখা, কনটেন্ট ঢেকে রাখা, ক্লিক করতে বলা, ক্লিকের জন্য পুরস্কার দেওয়া, বা ভুল করে ক্লিক হয় এমনভাবে বসানো যাবে না। বিজ্ঞাপনের click-through সংশ্লিষ্ট নেটওয়ার্ক নিজেই নিয়ন্ত্রণ করে।
- বর্তমান sponsor card-এ পাঠক যেকোনো সময় “গল্প পড়া শুরু করুন” চাপতে পারে; countdown কেবল একটি দৃশ্যমান তথ্য, বিজ্ঞাপন দেখার শর্ত নয়।
