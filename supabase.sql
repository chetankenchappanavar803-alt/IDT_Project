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

-- Allow public insert & update access on peers
CREATE POLICY "Allow public insert access on peers" ON public.peers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on peers" ON public.peers
  FOR UPDATE USING (true);

-- Allow public read access on exchanges
CREATE POLICY "Allow public read access on exchanges" ON public.exchanges
  FOR SELECT USING (true);

-- Allow public insert & update access on exchanges
CREATE POLICY "Allow public insert access on exchanges" ON public.exchanges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on exchanges" ON public.exchanges
  FOR UPDATE USING (true);

-- 4. Insert Default Seed Peers
INSERT INTO public.peers (id, name, role, target_company, email, location, avatar, status, skills_known, skills_wanted, bio)
VALUES
  (
    'usr_1',
    'Sarah Chen',
    'Frontend Specialist',
    'Meta / Google',
    'sarah.chen@tech.org',
    'Seattle, WA',
    'SC',
    'Active for Skill Exchange',
    '["React.js", "TypeScript", "CSS/Glassmorphism", "Web Vitals", "UI/UX Design"]'::jsonb,
    '["System Design", "Node.js", "Python", "Docker", "PostgreSQL"]'::jsonb,
    '5+ years building frontend user interfaces. Looking to learn backend system design architecture in exchange for React/CSS mastery.'
  ),
  (
    'usr_2',
    'Marcus Vance',
    'Backend Architect',
    'Amazon / Uber',
    'marcus.vance@backend.io',
    'Austin, TX',
    'MV',
    'Available to Exchange',
    '["System Design", "Node.js", "Python", "Redis", "PostgreSQL", "Docker", "REST APIs"]'::jsonb,
    '["React.js", "TypeScript", "CSS/Glassmorphism", "UI Design", "Frontend Performance"]'::jsonb,
    'Distributed systems backend developer. Eager to partner with frontend devs to learn modern React/Glassmorphism UI skills.'
  ),
  (
    'usr_3',
    'Priya Sharma',
    'Data Scientist & AI Developer',
    'Microsoft / OpenAI',
    'priya.sharma@ai.edu',
    'New York, NY',
    'PS',
    'Seeking Exchange Partner',
    '["Python", "PyTorch", "Machine Learning", "SQL", "A/B Testing", "Data Pipelines"]'::jsonb,
    '["React.js", "System Design", "Node.js", "TypeScript", "Docker"]'::jsonb,
    'Machine learning practitioner building AI interview agents. Offering ML/Python mentoring for Full Stack & System Design help.'
  ),
  (
    'usr_4',
    'David Miller',
    'Full Stack Engineer',
    'Stripe / Airbnb',
    'david.miller@devnet.com',
    'San Francisco, CA',
    'DM',
    'Active for Skill Exchange',
    '["Node.js", "GraphQL", "PostgreSQL", "Docker", "REST APIs", "TypeScript"]'::jsonb,
    '["System Design", "Python", "PyTorch", "CSS/Glassmorphism", "Web Vitals"]'::jsonb,
    'Fullstack engineer focused on backend infrastructure. Looking for ML & Glassmorphism experts for mutual interview prep.'
  )
ON CONFLICT (email) DO NOTHING;
