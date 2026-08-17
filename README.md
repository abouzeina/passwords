# 🔐 SafeVault PRO - نظام إدارة كلمات المرور السحابي متعدد المستخدمين (Multi-User SaaS)

تطبيق ويب سحابي متكامل ومؤمن بأعلى معايير الأمان العالمية (**Zero-Knowledge Dual-Key Encryption**) مع قاعدة بيانات **PostgreSQL** السحابية ونظام عزل حسابات تام لكل مستخدم (Multi-Tenant)، مستوحى من معمارية **Bitwarden** و **1Password**.

---

## 🌟 مميزات النظام

- 👥 **نظام مستخدمين متكامل (Multi-User SaaS)**:
  - كل مستخدم يقوم بإنشاء حسابه أو تسجيل الدخول ببريده الإلكتروني وكلمة المرور الرئيسية.
  - عزل كامل للبيانات؛ لا يمكن لمستخدم رؤية بيانات أي مستخدم آخر.
- 🛡️ **تشفير Zero-Knowledge فائق الأمان (Client-Side AES-256)**:
  - تشفير وفك تشفير كل حساب وحقل على جهاز المستخدم فقط.
  - قاعدة البيانات لا ترى إلا نصوصاً مشفرة بالكامل (`Ciphertext`).
- 🗄️ **قاعدة بيانات ضخمة وسريعة (Enterprise PostgreSQL)**:
  - تخزين غير محدود للحسابات بفضل PostgreSQL و Row Level Security (RLS).
- 🔄 **مزامنة فورية (Realtime Sync)**:
  - أي تعديل على الهاتف ينعكس فوراً على المتصفح في نفس اللحظة.
- 💾 **دعم العمل أوفلاين (Offline & Local Mode)**:
  - إمكانية العمل بدون إنترنت مع تخزين محلي مشفر ومزامنة تلقائية عند عودة الاتصال.
- ⚡ **أدوات احترافية مدمجة**:
  - مولد كلمات مرور قوية، مقياس قوة كلمة المرور، تصدير واستيراد نسخ احتياطية مشفرة (JSON).

---

## 🗄️ إعداد قاعدة بيانات PostgreSQL (Supabase) في دقيقة واحدة

1. أنشئ حساباً مجانياً على [Supabase.com](https://supabase.com).
2. أنشئ مشروعاً جديداً (**New Project**).
3. افتح **SQL Editor** في لوحة تحكم Supabase والصق الكود التالي واضغط **Run**:

```sql
-- 1. إنشاء جدول عناصر الخزنة المشفرة
create table if not exists public.vault_items (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    username text not null,
    password text not null,
    url text,
    category text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. تفعيل الحماية الصارمة على مستوى الصفوف (Row Level Security)
alter table public.vault_items enable row level security;

-- 3. سياسة أمنية: كل مستخدم يملك صلاحية القراءة والتعديل والحذف لحساباته فقط
create policy "Users can only access their own vault items"
    on public.vault_items for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 4. فهرسة لسرعة استرجاع البيانات الفائقة
create index if not exists idx_vault_items_user_id on public.vault_items (user_id);
```

4. من **Project Settings ➔ API**، انسخ:
   - `Project URL`
   - `anon public key`
5. افتح SafeVault PRO واضغط على زر **"إعدادات الربط السحابي"** والصق الرابط والمفتاح.

---

## 🚀 الرفع والنشر على GitHub و Vercel

### 1. الرفع على GitHub:
```bash
git init
git add .
git commit -m "SafeVault PRO - Multi-User Zero-Knowledge Architecture"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 2. النشر على Vercel:
1. افتح [Vercel.com](https://vercel.com) وسجل الدخول.
2. اضغط **Add New ➔ Project** واختر مستودع `passwords`.
3. اضغط **Deploy**.
4. ستحصل على رابط عالمي مشفر بشهادة HTTPS جاهز للاستخدام من أي جهاز!
