/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * AI Interview Q&A Generator – Powered by Gemini AI
 */

window.InsigniaViews = window.InsigniaViews || {};

// Fallback static question bank (used when no API key is set)
const QUESTION_BANK = [
  {
    id: 1, role: 'Frontend Developer', level: 'Mid-Level', type: 'Technical', category: 'tech',
    question: 'How does the Virtual DOM work in React, and how does Reconciliation optimize rendering performance?',
    answer: 'The Virtual DOM (VDOM) is a lightweight in-memory representation of the real DOM. When component state changes, React creates a new VDOM tree and compares it with the previous using a diffing algorithm (Reconciliation).\n\nKey points:\n- O(n) Diffing Algorithm comparing root elements and key attributes\n- Key Prop Usage to track list items across re-renders\n- Batching Updates into a single re-render cycle\n- React 18 Concurrent Mode for interruptible rendering',
    tips: 'Mention fiber architecture, keys in lists, and React 18 automatic batching.'
  },
  {
    id: 2, role: 'Software Engineer', level: 'Senior', type: 'System Design', category: 'tech',
    question: 'How would you design a rate limiter for a high-traffic microservices API?',
    answer: 'Core Architecture:\n1. Algorithm: Token Bucket or Sliding Window Log (Token Bucket handles burst traffic best)\n2. Storage: Redis with atomic INCR/EXPIRE or Lua scripts\n3. Location: API Gateway level (Kong/Nginx) before downstream services\n4. Response: HTTP 429 with Retry-After and X-RateLimit headers\n5. Distributed: Consistent hashing across Redis cluster for multi-node setups',
    tips: 'Discuss distributed Redis locking, fallback gracefully, and edge CDN integration.'
  },
  {
    id: 3, role: 'Software Engineer', level: 'Mid-Level', type: 'Behavioral', category: 'behavioral',
    question: 'Describe a situation where you had to learn a new technology very quickly to deliver a project.',
    answer: 'Use the STAR Method:\n- Situation: Project required migrating from REST to GraphQL in 2 weeks\n- Task: Learn GraphQL schema design, resolvers, and N+1 problem solutions\n- Action: Used official docs, built a proof-of-concept, pair-programmed with senior engineer, set up DataLoader for batching\n- Result: Delivered on time with 40% reduction in API payload size',
    tips: 'Show learning agility, resourcefulness, and ability to deliver under pressure.'
  },
  {
    id: 4, role: 'Data Scientist', level: 'Mid-Level', type: 'Technical', category: 'tech',
    question: 'Explain the difference between L1 (Lasso) and L2 (Ridge) Regularization and when to use each.',
    answer: 'Regularization prevents overfitting by adding a penalty to the loss function:\n\n- L1 (Lasso): Adds |w| penalty → shrinks coefficients to zero → performs feature selection\n- L2 (Ridge): Adds w² penalty → shrinks all coefficients proportionally → keeps all features\n- Elastic Net: Combines both (best of both worlds)\n\nUse L1 for sparse features/feature selection. Use L2 when all features matter and they are correlated.',
    tips: 'Highlight the geometric interpretation: L1 creates sparse solutions at corners of the constraint region.'
  },
  {
    id: 5, role: 'Software Engineer', level: 'Entry-Level', type: 'HR', category: 'hr',
    question: 'Why do you want to join our engineering team, and where do you see yourself in 3 years?',
    answer: 'Structure your answer around:\n1. Company research: Mention specific products, engineering blog posts, or tech stack that excites you\n2. Growth alignment: Connect their scale challenges to your learning goals\n3. Contribution: What unique value you bring in the first 90 days\n4. 3-year vision: Technical depth + mentoring others + architecture ownership',
    tips: 'Research the company thoroughly. Reference specific teams, products, or engineering challenges.'
  }
];

let currentQuestions = [...QUESTION_BANK];

window.InsigniaViews.qna = function renderQnAView() {
  setupQnAFilters();
  renderQnACards(currentQuestions);
  updateAIStatusBanner();
};

function getGeminiKey() {
  return localStorage.getItem('gemini_api_key') || 'SERVER_AI_ACTIVE';
}
window.getGeminiKey = getGeminiKey;

function updateAIStatusBanner() {
  const banner = document.getElementById('qna-ai-banner');
  if (!banner) return;
  banner.innerHTML = `<i class="bi bi-stars" style="color:var(--cyan);"></i> <strong>Gemini AI Active</strong> — Click "Generate AI Questions" for real-time personalized questions`;
}

async function generateQnAQuestions() {
  const roleVal  = document.getElementById('qna-role-select')?.value  || 'All';
  const levelVal = document.getElementById('qna-level-select')?.value || 'Mid-Level';
  const typeVal  = document.getElementById('qna-type-select')?.value  || 'All';
  const btnGenerate = document.getElementById('btn-generate-qna');

  if (btnGenerate) {
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating with Gemini AI…';
  }
  showLoadingCards();

  try {
    const role = roleVal === 'All' ? 'Software Engineer' : roleVal;
    if (window.AI && typeof window.AI.generateQnA === 'function') {
      const questions = await window.AI.generateQnA({ role, level: levelVal, type: typeVal, count: 6 });
      if (Array.isArray(questions) && questions.length > 0) {
        currentQuestions = questions;
        renderQnACards(currentQuestions);
        showToast(`✨ ${questions.length} AI questions generated for ${role} (${levelVal})`, 'success');
        return;
      }
    }

    // Fallback to filtering static bank
    let filtered = QUESTION_BANK;
    if (roleVal !== 'All') filtered = filtered.filter(q => q.role.toLowerCase().includes(roleVal.toLowerCase()));
    if (typeVal !== 'All') filtered = filtered.filter(q => q.type.toLowerCase() === typeVal.toLowerCase());
    currentQuestions = filtered.length > 0 ? filtered : QUESTION_BANK;
    renderQnACards(currentQuestions);
    showToast(`Showing ${currentQuestions.length} role-specific interview questions.`, 'info');
  } catch (err) {
    console.error('QnA generation failed:', err);
    let filtered = QUESTION_BANK;
    if (roleVal !== 'All') filtered = filtered.filter(q => q.role.toLowerCase().includes(roleVal.toLowerCase()));
    if (typeVal !== 'All') filtered = filtered.filter(q => q.type.toLowerCase() === typeVal.toLowerCase());
    currentQuestions = filtered.length > 0 ? filtered : QUESTION_BANK;
    renderQnACards(currentQuestions);
    showToast('Showing sample role questions.', 'info');
  } finally {
    if (btnGenerate) {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = '<i class="bi bi-stars"></i> Generate AI Questions';
    }
  }
}
window.generateQnAQuestions = generateQnAQuestions;

function setupQnAFilters() {
  const btnGenerate = document.getElementById('btn-generate-qna');
  if (btnGenerate) {
    btnGenerate.onclick = generateQnAQuestions;
  }
}

function showLoadingCards() {
  const container = document.getElementById('qna-cards-container');
  if (!container) return;
  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="glass-card qna-card" style="animation: pulse 1.5s ease-in-out infinite;">
      <div style="height:14px; background:rgba(255,255,255,0.06); border-radius:8px; width:40%; margin-bottom:16px;"></div>
      <div style="height:20px; background:rgba(255,255,255,0.06); border-radius:8px; width:90%; margin-bottom:10px;"></div>
      <div style="height:20px; background:rgba(255,255,255,0.04); border-radius:8px; width:70%;"></div>
      <div style="margin-top:16px; display:flex; gap:8px; align-items:center;">
        <i class="bi bi-stars" style="color:var(--cyan); animation: spin 1s linear infinite;"></i>
        <span style="color:var(--text-muted); font-size:0.82rem;">Gemini AI is generating personalized questions…</span>
      </div>
    </div>
  `).join('');
}

function renderQnACards(questions) {
  const container = document.getElementById('qna-cards-container');
  if (!container) return;

  if (!questions || questions.length === 0) {
    container.innerHTML = `<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:40px;">
      <i class="bi bi-chat-square-x" style="font-size:2.5rem;color:var(--text-dim);"></i>
      <h4 style="margin-top:12px;">No questions found</h4>
      <p style="color:var(--text-muted);font-size:0.85rem;">Try changing filters or generate new AI questions.</p>
    </div>`;
    return;
  }

  container.innerHTML = questions.map((q, idx) => {
    const cat = q.category || (q.type?.toLowerCase().includes('behavioral') ? 'behavioral' : q.type?.toLowerCase().includes('hr') ? 'hr' : 'tech');
    return `
    <div class="glass-card qna-card">
      <div class="qna-card-header">
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge-tag ${cat}">${q.type || 'Technical'}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${q.role || ''} ${q.level ? '• ' + q.level : ''}</span>
        </div>
        <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="bookmarkQuestion(${q.id || idx})">
          <i class="bi bi-bookmark"></i> Save
        </button>
      </div>

      <div class="qna-question-text">Q${idx + 1}: ${escapeQnAText(q.question)}</div>

      <div style="display: flex; gap: 12px; margin-top: 12px;">
        <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="toggleAnswer('${q.id || idx}')">
          <i class="bi bi-lightbulb-fill" style="color: var(--amber);"></i> Reveal AI Model Answer
        </button>
      </div>

      <div id="answer-box-${q.id || idx}" class="answer-box">
        <div style="font-weight: 700; color: var(--cyan); margin-bottom: 6px; font-size: 0.88rem;">
          🤖 Gemini AI Model Answer:
        </div>
        <div style="white-space: pre-line; font-size: 0.9rem; color: var(--text-main); line-height: 1.7;">
          ${escapeQnAText(q.answer || '')}
        </div>
        ${q.tips ? `
          <div style="margin-top: 10px; padding: 10px; border-top: 1px solid var(--glass-border); font-size: 0.8rem; color: var(--text-muted); background: rgba(6,182,212,0.05); border-radius: 8px;">
            💡 <strong>Interviewer Tip:</strong> ${escapeQnAText(q.tips)}
          </div>
        ` : ''}

        ${q.keyPoints ? `
          <div style="margin-top:10px;">
            <div style="font-size:0.78rem;font-weight:700;color:var(--purple);margin-bottom:6px;">📌 Key Points:</div>
            <ul style="padding-left:18px;font-size:0.84rem;color:var(--text-main);line-height:1.8;">
              ${q.keyPoints.map(k => `<li>${escapeQnAText(k)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="margin-top: 14px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Practice Your Response:</label>
          <textarea class="form-control" style="min-height: 70px; margin-top: 6px; font-size: 0.85rem;" placeholder="Type your answer here to test yourself..." id="practice-${q.id || idx}"></textarea>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
            <button class="btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;" onclick="markPracticed(${q.id || idx})">
              <i class="bi bi-check2-circle" style="color: var(--emerald);"></i> Mark Practiced
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.toggleAnswer = function(id) {
  const box = document.getElementById(`answer-box-${id}`);
  if (box) box.classList.toggle('visible');
};

window.markPracticed = function(id) {
  InsigniaState.stats.qnaPracticed += 1;
  InsigniaState.readiness.technical = Math.min(100, InsigniaState.readiness.technical + 2);
  InsigniaState.readiness.overall = Math.round(
    (InsigniaState.readiness.resume + InsigniaState.readiness.technical + InsigniaState.readiness.mock + InsigniaState.readiness.study) / 4
  );
  saveState();
  showToast('Question Marked as Practiced! Readiness updated.', 'success');
};

window.bookmarkQuestion = function(id) {
  if (!InsigniaState.bookmarks.includes(id)) {
    InsigniaState.bookmarks.push(id);
    saveState();
    showToast('Question saved to bookmarks!', 'info');
  }
};

function escapeQnAText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
