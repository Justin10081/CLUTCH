# CLUTCH — Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose a name (e.g. "clutch-app"), set a database password, pick a region

## 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open `supabase/schema.sql` from this project
4. Paste the entire contents and click **Run**
5. You should see all tables created successfully

## 3. Get Your API Keys

1. Go to **Settings → API** in your Supabase dashboard
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (long JWT string)

## 4. Set Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
GROQ_API_KEY=your-groq-api-key-here
```

Get your Groq API key at [console.groq.com](https://console.groq.com).

## 5. For Vercel Deployment

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `GROQ_API_KEY` | Your Groq API key |

## 6. How It Works

- Without `.env`: App runs in **demo mode** — fake user, localStorage only
- With `.env`: App uses **real Supabase auth** — real accounts, cloud database, sync across devices

## 7. Optional: Enable Email Confirmations

In Supabase → **Authentication → Email Templates**:
- Customize the confirmation email with CLUTCH branding
- Or disable email confirmation for faster onboarding: **Authentication → Settings → Disable email confirmations**

## Troubleshooting

**"Supabase not configured"**: Check your `.env` file has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Auth not working**: Make sure you ran the full `schema.sql` including the trigger at the bottom

**RLS blocking queries**: All tables have RLS enabled — users can only see their own data. This is intentional.
