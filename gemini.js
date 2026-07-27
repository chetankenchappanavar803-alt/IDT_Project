/**
 * INSIGNIA – Gemini AI Client
 * All AI calls go through /api/ai on our local server.
 * The API key lives ONLY on the server — never exposed in browser.
 */

// ─── CENTRAL AI CALLER ───────────────────────────────────────────────────────

async function callAI(action, payload) {
  const res = await fetch('/api/ai', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, payload })
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    const msg = data.error || `HTTP ${res.status}`;
    console.error(`[AI /${action}] Error:`, msg);
    throw new Error(msg);
  }

  return data;
}

// ─── AI FEATURE FUNCTIONS ────────────────────────────────────────────────────

window.AI = window.AI || {};

/** Generate interview Q&A — returns array of {question, answer, tips, type, category} */
window.AI.generateQnA = async function({ role, level, type, count = 6 }) {
  const data = await callAI('qna', { role, level, type, count });
  return (data.questions || []).map((q, i) => ({ ...q, id: Date.now() + i, role, level }));
};

/** Generate mock interview questions — returns array of {question, type, hint} */
window.AI.generateMockQuestions = async function({ role, level, targetCompany, count = 5 }) {
  const data = await callAI('mock-questions', { role, level, company: targetCompany, count });
  return data.questions || [];
};

/** Evaluate a single mock answer — returns {score, feedback, strengths, improvements, modelAnswer} */
window.AI.evaluateMockAnswer = async function({ question, answer, role, type }) {
  const data = await callAI('mock-evaluate', { question, answer, role, type });
  return data.evaluation || { score: 5, feedback: 'Evaluation unavailable.', strengths: [], improvements: [], modelAnswer: '' };
};

/** Generate AI study plan — returns { domain, level, topics[] } */
window.AI.generateStudyPlan = async function({ domain, level, role }) {
  const data = await callAI('study-plan', { domain, level, role });
  return data.plan || null;
};

/** Score a resume — returns { score, grade, summary, strengths, improvements, keywords_missing, ats_tips } */
window.AI.scoreResume = async function(resumeText) {
  const data = await callAI('resume-score', { resumeText });
  return data.score || null;
};

/** Get AI dashboard insight — returns { overallMessage, topStrength, topWeakness, nextAction, prediction } */
window.AI.getDashboardInsight = async function({ name, role, readiness, stats }) {
  const data = await callAI('dashboard-insight', { name, role, readiness, stats });
  return data.insight || null;
};

// ─── GEMINI AI BADGE (always active since server handles the key) ──────────────

function setupGeminiKeyModal() {
  const badge = document.getElementById('ai-status-badge');
  if (badge) {
    badge.textContent  = '⚡ Gemini AI Active';
    badge.style.background   = 'linear-gradient(135deg,rgba(16,185,129,.25),rgba(6,182,212,.25))';
    badge.style.color        = 'var(--emerald)';
    badge.style.borderColor  = 'var(--emerald)';

    // Test the server AI on click
    badge.onclick = async () => {
      badge.textContent = '⚡ Testing AI…';
      try {
        await callAI('dashboard-insight', {
          name: 'Test', role: 'Software Engineer',
          readiness: { resume: 50, technical: 50, mock: 50, study: 50 },
          stats: { mockCompleted: 0, qnaPracticed: 0, topicsStudied: 0 }
        });
        badge.textContent = '⚡ Gemini AI Active ✓';
        showToast('✅ Gemini AI is working perfectly!', 'success');
      } catch (err) {
        badge.textContent = '⚠️ AI Error';
        badge.style.color = '#ef4444';
        showToast('❌ AI Error: ' + err.message, 'warning');
      }
      setTimeout(() => {
        badge.textContent = '⚡ Gemini AI Active';
        badge.style.color = 'var(--emerald)';
      }, 4000);
    };
  }

  // Wire up Gemini modal close (modal is still in HTML for manual key entry if needed)
  const closeBtn = document.getElementById('close-gemini-key-modal');
  const modal    = document.getElementById('gemini-key-modal');
  if (closeBtn && modal) closeBtn.onclick = () => modal.classList.remove('active');

  document.querySelectorAll('.open-gemini-modal').forEach(el => {
    if (el.id !== 'ai-status-badge') {
      el.onclick = () => modal?.classList.add('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupGeminiKeyModal();
});
