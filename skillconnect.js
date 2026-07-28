/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * Skill Connect Component - Real Multi-Device Skill Matching Engine & Network Sync
 */

window.InsigniaViews = window.InsigniaViews || {};

let skillConnectSyncTimer = null;

window.InsigniaViews.skillconnect = function renderSkillConnectView() {
  initUserSkillsUI();
  setupFilterListeners();

  // Show a prompt if user hasn't registered yet
  const guestBanner = document.getElementById('skill-connect-guest-banner');
  if (guestBanner) {
    const isGuest = !InsigniaState.currentUser.isRegistered || !InsigniaState.currentUser.email;
    guestBanner.style.display = isGuest ? 'block' : 'none';
  }
  
  // Initial fetch & render from shared network
  syncAndRenderPeers();

  // Setup periodic polling to auto-sync profiles registered on other laptops
  clearInterval(skillConnectSyncTimer);
  skillConnectSyncTimer = setInterval(() => {
    if (InsigniaState.activeView === 'skillconnect') {
      syncAndRenderPeers(true); // silent sync
    }
  }, 4000);

  setupAddPeerModal();
};

function initUserSkillsUI() {
  const user = InsigniaState.currentUser;

  const knownInput = document.getElementById('user-skills-known');
  const wantedInput = document.getElementById('user-skills-wanted');

  if (knownInput) {
    knownInput.value = (user.skillsKnown || []).join(', ');
  }
  if (wantedInput) {
    wantedInput.value = (user.skillsWanted || []).join(', ');
  }

  const btnUpdateSkills = document.getElementById('btn-update-skills-match');
  if (btnUpdateSkills) {
    btnUpdateSkills.onclick = () => {
      const knownStr = knownInput ? knownInput.value : '';
      const wantedStr = wantedInput ? wantedInput.value : '';

      user.skillsKnown = knownStr.split(',').map(s => s.trim()).filter(Boolean);
      user.skillsWanted = wantedStr.split(',').map(s => s.trim()).filter(Boolean);

      saveState();

      // Broadcast user's profile and skills to the shared server so other laptops can see it!
      broadcastAccountToServer(user);

      syncAndRenderPeers();
      showToast('Skill Preferences Updated & Synced to Shared Network!', 'success');
    };
  }
}

function setupFilterListeners() {
  const filterSelect = document.getElementById('skill-match-filter');
  if (filterSelect) {
    filterSelect.onchange = () => {
      matchAndRenderPeers();
    };
  }

  const searchInput = document.getElementById('peer-search-input');
  if (searchInput) {
    searchInput.oninput = () => {
      matchAndRenderPeers();
    };
  }
}

const WIPED_IDS = [
  'usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_test',
  'usr_shankaragoudapatil0406_gmail_com',
  'usr_chetan_gmail_com',
  'usr_suhas_gmail_com',
  'usr_none_gmail_com'
];

function isPeerValid(p) {
  if (!p || !p.id || !p.name) return false;
  if (WIPED_IDS.includes(p.id)) return false;
  if (p.email) {
    const e = p.email.toLowerCase();
    if (e.includes('tech.org') || e.includes('backend.io') || e.includes('ai.edu') || e.includes('devnet.com') || e.includes('example.com')) {
      return false;
    }
  }
  return true;
}

function mergePeerLists(existingList = [], newList = []) {
  const mergedMap = new Map();

  // Add existing local list first (filtering out wiped/test IDs)
  (existingList || []).filter(isPeerValid).forEach(p => {
    if (p && p.email) mergedMap.set(p.email.toLowerCase(), p);
    else if (p && p.id) mergedMap.set(p.id, p);
  });

  // Merge with server list (filtering out wiped/test IDs)
  (newList || []).filter(isPeerValid).forEach(p => {
    if (p && p.email) mergedMap.set(p.email.toLowerCase(), p);
    else if (p && p.id) mergedMap.set(p.id, p);
  });

  // Ensure current registered user is always present in network
  const user = InsigniaState.currentUser;
  if (user && user.isRegistered && user.email && !user.isGuest) {
    const userPeer = {
      id: user.id || ('usr_' + user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')),
      name: user.name,
      role: user.targetTitle || user.role || 'Software Engineer',
      targetCompany: user.targetCompany || 'Tech Enterprise',
      email: user.email,
      avatar: user.name ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2) : 'US',
      status: 'Active Account',
      skillsKnown: user.skillsKnown || [],
      skillsWanted: user.skillsWanted || [],
      bio: user.bio || ''
    };
    mergedMap.set(user.email.toLowerCase(), userPeer);
  }

  return Array.from(mergedMap.values());
}

function vanishAllProfiles() {
  InsigniaState.peerNetwork = [];
  const user = InsigniaState.currentUser;
  if (user && user.isRegistered && user.email && !user.isGuest) {
    InsigniaState.peerNetwork = mergePeerLists([], []);
  }
  saveState();
  syncAndRenderPeers();
  showToast('🧹 All test & stale profiles vanished! Network reset to active accounts.', 'info');
}
window.vanishAllProfiles = vanishAllProfiles;


const SUPABASE_PUBLIC_URL = 'https://vllflvfnuohxhnqbazct.supabase.co';
const SUPABASE_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbGZsdmZudW9oeGhucWJhemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NzY5ODAsImV4cCI6MjEwMDQ1Mjk4MH0.BadUiVFwwZ8-3361AA9Da2KoXlxrz4xPzzIjSWSSPpw';

async function fetchPeersDirectFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_PUBLIC_URL}/rest/v1/peers?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_PUBLIC_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLIC_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        const WIPED_IDS = [
          'usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_test',
          'usr_shankaragoudapatil0406_gmail_com',
          'usr_chetan_gmail_com',
          'usr_suhas_gmail_com',
          'usr_none_gmail_com'
        ];
        return rows
          .filter(p => p && p.id && !WIPED_IDS.includes(p.id) && !p.email.includes('tech.org') && !p.email.includes('backend.io') && !p.email.includes('ai.edu') && !p.email.includes('devnet.com'))
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
    }
  } catch (e) {
    console.warn('Direct Supabase fetch failed:', e);
  }
  return [];
}

async function postPeerDirectToSupabase(peerPayload) {
  try {
    const dbRow = {
      id: peerPayload.id || ('usr_' + (peerPayload.email || peerPayload.name).toLowerCase().replace(/[^a-z0-9]/g, '_')),
      name: peerPayload.name,
      role: peerPayload.role || 'Software Engineer',
      target_company: peerPayload.targetCompany || '',
      email: peerPayload.email,
      location: peerPayload.location || '',
      avatar: peerPayload.avatar || (peerPayload.name ? peerPayload.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2) : 'US'),
      status: peerPayload.status || 'Active for Skill Exchange',
      skills_known: JSON.stringify(peerPayload.skillsKnown || []),
      skills_wanted: JSON.stringify(peerPayload.skillsWanted || []),
      bio: peerPayload.bio || ''
    };

    await fetch(`${SUPABASE_PUBLIC_URL}/rest/v1/peers?on_conflict=email`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_PUBLIC_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify(dbRow)
    });
  } catch (e) {
    console.warn('Direct Supabase insert failed:', e);
  }
}

// Fetch shared peer network from server & Supabase and merge with local state
async function syncAndRenderPeers(silent = false) {
  let sharedPeers = [];

  // Try API route first
  try {
    const res = await fetch('/api/peers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) sharedPeers = data;
    }
  } catch (err) {}

  // Also fetch directly from Supabase for zero-delay multi-device sync
  const supaPeers = await fetchPeersDirectFromSupabase();
  if (supaPeers.length > 0) {
    sharedPeers = mergePeerLists(sharedPeers, supaPeers);
  }

  if (sharedPeers.length > 0) {
    InsigniaState.peerNetwork = mergePeerLists(InsigniaState.peerNetwork, sharedPeers);
    saveState();
  }

  matchAndRenderPeers();
}

function matchAndRenderPeers() {
  const user = InsigniaState.currentUser;
  const userKnown = (user.skillsKnown || []).map(s => s.toLowerCase());
  const userWanted = (user.skillsWanted || []).map(s => s.toLowerCase());

  // Tag peers including self (mark isSelf: true)
  const peers = (InsigniaState.peerNetwork || []).map(p => {
    const isSelf = Boolean(
      (user.email && p.email && p.email.toLowerCase() === user.email.toLowerCase()) ||
      (user.id && p.id && p.id === user.id)
    );
    return { ...p, isSelf };
  });

  const filterVal = document.getElementById('skill-match-filter')?.value || 'All';
  const queryVal = (document.getElementById('peer-search-input')?.value || '').toLowerCase();

  // Compute Match Details for each peer
  const matchedPeers = peers.map(peer => {
    if (peer.isSelf) {
      return {
        ...peer,
        theyCanTeachYou: [],
        youCanTeachThem: [],
        matchPercentage: 999, // Pin self to top
        matchType: 'Your Profile',
        badgeClass: 'badge-mutual'
      };
    }

    const peerKnown = (peer.skillsKnown || []).map(s => s.toLowerCase());
    const peerWanted = (peer.skillsWanted || []).map(s => s.toLowerCase());

    // Skills peer offers that user wants
    const theyCanTeachYou = (peer.skillsKnown || []).filter(s => 
      userWanted.some(w => s.toLowerCase().includes(w) || w.includes(s.toLowerCase()))
    );

    // Skills user offers that peer wants
    const youCanTeachThem = (peer.skillsWanted || []).filter(s => 
      userKnown.some(k => s.toLowerCase().includes(k) || k.includes(s.toLowerCase()))
    );

    let matchPercentage = 30;
    let matchType = 'General Peer';
    let badgeClass = 'badge-general';

    if (theyCanTeachYou.length > 0 && youCanTeachThem.length > 0) {
      matchPercentage = 100;
      matchType = 'Mutual Skill Exchange';
      badgeClass = 'badge-mutual';
    } else if (theyCanTeachYou.length > 0) {
      matchPercentage = 75;
      matchType = 'Offers What You Need';
      badgeClass = 'badge-high';
    } else if (youCanTeachThem.length > 0) {
      matchPercentage = 50;
      matchType = 'Needs Your Skills';
      badgeClass = 'badge-partial';
    }

    return {
      ...peer,
      theyCanTeachYou,
      youCanTeachThem,
      matchPercentage,
      matchType,
      badgeClass
    };
  });

  // Sort by highest match score (self is pinned to top)
  matchedPeers.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Apply Filter & Search Query
  let filtered = matchedPeers;
  if (filterVal === 'Mutual') {
    filtered = filtered.filter(p => p.isSelf || p.matchPercentage === 100);
  } else if (filterVal === 'High') {
    filtered = filtered.filter(p => p.isSelf || p.matchPercentage >= 75);
  }

  if (queryVal) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(queryVal) ||
      (p.role && p.role.toLowerCase().includes(queryVal)) ||
      (p.skillsKnown && p.skillsKnown.some(s => s.toLowerCase().includes(queryVal))) ||
      (p.skillsWanted && p.skillsWanted.some(s => s.toLowerCase().includes(queryVal)))
    );
  }

  renderPeerGrid(filtered);
}

function renderPeerGrid(peers) {
  const container = document.getElementById('peer-cards-container');
  if (!container) return;

  if (peers.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <i class="bi bi-person-x" style="font-size: 2.5rem; color: var(--text-dim);"></i>
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-top: 12px;">No Matching Peer Profiles Found</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Try updating your skill preferences or clear search filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = peers.map(p => `
    <div class="glass-card peer-match-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between; ${p.isSelf ? 'border: 2px solid var(--cyan); background: rgba(6,182,212,0.06);' : ''}">
      <div>
        <!-- Match Header Badge -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="match-score-pill ${p.isSelf ? 'badge-mutual' : p.badgeClass}">
            ${p.isSelf ? '⭐ YOU (Your Profile)' : p.matchPercentage === 100 ? '🔥 100% Mutual Match' : p.matchPercentage === 75 ? '⚡ 75% High Match' : p.matchPercentage === 50 ? '💡 50% Skill Match' : '🌐 30% Peer'}
          </div>
          <span style="font-size: 0.72rem; color: var(--emerald); font-weight: 700;">🟢 ${escapeHTML(p.status || 'Active Account')}</span>
        </div>

        <!-- User Avatar & Header -->
        <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 16px; cursor: pointer;" onclick="openPeerProfileModal('${p.id}')">
          <div class="peer-avatar-circle" style="${p.isSelf ? 'background: linear-gradient(135deg,var(--cyan),var(--purple)); color:#fff;' : ''}">
            ${escapeHTML(p.avatar || (p.name ? p.name.substring(0,2).toUpperCase() : 'US'))}
          </div>
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff;">
              ${escapeHTML(p.name)} ${p.isSelf ? '<span style="font-size:0.75rem; color:var(--cyan); font-weight:600;">(You)</span>' : ''}
            </h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(p.role || 'Job Seeker')} ${p.targetCompany ? `• Target: <strong style="color: var(--cyan);">${escapeHTML(p.targetCompany)}</strong>` : ''}</p>
          </div>
        </div>

        ${p.bio ? `
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px; font-style: italic; line-height: 1.4; cursor: pointer;" onclick="openPeerProfileModal('${p.id}')">
            "${escapeHTML(p.bio)}"
          </p>
        ` : ''}

        <!-- Skill Exchange Breakdown -->
        <div style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--glass-border);">
          
          <div style="margin-bottom: 10px;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--cyan); text-transform: uppercase; margin-bottom: 4px;">
              🎓 Skills Known / Offering:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${((p.theyCanTeachYou && p.theyCanTeachYou.length > 0) ? p.theyCanTeachYou : (p.skillsKnown || [])).map(s => `
                <span class="skill-pill-offer ${p.theyCanTeachYou && p.theyCanTeachYou.includes(s) ? 'highlight-match' : ''}">
                  ${escapeHTML(s)}
                </span>
              `).join('')}
            </div>
          </div>

          <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--purple); text-transform: uppercase; margin-bottom: 4px;">
              🧠 Skills Wanted / Learning:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${((p.youCanTeachThem && p.youCanTeachThem.length > 0) ? p.youCanTeachThem : (p.skillsWanted || [])).map(s => `
                <span class="skill-pill-want ${p.youCanTeachThem && p.youCanTeachThem.includes(s) ? 'highlight-match' : ''}">
                  ${escapeHTML(s)}
                </span>
              `).join('')}
            </div>
          </div>

        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        ${p.isSelf ? `
          <button class="btn-secondary trigger-auth-modal" style="flex: 1; font-size: 0.8rem; padding: 10px 12px;">
            <i class="bi bi-pencil-square" style="color:var(--cyan);"></i> Edit My Profile
          </button>
        ` : `
          <button class="btn-primary" style="flex: 1; font-size: 0.8rem; padding: 10px 12px;" onclick="proposeSkillExchange('${escapeHTML(p.name)}', '${p.id}', '${escapeHTML(p.email || '')}')">
            <i class="bi bi-arrow-repeat"></i> Propose
          </button>
          <button class="btn-secondary" style="font-size: 0.8rem; padding: 10px 12px;" title="Direct Message" onclick="sendMessagePeer('${escapeHTML(p.name)}', '${escapeHTML(p.email || '')}', '${p.id}')">
            <i class="bi bi-chat-dots-fill"></i>
          </button>
          <button class="btn-secondary" style="font-size: 0.8rem; padding: 10px 12px;" title="View Full Profile" onclick="openPeerProfileModal('${p.id}')">
            <i class="bi bi-eye-fill"></i>
          </button>
        `}
      </div>
    </div>
  `).join('');
}

function setupAddPeerModal() {
  const btnAdd = document.getElementById('btn-add-peer-modal');
  const modal = document.getElementById('add-peer-modal');
  const closeBtn = document.getElementById('close-peer-modal');
  const form = document.getElementById('form-add-peer');

  if (btnAdd && modal) {
    btnAdd.onclick = () => modal.classList.add('active');
  }

  if (closeBtn && modal) {
    closeBtn.onclick = () => modal.classList.remove('active');
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const name = document.getElementById('peer-add-name').value;
      const role = document.getElementById('peer-add-role').value;
      const targetCompany = document.getElementById('peer-add-target').value;
      const email = document.getElementById('peer-add-email').value;
      const skillsKnownStr = document.getElementById('peer-add-known').value;
      const skillsWantedStr = document.getElementById('peer-add-wanted').value;
      const bio = document.getElementById('peer-add-bio').value;

      const newPeer = {
        id: 'usr_' + Date.now(),
        name,
        role,
        targetCompany,
        email,
        avatar: name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2),
        status: 'Active Account',
        skillsKnown: skillsKnownStr.split(',').map(s => s.trim()).filter(Boolean),
        skillsWanted: skillsWantedStr.split(',').map(s => s.trim()).filter(Boolean),
        bio
      };

      await broadcastAccountToServer(newPeer);
      await syncAndRenderPeers();

      if (modal) modal.classList.remove('active');
      form.reset();

      showToast(`Real Account "${name}" Broadcasted & Synced Across All Devices!`, 'success');
    };
  }
}

// Broadcast an account profile to the shared network server
async function broadcastAccountToServer(accountObj) {
  const user = accountObj || InsigniaState.currentUser;
  if (!user || !user.name) return;

  const knownList = (Array.isArray(user.skillsKnown) && user.skillsKnown.length > 0)
    ? user.skillsKnown 
    : (typeof user.skills === 'string' ? user.skills.split(',').map(s => s.trim()).filter(Boolean) : (user.skills || ['React.js', 'JavaScript']));

  const wantedList = (Array.isArray(user.skillsWanted) && user.skillsWanted.length > 0)
    ? user.skillsWanted 
    : ['System Design', 'Python', 'Node.js'];

  const peerPayload = {
    id: user.id || ('usr_' + (user.email || user.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_')),
    name: user.name,
    role: user.targetTitle || user.role || 'Software Engineer',
    targetCompany: user.targetCompany || 'Tech Enterprise',
    email: user.email || `${user.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
    avatar: user.name ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2) : 'US',
    status: 'Active Account',
    skillsKnown: knownList,
    skillsWanted: wantedList,
    bio: user.bio || 'Active job seeker on Insignia'
  };

  // Immediately merge payload into local state so it renders instantly & never disappears
  InsigniaState.peerNetwork = mergePeerLists(InsigniaState.peerNetwork, [peerPayload]);
  saveState();
  if (typeof matchAndRenderPeers === 'function') {
    matchAndRenderPeers();
  }

  // Write directly to Supabase from browser for instant zero-delay sync across all devices
  await postPeerDirectToSupabase(peerPayload);

  try {
    const res = await fetch('/api/peers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(peerPayload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.peers && Array.isArray(data.peers)) {
        InsigniaState.peerNetwork = mergePeerLists(InsigniaState.peerNetwork, data.peers);
        saveState();
        if (typeof matchAndRenderPeers === 'function') {
          matchAndRenderPeers();
        }
      }
    }
  } catch (err) {
    console.warn('Failed to broadcast profile to server:', err);
  }
}

window.broadcastAccountToServer = broadcastAccountToServer;

// ─── PROPOSE EXCHANGE MODAL ────────────────────────────────────────────────
let currentProposalTarget = null;

window.proposeSkillExchange = function(name, id, email) {
  const user = InsigniaState.currentUser;
  if (!user.email || user.isGuest) {
    showToast('Please register your profile name & email first to send an exchange proposal!', 'warning');
    document.getElementById('auth-modal')?.classList.add('active');
    return;
  }

  const targetEmail = (email && email.trim()) ? email.trim() : `${(name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

  currentProposalTarget = { name, id, email: targetEmail };

  const modal = document.getElementById('propose-exchange-modal');
  const toName = document.getElementById('proposal-to-name');
  const msgInput = document.getElementById('proposal-message');

  if (toName) toName.textContent = name;
  if (msgInput) {
    msgInput.value = `Hi ${name}, I'd love to do a skill exchange with you! I can help you with ${(user.skillsKnown || []).slice(0,2).join(', ') || 'my skills'} and I'd love to learn ${(user.skillsWanted || []).slice(0,2).join(', ') || 'from you'}. Let's connect!`;
  }

  modal?.classList.add('active');
};

async function submitExchangeProposal() {
  const user = InsigniaState.currentUser;
  const msgInput = document.getElementById('proposal-message');
  const message = msgInput ? msgInput.value.trim() : '';

  if (!message) {
    showToast('Please write a message for your proposal.', 'warning');
    return;
  }
  if (!currentProposalTarget) return;

  const proposal = {
    fromName: user.name,
    fromEmail: user.email,
    fromPeerId: user.id || ('usr_' + user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')),
    fromAvatar: user.name ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2) : 'US',
    fromSkillsKnown: user.skillsKnown || [],
    fromSkillsWanted: user.skillsWanted || [],
    toName: currentProposalTarget.name,
    toEmail: currentProposalTarget.email,
    toPeerId: currentProposalTarget.id,
    message
  };

  const btn = document.getElementById('btn-send-proposal');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

  try {
    const res = await fetch('/api/exchanges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposal)
    });

    if (res.status === 409) {
      showToast('You already have a pending proposal with this user!', 'warning');
    } else if (res.ok) {
      showToast(`✅ Proposal sent to ${currentProposalTarget.name}!`, 'success');
      document.getElementById('propose-exchange-modal')?.classList.remove('active');
      loadInbox();
    } else {
      showToast('Failed to send proposal. Try again.', 'warning');
    }
  } catch (err) {
    showToast('Server offline. Could not send proposal.', 'warning');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Proposal'; }
  }
}

// ─── INBOX ─────────────────────────────────────────────────────────────────
let activeInboxTab = 'all';
let currentInboxExchanges = [];

window.switchInboxAccount = function(email) {
  if (!email) return;
  const nameMap = {
    'alex.morgan@gmail.com': { name: 'Alex Morgan', role: 'Frontend Engineer', skillsKnown: ['React.js', 'JavaScript', 'CSS3'], skillsWanted: ['Node.js', 'System Design'] },
    'sarah.chen@gmail.com': { name: 'Sarah Chen', role: 'Backend Engineer', skillsKnown: ['Node.js', 'Python', 'Docker'], skillsWanted: ['React.js', 'GraphQL'] },
    'dev.patel@gmail.com': { name: 'Dev Patel', role: 'Full Stack Engineer', skillsKnown: ['TypeScript', 'GraphQL', 'Next.js'], skillsWanted: ['Kubernetes', 'AWS'] },
    'elena.rostova@gmail.com': { name: 'Elena Rostova', role: 'Data Scientist', skillsKnown: ['Python', 'PyTorch', 'SQL'], skillsWanted: ['React.js', 'System Design'] }
  };

  const profile = nameMap[email.toLowerCase()] || { name: email.split('@')[0], role: 'Software Engineer', skillsKnown: ['JavaScript'], skillsWanted: ['Python'] };

  InsigniaState.currentUser.email = email;
  InsigniaState.currentUser.name = profile.name;
  InsigniaState.currentUser.role = profile.role;
  InsigniaState.currentUser.targetTitle = profile.role;
  InsigniaState.currentUser.skillsKnown = profile.skillsKnown;
  InsigniaState.currentUser.skillsWanted = profile.skillsWanted;
  InsigniaState.currentUser.isGuest = false;
  InsigniaState.currentUser.isRegistered = true;
  InsigniaState.currentUser.id = 'usr_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');

  saveState();
  if (typeof updateUserUI === 'function') updateUserUI();
  if (typeof broadcastAccountToServer === 'function') broadcastAccountToServer(InsigniaState.currentUser);

  showToast(`Switched view to account: ${profile.name}`, 'info');
  loadInbox();
};

window.filterInboxTab = function(tab) {
  activeInboxTab = tab;
  document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
    const isTarget = btn.dataset.tab === tab;
    btn.style.background = isTarget ? 'var(--primary)' : 'transparent';
    btn.style.color = isTarget ? '#fff' : 'var(--text-muted)';
  });
  renderInbox(currentInboxExchanges);
};

async function loadInbox() {
  const user = InsigniaState.currentUser;
  const container = document.getElementById('inbox-list');

  // Auto-fill active account dropdown if present
  const selectEl = document.getElementById('inbox-user-select');
  if (selectEl && user && user.email) {
    const matched = Array.from(selectEl.options).some(o => o.value === user.email);
    if (matched) selectEl.value = user.email;
  }

  if (!user || !user.email) {
    const badge = document.getElementById('inbox-badge');
    if (badge) badge.style.display = 'none';
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
          <i class="bi bi-person-lock" style="font-size: 2.5rem; display:block; margin-bottom:12px; color: var(--amber);"></i>
          <h4 style="font-size: 0.95rem; font-weight:700; color: #fff; margin-bottom: 6px;">Profile Setup Required</h4>
          <p style="font-size:0.82rem; margin-bottom:16px;">Set up your profile email to send and receive skill exchange proposals.</p>
          <button class="btn-primary" style="font-size:0.8rem; padding:8px 16px;" onclick="switchInboxAccount('alex.morgan@gmail.com')">
            <i class="bi bi-person-check-fill"></i> Quick Login as Alex Morgan
          </button>
        </div>`;
    }
    return;
  }

  try {
    const peerIdQuery = user.id ? `&peerId=${encodeURIComponent(user.id)}` : '';
    const res = await fetch(`/api/exchanges?email=${encodeURIComponent(user.email)}${peerIdQuery}`);
    if (!res.ok) return;
    const exchanges = await res.json();
    currentInboxExchanges = exchanges;

    const userLowerEmail = (user.email || '').toLowerCase().trim();
    const pendingReceived = exchanges.filter(e => {
      const isToMe = (e.toEmail && e.toEmail.toLowerCase().trim() === userLowerEmail) || (user.id && e.toPeerId === user.id);
      return isToMe && e.status === 'pending';
    });

    const badge = document.getElementById('inbox-badge');
    if (badge) {
      badge.textContent = pendingReceived.length;
      badge.style.display = pendingReceived.length > 0 ? 'flex' : 'none';
    }

    renderInbox(exchanges);
  } catch (err) {
    console.warn('Inbox fetch failed:', err);
  }
}

function renderInbox(exchanges) {
  const container = document.getElementById('inbox-list');
  if (!container) return;

  const user = InsigniaState.currentUser;
  const userLowerEmail = (user.email || '').toLowerCase().trim();

  let list = exchanges || [];
  if (activeInboxTab === 'received') {
    list = list.filter(e => (e.toEmail && e.toEmail.toLowerCase().trim() === userLowerEmail) || (user.id && e.toPeerId === user.id));
  } else if (activeInboxTab === 'sent') {
    list = list.filter(e => (e.fromEmail && e.fromEmail.toLowerCase().trim() === userLowerEmail) || (user.id && e.fromPeerId === user.id));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <i class="bi bi-inbox" style="font-size: 2.5rem; display:block; margin-bottom:12px;"></i>
        <p style="font-size:0.88rem;">No ${activeInboxTab === 'received' ? 'received' : activeInboxTab === 'sent' ? 'sent' : ''} proposals found.<br>Propose an exchange in Skill Connect!</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(e => {
    const isIncoming = (e.toEmail && e.toEmail.toLowerCase().trim() === userLowerEmail) || (user.id && e.toPeerId === user.id);
    const otherName = isIncoming ? e.fromName : e.toName;
    const otherAvatar = isIncoming ? (e.fromAvatar || e.fromName?.substring(0,2).toUpperCase()) : (e.toAvatar || e.toName?.substring(0,2).toUpperCase());
    const statusColor = e.status === 'accepted' ? 'var(--emerald)' : e.status === 'declined' ? '#ef4444' : 'var(--amber, #f59e0b)';
    const statusLabel = e.status === 'accepted' ? '✅ Accepted' : e.status === 'declined' ? '❌ Declined' : '⏳ Pending';
    const dateStr = new Date(e.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

    return `
      <div class="glass-card" style="padding: 16px; margin-bottom: 14px; border-left: 3px solid ${statusColor};">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div class="peer-avatar-circle" style="width:38px; height:38px; font-size:0.85rem; flex-shrink:0;">${escapeHTML(otherAvatar || '??')}</div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
              <div>
                <span style="font-size:0.92rem; font-weight:800; color:#fff;">${escapeHTML(otherName)}</span>
                <span style="font-size:0.72rem; color:var(--text-dim); margin-left:6px;">${isIncoming ? '→ You' : 'You →'}</span>
              </div>
              <span style="font-size:0.72rem; font-weight:700; color:${statusColor};">${statusLabel}</span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted); font-style:italic; margin-bottom:10px; line-height:1.5;">"${escapeHTML(e.message)}"</p>
            <div style="font-size:0.7rem; color:var(--text-dim); margin-bottom:${isIncoming && e.status === 'pending' ? '10px' : '0'};">${dateStr}</div>
            ${isIncoming && e.status === 'pending' ? `
              <div style="display:flex; gap:8px;">
                <button class="btn-primary" style="flex:1; font-size:0.78rem; padding:7px 10px; background: linear-gradient(135deg,#10b981,#059669);" onclick="respondToExchange('${e.id}','accepted')">
                  <i class="bi bi-check-circle-fill"></i> Accept
                </button>
                <button class="btn-secondary" style="flex:1; font-size:0.78rem; padding:7px 10px; border-color:#ef4444; color:#ef4444;" onclick="respondToExchange('${e.id}','declined')">
                  <i class="bi bi-x-circle-fill"></i> Decline
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.respondToExchange = async function(id, status) {
  try {
    const res = await fetch(`/api/exchanges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(status === 'accepted' ? '🤝 Exchange Accepted!' : 'Exchange Declined.', status === 'accepted' ? 'success' : 'info');
      loadInbox();
    }
  } catch (err) {
    showToast('Failed to respond. Try again.', 'warning');
  }
};

// Expose as globals so the inline script in index.html can call them
window.submitExchangeProposal = submitExchangeProposal;
window.loadInbox = loadInbox;

let currentChatPeer = null;

window.sendMessagePeer = function(name, email, peerId) {
  const user = InsigniaState.currentUser;
  if (!user || !user.email || user.isGuest) {
    showToast('Please register your profile first to send messages to peers!', 'warning');
    document.getElementById('auth-modal')?.classList.add('active');
    return;
  }

  currentChatPeer = { name, email, id: peerId };
  const modal = document.getElementById('peer-direct-chat-modal');
  const titleName = document.getElementById('chat-peer-name');
  if (titleName) titleName.textContent = name;

  renderChatMessages(peerId);
  modal?.classList.add('active');
};

function renderChatMessages(peerId) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  InsigniaState.peerMessages = InsigniaState.peerMessages || {};
  const msgs = InsigniaState.peerMessages[peerId] || [
    { sender: 'peer', text: `Hi! Thanks for connecting with me on Skill Connect. What skills would you like to practice together?`, time: 'Just now' }
  ];
  InsigniaState.peerMessages[peerId] = msgs;
  saveState();

  container.innerHTML = msgs.map(m => `
    <div style="display: flex; justify-content: ${m.sender === 'you' ? 'flex-end' : 'flex-start'}; margin-bottom: 10px;">
      <div style="max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 0.84rem; line-height: 1.4; ${m.sender === 'you' ? 'background: linear-gradient(135deg, var(--cyan), #0284c7); color: #fff;' : 'background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: #fff;'}">
        <div>${escapeHTML(m.text)}</div>
        <div style="font-size: 0.68rem; opacity: 0.7; text-align: right; margin-top: 4px;">${escapeHTML(m.time)}</div>
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

window.sendDirectChatMessage = function() {
  const input = document.getElementById('chat-message-input');
  if (!input || !currentChatPeer) return;
  const text = input.value.trim();
  if (!text) return;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  InsigniaState.peerMessages = InsigniaState.peerMessages || {};
  InsigniaState.peerMessages[currentChatPeer.id] = InsigniaState.peerMessages[currentChatPeer.id] || [];
  InsigniaState.peerMessages[currentChatPeer.id].push({ sender: 'you', text, time: timeStr });
  saveState();

  input.value = '';
  renderChatMessages(currentChatPeer.id);

  // Auto response simulation
  setTimeout(() => {
    if (currentChatPeer) {
      const peerReplies = [
        `Awesome! I am active and ready for a skill exchange. Let's schedule a mock session soon!`,
        `That sounds great. I've seen your profile skills and I'm looking forward to learning from you!`,
        `Got it! Feel free to send me an exchange proposal in Skill Connect so we can track our practice.`
      ];
      const randomReply = peerReplies[Math.floor(Math.random() * peerReplies.length)];
      InsigniaState.peerMessages[currentChatPeer.id].push({ sender: 'peer', text: randomReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      saveState();
      renderChatMessages(currentChatPeer.id);
    }
  }, 1200);
};

window.openPeerProfileModal = function(peerId) {
  const user = InsigniaState.currentUser;
  let peer = null;

  if (user && (user.id === peerId || peerId === 'self')) {
    peer = {
      id: user.id || 'self',
      name: user.name,
      role: user.targetTitle || user.role || 'Software Engineer',
      targetCompany: user.targetCompany || 'Tech Enterprise',
      email: user.email || 'Registered User',
      location: user.location || 'Remote',
      avatar: user.name ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2) : 'US',
      status: 'Active Account (You)',
      skillsKnown: user.skillsKnown || [],
      skillsWanted: user.skillsWanted || [],
      bio: user.bio || 'Active job seeker on Insignia'
    };
  } else {
    peer = (InsigniaState.peerNetwork || []).find(p => p.id === peerId);
  }

  if (!peer) {
    showToast('Profile details not found', 'warning');
    return;
  }

  const modal = document.getElementById('peer-details-modal');
  if (!modal) return;

  const avatarEl = document.getElementById('modal-peer-avatar');
  const nameEl = document.getElementById('modal-peer-name');
  const roleEl = document.getElementById('modal-peer-role');
  const statusEl = document.getElementById('modal-peer-status');
  const emailEl = document.getElementById('modal-peer-email');
  const locationEl = document.getElementById('modal-peer-location');
  const bioEl = document.getElementById('modal-peer-bio');

  if (avatarEl) avatarEl.textContent = peer.avatar || peer.name.substring(0,2).toUpperCase();
  if (nameEl) nameEl.textContent = peer.name;
  if (roleEl) roleEl.textContent = `${peer.role} ${peer.targetCompany ? '• ' + peer.targetCompany : ''}`;
  if (statusEl) statusEl.textContent = `🟢 ${peer.status || 'Active for Exchange'}`;
  if (emailEl) emailEl.textContent = peer.email || 'Hidden Email';
  if (locationEl) locationEl.textContent = peer.location || 'Remote / Worldwide';
  if (bioEl) bioEl.textContent = peer.bio ? `"${peer.bio}"` : 'No bio provided yet.';

  const knownContainer = document.getElementById('modal-peer-known');
  if (knownContainer) {
    knownContainer.innerHTML = (peer.skillsKnown && peer.skillsKnown.length > 0)
      ? peer.skillsKnown.map(s => `<span class="skill-pill-offer">${escapeHTML(s)}</span>`).join('')
      : '<span style="color:var(--text-muted); font-size:0.8rem;">No skills specified</span>';
  }

  const wantedContainer = document.getElementById('modal-peer-wanted');
  if (wantedContainer) {
    wantedContainer.innerHTML = (peer.skillsWanted && peer.skillsWanted.length > 0)
      ? peer.skillsWanted.map(s => `<span class="skill-pill-want">${escapeHTML(s)}</span>`).join('')
      : '<span style="color:var(--text-muted); font-size:0.8rem;">No skills specified</span>';
  }

  const actionsContainer = document.getElementById('modal-peer-actions');
  if (actionsContainer) {
    const isSelf = user && user.email && peer.email && (user.email.toLowerCase() === peer.email.toLowerCase());
    if (isSelf) {
      actionsContainer.innerHTML = `
        <button class="btn-secondary trigger-auth-modal" style="width:100%; font-size:0.84rem; padding:10px;" onclick="document.getElementById('peer-details-modal')?.classList.remove('active');">
          <i class="bi bi-pencil-square"></i> Edit My Profile
        </button>`;
    } else {
      actionsContainer.innerHTML = `
        <button class="btn-primary" style="flex:1; font-size:0.84rem; padding:10px;" onclick="document.getElementById('peer-details-modal')?.classList.remove('active'); proposeSkillExchange('${escapeHTML(peer.name)}', '${peer.id}', '${escapeHTML(peer.email || '')}');">
          <i class="bi bi-arrow-repeat"></i> Propose Exchange
        </button>
        <button class="btn-secondary" style="flex:1; font-size:0.84rem; padding:10px;" onclick="document.getElementById('peer-details-modal')?.classList.remove('active'); sendMessagePeer('${escapeHTML(peer.name)}', '${escapeHTML(peer.email || '')}', '${peer.id}');">
          <i class="bi bi-chat-dots-fill"></i> Direct Message
        </button>`;
    }
  }

  modal.classList.add('active');
};

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

