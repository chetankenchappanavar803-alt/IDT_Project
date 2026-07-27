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

// Fetch shared peer network from server
async function syncAndRenderPeers(silent = false) {
  try {
    const res = await fetch('/api/peers');
    if (res.ok) {
      const sharedPeers = await res.json();
      InsigniaState.peerNetwork = sharedPeers;
      saveState();
    }
  } catch (err) {
    console.warn('Network sync offline, using local state:', err);
  }

  matchAndRenderPeers();
}

function matchAndRenderPeers() {
  const user = InsigniaState.currentUser;
  const userKnown = (user.skillsKnown || []).map(s => s.toLowerCase());
  const userWanted = (user.skillsWanted || []).map(s => s.toLowerCase());

  // Filter out self if present in peer list (match by email or id)
  const peers = (InsigniaState.peerNetwork || []).filter(p => {
    if (user.email && p.email && p.email === user.email) return false;
    if (user.id && p.id && p.id === user.id) return false;
    return true;
  });

  const filterVal = document.getElementById('skill-match-filter')?.value || 'All';
  const queryVal = (document.getElementById('peer-search-input')?.value || '').toLowerCase();

  // Compute Match Details for each peer
  const matchedPeers = peers.map(peer => {
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

  // Sort by highest match score
  matchedPeers.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Apply Filter & Search Query
  let filtered = matchedPeers;
  if (filterVal === 'Mutual') {
    filtered = filtered.filter(p => p.matchPercentage === 100);
  } else if (filterVal === 'High') {
    filtered = filtered.filter(p => p.matchPercentage >= 75);
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
    <div class="glass-card peer-match-card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Match Header Badge -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="match-score-pill ${p.badgeClass}">
            ${p.matchPercentage === 100 ? '🔥 100% Mutual Match' : p.matchPercentage === 75 ? '⚡ 75% High Match' : p.matchPercentage === 50 ? '💡 50% Skill Match' : '🌐 30% Peer'}
          </div>
          <span style="font-size: 0.72rem; color: var(--emerald); font-weight: 700;">🟢 ${escapeHTML(p.status || 'Active Account')}</span>
        </div>

        <!-- User Avatar & Header -->
        <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 16px;">
          <div class="peer-avatar-circle">
            ${escapeHTML(p.avatar || p.name.substring(0,2).toUpperCase())}
          </div>
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: #fff;">${escapeHTML(p.name)}</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(p.role || 'Job Seeker')} ${p.targetCompany ? `• Target: <strong style="color: var(--cyan);">${escapeHTML(p.targetCompany)}</strong>` : ''}</p>
          </div>
        </div>

        ${p.bio ? `
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px; font-style: italic; line-height: 1.4;">
            "${escapeHTML(p.bio)}"
          </p>
        ` : ''}

        <!-- Skill Exchange Breakdown -->
        <div style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--glass-border);">
          
          <div style="margin-bottom: 10px;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--cyan); text-transform: uppercase; margin-bottom: 4px;">
              🎓 They Can Teach You (Skills They Know):
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
              🧠 You Can Teach Them (Skills They Want):
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
        <button class="btn-primary" style="flex: 1; font-size: 0.8rem; padding: 10px 12px;" onclick="proposeSkillExchange('${escapeHTML(p.name)}', '${p.id}', '${escapeHTML(p.email || '')}')">
          <i class="bi bi-arrow-repeat"></i> Propose Exchange
        </button>
        <button class="btn-secondary" style="font-size: 0.8rem; padding: 10px 12px;" onclick="sendMessagePeer('${escapeHTML(p.name)}')">
          <i class="bi bi-chat-dots-fill"></i>
        </button>
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

  try {
    const res = await fetch('/api/peers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(peerPayload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.peers && Array.isArray(data.peers)) {
        InsigniaState.peerNetwork = data.peers;
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
  if (!user.isRegistered || !user.email) {
    showToast('Please register your profile first to send an exchange proposal!', 'warning');
    document.getElementById('auth-modal')?.classList.add('active');
    return;
  }

  currentProposalTarget = { name, id, email };

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
    const data = await res.json();

    if (res.status === 409) {
      showToast('You already have a pending proposal with this user!', 'warning');
    } else if (res.ok) {
      showToast(`✅ Proposal sent to ${currentProposalTarget.name}!`, 'success');
      document.getElementById('propose-exchange-modal')?.classList.remove('active');
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
let inboxPollTimer = null;

async function loadInbox() {
  const user = InsigniaState.currentUser;
  if (!user.isRegistered || !user.email) return;

  try {
    const res = await fetch(`/api/exchanges?email=${encodeURIComponent(user.email)}`);
    if (!res.ok) return;
    const exchanges = await res.json();

    const pendingReceived = exchanges.filter(e => e.toEmail === user.email && e.status === 'pending');
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

  if (exchanges.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <i class="bi bi-inbox" style="font-size: 2.5rem; display:block; margin-bottom:12px;"></i>
        <p style="font-size:0.88rem;">No exchange proposals yet.<br>Propose an exchange in Skill Connect!</p>
      </div>`;
    return;
  }

  container.innerHTML = exchanges.map(e => {
    const isIncoming = e.toEmail === user.email;
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

window.sendMessagePeer = function(name) {
  showToast(`Message feature coming soon — use Propose Exchange to connect with ${name}!`, 'info');
};

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
