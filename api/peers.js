/**
 * VERCEL SERVERLESS FUNCTION: /api/peers
 * Syncs real peer profiles across all devices using Supabase Postgres DB.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_FILE = path.join(__dirname, '..', 'data', 'peers.json');

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

function getLocalPeers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function formatSupabasePeers(supaPeers) {
  if (!Array.isArray(supaPeers)) return [];
  const DEMO_IDS = ['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_test'];
  return supaPeers
    .filter(p => p && p.id && !DEMO_IDS.includes(p.id) && !p.email.includes('tech.org') && !p.email.includes('backend.io') && !p.email.includes('ai.edu') && !p.email.includes('devnet.com'))
    .map(p => ({
      id: p.id,
      name: p.name,
      role: p.role || 'Software Engineer',
      targetCompany: p.target_company || '',
      email: p.email,
      location: p.location || '',
      avatar: p.avatar || (p.name ? p.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2) : 'US'),
      status: p.status || 'Active for Skill Exchange',
      skillsKnown: typeof p.skills_known === 'string' ? JSON.parse(p.skills_known) : p.skills_known || [],
      skillsWanted: typeof p.skills_wanted === 'string' ? JSON.parse(p.skills_wanted) : p.skills_wanted || [],
      bio: p.bio || ''
    }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET /api/peers
  if (req.method === 'GET') {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        const supaPeers = await supabaseRequest('peers?select=*&order=created_at.desc');
        if (Array.isArray(supaPeers) && supaPeers.length > 0) {
          return res.status(200).json(formatSupabasePeers(supaPeers));
        }
      }
    } catch (err) {
      console.warn('Supabase fetch failed:', err.message);
    }

    return res.status(200).json(getLocalPeers());
  }

  // POST /api/peers (Register or update a peer profile)
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    if (!body || !body.email || !body.name) {
      return res.status(400).json({ error: 'Peer name and email are required' });
    }

    const peerId = body.id || ('usr_' + (body.email || body.name).toLowerCase().replace(/[^a-z0-9]/g, '_'));

    // 1. Save/Upsert to Supabase
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        const dbRow = {
          id: peerId,
          name: body.name,
          role: body.role || body.targetTitle || 'Software Engineer',
          target_company: body.targetCompany || '',
          email: body.email,
          location: body.location || '',
          avatar: body.avatar || body.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2),
          status: body.status || 'Active for Skill Exchange',
          skills_known: JSON.stringify(body.skillsKnown || []),
          skills_wanted: JSON.stringify(body.skillsWanted || []),
          bio: body.bio || ''
        };

        // Use on_conflict=email so duplicate emails update existing user seamlessly
        await supabaseRequest('peers?on_conflict=email', 'POST', dbRow);

        // Fetch all fresh peers from Supabase after insert
        const supaPeers = await supabaseRequest('peers?select=*&order=created_at.desc');
        if (Array.isArray(supaPeers) && supaPeers.length > 0) {
          return res.status(200).json({ success: true, peers: formatSupabasePeers(supaPeers) });
        }
      }
    } catch (err) {
      console.warn('Supabase insert failed:', err.message);
    }

    // Fallback local update
    let peers = getLocalPeers();
    const idx = peers.findIndex(p => p.id === peerId || (body.email && p.email === body.email));
    if (idx !== -1) {
      peers[idx] = { ...peers[idx], ...body, id: peerId };
    } else {
      peers.unshift({ ...body, id: peerId });
    }

    return res.status(200).json({ success: true, peers });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
