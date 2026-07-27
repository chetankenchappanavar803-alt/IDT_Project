/**
 * VERCEL SERVERLESS FUNCTION: /api/exchanges
 * Manages skill exchange proposals (GET, POST, PATCH) with Supabase Postgres DB.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = path.join(__dirname, '..', 'data', 'exchanges.json');

function supabaseRequest(pathStr, method = 'GET', bodyData = null) {
  const urlStr = process.env.SUPABASE_URL;
  const keyStr = process.env.SUPABASE_KEY;
  if (!urlStr || !keyStr) return null;

  return new Promise((resolve, reject) => {
    const url = new URL(`${urlStr}/rest/v1/${pathStr}`);
    const bodyJson = bodyData ? JSON.stringify(bodyData) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': keyStr,
        'Authorization': `Bearer ${keyStr}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' || method === 'PATCH'
          ? 'return=representation,resolution=merge-duplicates'
          : 'count=exact'
      }
    };

    if (bodyJson) options.headers['Content-Length'] = Buffer.byteLength(bodyJson);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', err => reject(err));
    if (bodyJson) req.write(bodyJson);
    req.end();
  });
}

function getLocalExchanges() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function formatSupabaseExchanges(supaEx) {
  if (!Array.isArray(supaEx)) return [];
  return supaEx.map(e => ({
    id: e.id,
    fromName: e.from_name,
    fromEmail: e.from_email,
    fromAvatar: e.from_avatar,
    fromSkillsKnown: typeof e.from_skills_known === 'string' ? JSON.parse(e.from_skills_known) : e.from_skills_known || [],
    fromSkillsWanted: typeof e.from_skills_wanted === 'string' ? JSON.parse(e.from_skills_wanted) : e.from_skills_wanted || [],
    toName: e.to_name,
    toEmail: e.to_email,
    toPeerId: e.to_peer_id,
    message: e.message,
    status: e.status,
    createdAt: e.created_at,
    updatedAt: e.updated_at
  }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET /api/exchanges?email=xxx
  if (req.method === 'GET') {
    const email = req.query.email;

    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY && email) {
        const query = `exchanges?or=(to_email.eq.${encodeURIComponent(email)},from_email.eq.${encodeURIComponent(email)})&order=created_at.desc`;
        const supaEx = await supabaseRequest(query);
        if (Array.isArray(supaEx)) {
          return res.status(200).json(formatSupabaseExchanges(supaEx));
        }
      }
    } catch (err) {
      console.warn('Supabase exchanges fetch failed:', err.message);
    }

    let local = getLocalExchanges();
    if (email) {
      local = local.filter(e => e.toEmail === email || e.fromEmail === email);
    }
    return res.status(200).json(local);
  }

  // POST /api/exchanges (send new proposal)
  if (req.method === 'POST') {
    let proposal = req.body;
    if (typeof proposal === 'string') {
      try { proposal = JSON.parse(proposal); } catch (e) {}
    }

    if (!proposal || !proposal.fromEmail || !proposal.toEmail) {
      return res.status(400).json({ error: 'Invalid proposal data' });
    }

    const newProposal = {
      id: 'ex_' + Date.now(),
      ...proposal,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        const dbRow = {
          id: newProposal.id,
          from_name: newProposal.fromName,
          from_email: newProposal.fromEmail,
          from_avatar: newProposal.fromAvatar || 'US',
          from_skills_known: JSON.stringify(newProposal.fromSkillsKnown || []),
          from_skills_wanted: JSON.stringify(newProposal.fromSkillsWanted || []),
          to_name: newProposal.toName,
          to_email: newProposal.toEmail,
          to_peer_id: newProposal.toPeerId || '',
          message: newProposal.message,
          status: 'pending'
        };
        await supabaseRequest('exchanges', 'POST', dbRow);
      }
    } catch (err) {
      console.warn('Supabase exchange insert failed:', err.message);
    }

    return res.status(200).json({ success: true, proposal: newProposal });
  }

  // PATCH /api/exchanges?id=xxx  (accept or decline)
  if (req.method === 'PATCH') {
    const id = req.query.id || req.url.split('/api/exchanges/')[1];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const status = body?.status;
    if (!id || !status) {
      return res.status(400).json({ error: 'Exchange ID and status required' });
    }

    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        await supabaseRequest(`exchanges?id=eq.${encodeURIComponent(id)}`, 'PATCH', {
          status,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Supabase exchange update failed:', err.message);
    }

    return res.status(200).json({ success: true, id, status });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
