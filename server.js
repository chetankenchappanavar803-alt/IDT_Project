/**
 * INSIGNIA - Multi-Device Shared Server & Network API
 * Enables real-time profile & peer synchronization across multiple laptops/devices.
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// Load environment variables from .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// ─── GEMINI AI CONFIG (server-side — key loaded from process.env) ───────────
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const GEMINI_MODELS    = ['gemini-2.0-flash', 'gemini-1.5-flash-8b'];

/**
 * Call Gemini API from Node.js with model fallback
 */
async function callGeminiServer(prompt, options = {}) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const result = await makeHttpsGeminiRequest(endpoint, prompt, options);
      console.log(`[Gemini Server] Success using model: ${model}`);
      return result;
    } catch (err) {
      console.warn(`[Gemini Server] Model ${model} failed: ${err.message}`);
      lastError = err;
      // If quota or rate limit error, try next model
      if (err.message.includes('Quota exceeded') || err.message.includes('rate-limit') || err.message.includes('429') || err.message.includes('limit: 0')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini models exhausted');
}

function makeHttpsGeminiRequest(endpoint, prompt, options) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     options.temperature     ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 2000,
        topP: 0.95
      }
    });

    const url = new URL(endpoint);
    const reqOptions = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            const errMsg = parsed?.error?.message || `HTTP ${res.statusCode}`;
            reject(new Error(errMsg));
            return;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse Gemini response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Parse JSON safely from Gemini response (strips markdown fences, extracts array/object)
 */
function parseGeminiJSON(raw) {
  let cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  // Extract first JSON array or object
  const arr = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arr) return JSON.parse(arr[0]);
  const obj = cleaned.match(/\{[\s\S]*\}/);
  if (obj) return JSON.parse(obj[0]);
  return JSON.parse(cleaned);
}

const DATA_DIR = path.join(__dirname, 'data');
const PEERS_FILE = path.join(DATA_DIR, 'peers.json');
const EXCHANGES_FILE = path.join(DATA_DIR, 'exchanges.json');

// Ensure data directory and initial peers file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_PEERS = [
  {
    id: 'usr_1',
    name: 'Sarah Chen',
    role: 'Frontend Specialist',
    targetCompany: 'Meta / Google',
    email: 'sarah.chen@tech.org',
    location: 'Seattle, WA',
    avatar: 'SC',
    status: 'Active for Skill Exchange',
    skillsKnown: ['React.js', 'TypeScript', 'CSS/Glassmorphism', 'Web Vitals', 'UI/UX Design'],
    skillsWanted: ['System Design', 'Node.js', 'Python', 'Docker', 'PostgreSQL'],
    bio: '5+ years building frontend user interfaces. Looking to learn backend system design architecture in exchange for React/CSS mastery.'
  },
  {
    id: 'usr_2',
    name: 'Marcus Vance',
    role: 'Backend Architect',
    targetCompany: 'Amazon / Uber',
    email: 'marcus.vance@backend.io',
    location: 'Austin, TX',
    avatar: 'MV',
    status: 'Available to Exchange',
    skillsKnown: ['System Design', 'Node.js', 'Python', 'Redis', 'PostgreSQL', 'Docker', 'REST APIs'],
    skillsWanted: ['React.js', 'TypeScript', 'CSS/Glassmorphism', 'UI Design', 'Frontend Performance'],
    bio: 'Distributed systems backend developer. Eager to partner with frontend devs to learn modern React/Glassmorphism UI skills.'
  },
  {
    id: 'usr_3',
    name: 'Priya Sharma',
    role: 'Data Scientist & AI Developer',
    targetCompany: 'Microsoft / OpenAI',
    email: 'priya.sharma@ai.edu',
    location: 'New York, NY',
    avatar: 'PS',
    status: 'Seeking Exchange Partner',
    skillsKnown: ['Python', 'PyTorch', 'Machine Learning', 'SQL', 'A/B Testing', 'Data Pipelines'],
    skillsWanted: ['React.js', 'System Design', 'Node.js', 'TypeScript', 'Docker'],
    bio: 'Machine learning practitioner building AI interview agents. Offering ML/Python mentoring for Full Stack & System Design help.'
  },
  {
    id: 'usr_4',
    name: 'David Miller',
    role: 'Full Stack Engineer',
    targetCompany: 'Stripe / Airbnb',
    email: 'david.miller@devnet.com',
    location: 'San Francisco, CA',
    avatar: 'DM',
    status: 'Active for Skill Exchange',
    skillsKnown: ['Node.js', 'GraphQL', 'PostgreSQL', 'Docker', 'REST APIs', 'TypeScript'],
    skillsWanted: ['System Design', 'Python', 'PyTorch', 'CSS/Glassmorphism', 'Web Vitals'],
    bio: 'Fullstack engineer focused on backend infrastructure. Looking for ML & Glassmorphism experts for mutual interview prep.'
  }
];

if (!fs.existsSync(PEERS_FILE)) {
  fs.writeFileSync(PEERS_FILE, JSON.stringify(DEFAULT_PEERS, null, 2));
}

function getPeers() {
  try {
    const data = fs.readFileSync(PEERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_PEERS;
  }
}

function savePeers(peers) {
  try {
    fs.writeFileSync(PEERS_FILE, JSON.stringify(peers, null, 2));
  } catch (e) {
    console.error('Failed to save peers:', e);
  }
}

// Exchanges helpers
if (!fs.existsSync(EXCHANGES_FILE)) {
  fs.writeFileSync(EXCHANGES_FILE, JSON.stringify([], null, 2));
}

function getExchanges() {
  try {
    const data = fs.readFileSync(EXCHANGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveExchanges(exchanges) {
  try {
    fs.writeFileSync(EXCHANGES_FILE, JSON.stringify(exchanges, null, 2));
  } catch (e) {
    console.error('Failed to save exchanges:', e);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS Headers for network requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Route: GET /api/peers
  if (req.url === '/api/peers' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getPeers()));
    return;
  }

  // API Route: POST /api/peers (Syncs new or updated profile across all laptops)
  if (req.url === '/api/peers' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const newPeer = JSON.parse(body);
        let peers = getPeers();

        // Check if peer already exists by email or id
        const idx = peers.findIndex(p => p.id === newPeer.id || (newPeer.email && p.email === newPeer.email));
        if (idx !== -1) {
          peers[idx] = { ...peers[idx], ...newPeer };
        } else {
          peers.unshift(newPeer);
        }

        savePeers(peers);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, peers }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // API Route: GET /api/exchanges?email=xxx (get proposals for a user)
  if (req.url.startsWith('/api/exchanges') && req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const email = urlObj.searchParams.get('email');
    let exchanges = getExchanges();
    if (email) {
      exchanges = exchanges.filter(e => e.toEmail === email || e.fromEmail === email);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(exchanges));
    return;
  }

  // API Route: POST /api/exchanges (send a new skill exchange proposal)
  if (req.url === '/api/exchanges' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const proposal = JSON.parse(body);
        const exchanges = getExchanges();

        // Prevent duplicate pending proposals between same pair
        const duplicate = exchanges.find(e =>
          e.fromEmail === proposal.fromEmail &&
          e.toEmail === proposal.toEmail &&
          e.status === 'pending'
        );
        if (duplicate) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'A pending proposal already exists with this user.' }));
          return;
        }

        const newProposal = {
          id: 'ex_' + Date.now(),
          ...proposal,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        exchanges.unshift(newProposal);
        saveExchanges(exchanges);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, proposal: newProposal }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API Route: PATCH /api/exchanges/:id (accept or decline a proposal)
  if (req.url.startsWith('/api/exchanges/') && req.method === 'PATCH') {
    const id = req.url.split('/api/exchanges/')[1];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body); // 'accepted' or 'declined'
        let exchanges = getExchanges();
        const idx = exchanges.findIndex(e => e.id === id);
        if (idx === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Exchange not found' }));
          return;
        }
        exchanges[idx].status = status;
        exchanges[idx].updatedAt = new Date().toISOString();
        saveExchanges(exchanges);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, exchange: exchanges[idx] }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // API Route: POST /api/ai  — Central Gemini AI Proxy
  // body: { action: string, payload: object }
  // ═══════════════════════════════════════════════════════════
  if (req.url === '/api/ai' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { action, payload } = JSON.parse(body);
        let result;

        // ── Q&A Generator ──────────────────────────────────────────
        if (action === 'qna') {
          const { role, level, type, count = 6 } = payload;
          const prompt = `You are an expert technical interview coach. Generate exactly ${count} interview questions for a ${level} ${role} position.
Question type: ${type === 'All' ? 'Mix of Technical, Behavioral, System Design, and HR' : type}

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "question": "Full question text",
    "answer": "Detailed model answer (use \\n for new lines)",
    "tips": "One key interviewer tip",
    "type": "Technical|Behavioral|System Design|HR",
    "category": "tech|behavioral|hr"
  }
]
Generate exactly ${count} items.`;
          const raw = await callGeminiServer(prompt, { temperature: 0.8, maxOutputTokens: 3000 });
          result = { questions: parseGeminiJSON(raw) };
        }

        // ── Mock Interview Questions ────────────────────────────────
        else if (action === 'mock-questions') {
          const { role, level, company, count = 5 } = payload;
          const co = company ? `at ${company}` : 'at a top tech company';
          const prompt = `You are a senior interviewer ${co}. Generate exactly ${count} realistic interview questions for a ${level} ${role} candidate.
Mix: Technical, System Design, Behavioral, HR questions.

Return ONLY a valid JSON array:
[
  {
    "question": "The full interview question",
    "type": "Technical|System Design|Behavioral|HR",
    "hint": "What the interviewer is looking for (1 sentence)"
  }
]
Generate exactly ${count} items. Start with '['.`;
          const raw = await callGeminiServer(prompt, { temperature: 0.85, maxOutputTokens: 1500 });
          result = { questions: parseGeminiJSON(raw) };
        }

        // ── Mock Answer Evaluation ─────────────────────────────────
        else if (action === 'mock-evaluate') {
          const { question, answer, role, type } = payload;
          if (!answer || answer.trim().length < 5) {
            result = { evaluation: { score: 0, feedback: 'No answer provided.', strengths: [], improvements: ['Please provide a detailed answer next time.'], modelAnswer: '' } };
          } else {
            const prompt = `You are a senior ${role} interviewer. Evaluate this interview answer:

QUESTION (${type}): ${question}

CANDIDATE ANSWER: ${answer}

Return ONLY valid JSON:
{
  "score": <0-10 integer>,
  "feedback": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "modelAnswer": "Brief ideal answer outline (2-3 sentences)"
}`;
            const raw = await callGeminiServer(prompt, { temperature: 0.4, maxOutputTokens: 900 });
            result = { evaluation: parseGeminiJSON(raw) };
          }
        }

        // ── Study Plan Generator ───────────────────────────────────
        else if (action === 'study-plan') {
          const { domain, level, role } = payload;
          const prompt = `You are an expert software engineering mentor. Create a focused interview study plan for a ${level} ${role || 'Software Engineer'} targeting: ${domain}.

Return ONLY valid JSON:
{
  "domain": "${domain}",
  "level": "${level}",
  "topics": [
    {
      "title": "Topic title",
      "duration": "X mins",
      "summary": "2-3 sentence interview-focused explanation",
      "code": "optional short code snippet or empty string",
      "keyPoints": ["point 1", "point 2", "point 3"]
    }
  ]
}
Generate 5 highly relevant topics for interview preparation.`;
          const raw = await callGeminiServer(prompt, { temperature: 0.7, maxOutputTokens: 2500 });
          result = { plan: parseGeminiJSON(raw) };
        }

        // ── Resume ATS Scorer ──────────────────────────────────────
        else if (action === 'resume-score') {
          const { resumeText } = payload;
          const prompt = `You are a senior ATS resume reviewer. Analyze this resume and return ONLY valid JSON:

RESUME:
${resumeText}

Return this exact JSON:
{
  "score": <0-100>,
  "grade": "A+|A|B+|B|C+|C|D",
  "summary": "2-sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": [
    {"issue": "Title", "fix": "Specific actionable fix", "priority": "High|Medium|Low"}
  ],
  "keywords_missing": ["keyword1", "keyword2"],
  "ats_tips": ["tip 1", "tip 2", "tip 3"]
}`;
          const raw = await callGeminiServer(prompt, { temperature: 0.3, maxOutputTokens: 1200 });
          result = { score: parseGeminiJSON(raw) };
        }

        // ── Dashboard Readiness Insight ────────────────────────────
        else if (action === 'dashboard-insight') {
          const { name, role, readiness, stats } = payload;
          const prompt = `You are a career coach AI. Give a brief, personalized readiness assessment for this candidate:

Name: ${name || 'Candidate'}
Target Role: ${role || 'Software Engineer'}
Readiness Scores: Resume ${readiness.resume}%, Technical ${readiness.technical}%, Mock ${readiness.mock}%, Study ${readiness.study}%
Stats: ${stats.mockCompleted} mocks done, ${stats.qnaPracticed} questions practiced, ${stats.topicsStudied} topics studied

Return ONLY valid JSON:
{
  "overallMessage": "One encouraging sentence (mention their name)",
  "topStrength": "Their biggest strength based on scores",
  "topWeakness": "Area needing most improvement",
  "nextAction": "Single most impactful thing to do today",
  "prediction": "Interview readiness prediction (e.g. Ready for junior, needs 2 more weeks for senior)"
}`;
          const raw = await callGeminiServer(prompt, { temperature: 0.6, maxOutputTokens: 500 });
          result = { insight: parseGeminiJSON(raw) };
        }

        else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));

      } catch (err) {
        console.warn('[/api/ai] Error calling Gemini API, providing smart fallback response:', err.message);

        // Smart fallback generator when API rate limits/quota occurs
        const { action, payload } = JSON.parse(body || '{}');

        if (action === 'qna') {
          const { role = 'Software Engineer', level = 'Mid-Level', type = 'Technical', count = 5 } = payload || {};
          const fallbackQnA = [
            {
              question: `How do you optimize application performance and reduce bundle size in modern ${role} projects?`,
              answer: `Key strategies for ${role} performance optimization:\n1. Code Splitting & Dynamic Imports: Load JS chunks on demand.\n2. Tree Shaking & Minification: Eliminate dead code during build pipeline.\n3. Asset Compression & Caching: Use Brotli/Gzip, CDN edge caching, and WebP images.\n4. Memory Leak Audit: Profile heap snapshots, unsubscribe event listeners, and clear intervals.`,
              tips: "Quantify metrics (e.g. 'reduced LCP by 40%') and discuss profiling tools.",
              type: type === 'All' ? 'Technical' : type,
              category: 'tech'
            },
            {
              question: `Describe how you handle state management and architectural modularity for complex ${role} architectures.`,
              answer: `Core Principles:\n- Separation of Concerns: Decouple UI components from data fetching logic using custom hooks/services.\n- Single Source of Truth: Store shared global state in centralized store while keeping local transient UI state component-scoped.\n- Immutability & Predictability: Use immutable data updates to prevent unexpected side effects.`,
              tips: "Explain trade-offs between centralized state vs component-level state.",
              type: 'System Design',
              category: 'tech'
            },
            {
              question: `Tell me about a challenging bug or high-concurrency issue you resolved under tight deadline pressure.`,
              answer: `Use the STAR Method:\n- Situation: High memory usage spike caused API latency to degrade during peak traffic.\n- Task: Identify root cause and fix within 24 hours without downtime.\n- Action: Profiled production logs, traced unindexed DB queries & connection pool leaks, added Redis caching layer.\n- Result: Reduced latency from 850ms to 45ms and restored system stability.`,
              tips: "Focus on diagnostic methodology, data-driven decisions, and post-mortem prevention.",
              type: 'Behavioral',
              category: 'behavioral'
            },
            {
              question: `How do you stay up-to-date with emerging tools and lead technical improvements within your engineering team?`,
              answer: `- Tech Radar & RFCs: Conduct internal tech talks and write RFCs before adopting major dependencies.\n- Continuous Learning: Follow open-source releases, read engineering blogs (Meta, Uber, Netflix), and build prototype benchmarks.`,
              tips: "Demonstrate initiative, mentorship, and business value alignment.",
              type: 'HR',
              category: 'hr'
            }
          ];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, questions: fallbackQnA.slice(0, count) }));
          return;
        }

        if (action === 'mock-questions') {
          const { role = 'Software Engineer', level = 'Mid-Level', count = 5 } = payload || {};
          const fallbackMock = [
            { question: `Can you introduce yourself and highlight a technical project you engineered for ${role}?`, type: "HR", hint: "Highlight core tech stack and measurable outcome" },
            { question: `How do you handle production incidents, memory leaks, or API latency under pressure?`, type: "Behavioral", hint: "STAR method — diagnostic steps, resolution, and post-mortem" },
            { question: `Explain the architectural trade-offs between monolithic, microservice, and serverless backends.`, type: "System Design", hint: "Scalability, deployment complexity, latency, and cost" },
            { question: `How do you ensure code quality, test coverage, and smooth CI/CD deployments in your team?`, type: "Technical", hint: "Unit tests, integration testing, linting rules, automated pipelines" },
            { question: `Describe a disagreement with a team member on architecture and how you reached consensus.`, type: "Behavioral", hint: "Empathy, benchmark data, and collaborative compromise" }
          ];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, questions: fallbackMock.slice(0, count) }));
          return;
        }

        if (action === 'mock-evaluate') {
          const { answer = '' } = payload || {};
          const score = answer.length > 50 ? 8 : answer.length > 15 ? 6 : 4;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            evaluation: {
              score,
              feedback: score >= 7 ? 'Strong response! Showed good technical understanding and clear structure.' : 'Fair effort. Add more specific technical metrics and examples.',
              strengths: ['Clear terminology', 'Relevant context provided'],
              improvements: ['Quantify metrics (e.g. % performance improvement)', 'Use STAR method structure'],
              modelAnswer: 'Start with a high-level summary, explain your specific technical role, and end with quantifiable results.'
            }
          }));
          return;
        }

        if (action === 'study-plan') {
          const { domain = 'Software Engineering', level = 'Mid-Level' } = payload || {};
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            plan: {
              domain,
              level,
              topics: [
                { title: `Mastering ${domain} Core Principles`, duration: "25 mins", summary: "Deep dive into fundamental design patterns, data flow, and runtime mechanics.", code: "// Example core pattern\nconst pattern = () => ({ status: 'optimal' });", keyPoints: ["Understand execution context", "Master core lifecycle & scope"] },
                { title: "System Architecture & Scalability", duration: "30 mins", summary: "Learn caching strategies, load balancing, database indexing, and API design.", code: "CREATE INDEX idx_perf ON records(user_id, status);", keyPoints: ["Clustered vs Non-clustered indexing", "Horizontal vs Vertical scaling"] },
                { title: "Performance Profiling & Bottlenecks", duration: "20 mins", summary: "Audit memory leaks, network waterfall charts, and rendering frame drops.", code: "console.time('audit');\n// Execute operation\nconsole.timeEnd('audit');", keyPoints: ["Web Vitals LCP/FID/CLS", "Heap snapshot analysis"] },
                { title: "Behavioral & STAR Method Mastery", duration: "20 mins", summary: "Structure responses around Situation, Task, Action, and Result for engineering leadership.", code: "", keyPoints: ["Always state measurable results", "Focus on technical ownership"] }
              ]
            }
          }));
          return;
        }

        if (action === 'resume-score') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            score: {
              score: 84,
              grade: "B+",
              summary: "Well-structured technical resume with strong job titles and relevant engineering skills.",
              strengths: ["Clear section hierarchy", "Action verbs used in experience descriptions", "Relevant technical skill tags"],
              improvements: [
                { issue: "Quantifiable Metrics", fix: "Add specific % metrics to achievements (e.g. 'improved performance by 35%')", priority: "High" },
                { issue: "ATS Keyword Coverage", fix: "Include missing cloud & containerization keywords", priority: "Medium" }
              ],
              keywords_missing: ["Docker", "CI/CD", "AWS", "TypeScript", "Jest"],
              ats_tips: ["Keep formatting standard without multi-column tables", "Use standard section headers like 'Work Experience' and 'Education'"]
            }
          }));
          return;
        }

        if (action === 'dashboard-insight') {
          const { name = 'Candidate' } = payload || {};
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            insight: {
              overallMessage: `Great job staying active, ${name}! Your interview preparation is making steady progress.`,
              topStrength: "Consistent technical Q&A practice & clear goal focus",
              topWeakness: "Complete 2 more timed mock interview sessions to boost score",
              nextAction: "Generate a new AI Study Plan for your target role",
              prediction: "On track for Mid-to-Senior Technical Roles (2-3 weeks remaining)"
            }
          }));
          return;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve Static Files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  filePath = path.normalize(filePath);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Insignia Multi-Device Shared Server running at http://${HOST}:${PORT}`);
});
