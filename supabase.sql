-- ══════════════════════════════════════════════════════════════════════════════
-- INSIGNIA AI CAREER SUITE — SUPABASE DATABASE MIGRATION SCRIPT
-- Paste this entire script into your Supabase Dashboard -> SQL Editor and click RUN
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Create Peers Table
CREATE TABLE IF NOT EXISTS public.peers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Software Engineer',
  target_company TEXT,
  email TEXT UNIQUE NOT NULL,
  location TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'Active for Skill Exchange',
  skills_known JSONB DEFAULT '[]'::jsonb,
  skills_wanted JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Exchanges Table
CREATE TABLE IF NOT EXISTS public.exchanges (
  id TEXT PRIMARY KEY,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_avatar TEXT,
  from_skills_known JSONB DEFAULT '[]'::jsonb,
  from_skills_wanted JSONB DEFAULT '[]'::jsonb,
  to_name TEXT NOT NULL,
  to_email TEXT NOT NULL,
  to_peer_id TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE public.peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

-- Allow public read access to peers
CREATE POLICY "Allow public read access on peers" ON public.peers
  FOR SELECT USING (true);

-- Allow public insert, update, delete access on peers
CREATE POLICY "Allow public insert access on peers" ON public.peers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on peers" ON public.peers
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on peers" ON public.peers
  FOR DELETE USING (true);

-- Allow public read access on exchanges
CREATE POLICY "Allow public read access on exchanges" ON public.exchanges
  FOR SELECT USING (true);

-- Allow public insert, update, delete access on exchanges
CREATE POLICY "Allow public insert access on exchanges" ON public.exchanges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on exchanges" ON public.exchanges
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on exchanges" ON public.exchanges
  FOR DELETE USING (true);

-- 4. Clean Table Setup Ready for Real User Registration
