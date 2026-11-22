# গল্পঘর

বাংলা গল্প পড়া ও লেখার Next.js + Supabase ওয়েবসাইট।

## প্রযুক্তি
- Next.js 15
- Supabase Auth + Postgres + Row Level Security
- Vercel deployment

## Supabase সেটআপ
1. Supabase project-এর SQL Editor খুলুন।
2. `supabase/schema.sql` সম্পূর্ণ চালান।
3. ওয়েবসাইটে `/login` থেকে নিজের অ্যাকাউন্ট তৈরি করুন।
4. প্রথম Admin নির্ধারণ করতে SQL Editor-এ নিচের query চালান; নিজের signup email বসান:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('YOUR_SIGNUP_EMAIL')
);
```

5. Admin হিসেবে `/admin` খুলে প্রয়োজনীয় ব্যবহারকারীকে Author role দিন।

## নিরাপত্তা
- Public visitor শুধু published story পড়তে পারে।
- Reader নিজের থেকে Author/Admin হতে পারে না।
- Author শুধু নিজের draft তৈরি ও সম্পাদনা করতে পারে।
- Admin গল্প publish/unpublish ও user role পরিচালনা করতে পারে।
- কোনো Supabase service-role secret browser/client code-এ রাখা যাবে না।

## বিজ্ঞাপন
এখনো কোনো বিজ্ঞাপন network যুক্ত নেই। বিজ্ঞাপন যুক্ত করার আগে provider-এর approval ও policy মানতে হবে। বিজ্ঞাপনে ক্লিক করতে বলা, কৃত্রিম ক্লিক, বা ভুলবশত ক্লিক করানোর layout ব্যবহার করা যাবে না।
