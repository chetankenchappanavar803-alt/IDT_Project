/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * Dashboard View Controller – Powered by Gemini AI
 */

window.InsigniaViews = window.InsigniaViews || {};

window.InsigniaViews.dashboard = function renderDashboardView() {
  const stats = InsigniaState.stats;
  const readiness = InsigniaState.readiness;

  // Update Stat Counters
  const countResume = document.getElementById('stat-resume-count');
  const countQna = document.getElementById('stat-qna-count');
  const countStudy = document.getElementById('stat-study-count');
  const countMock = document.getElementById('stat-mock-count');

  if (countResume) countResume.textContent = stats.resumesCreated || 0;
  if (countQna) countQna.textContent = stats.qnaPracticed || 0;
  if (countStudy) countStudy.textContent = stats.topicsStudied || 0;
  if (countMock) countMock.textContent = stats.mockCompleted || 0;

  // Update Overall Readiness Gauge
  updateGaugeScore(readiness.overall);

  // Update Breakdown Bars
  updateProgressBar('bar-resume', readiness.resume);
  updateProgressBar('bar-tech', readiness.technical);
  updateProgressBar('bar-mock', readiness.mock);
  updateProgressBar('bar-study', readiness.study);

  // Quick Action Buttons wiring
  setupQuickActions();

  // Trigger AI Coach Analysis
  loadAICoachInsight();
};

function updateGaugeScore(score) {
  const scoreText = document.getElementById('dashboard-readiness-score');
  const progressCircle = document.getElementById('dashboard-gauge-circle');

  if (scoreText) scoreText.textContent = `${score}%`;

  if (progressCircle) {
    const offset = 440 - (440 * score) / 100;
    progressCircle.style.strokeDashoffset = offset;
  }
}

function updateProgressBar(id, value) {
  const fill = document.getElementById(id);
  const text = document.getElementById(`${id}-val`);

  if (fill) fill.style.width = `${value}%`;
  if (text) text.textContent = `${value}%`;
}

function setupQuickActions() {
  const actions = [
    { id: 'btn-action-resume', view: 'resume' },
    { id: 'btn-action-qna', view: 'qna' },
    { id: 'btn-action-study', view: 'study' },
    { id: 'btn-action-mock', view: 'mock' }
  ];

  actions.forEach(act => {
    const btn = document.getElementById(act.id);
    if (btn) {
      btn.onclick = () => {
        const targetNavBtn = document.querySelector(`.nav-btn[data-view="${act.view}"]`);
        if (targetNavBtn) targetNavBtn.click();
      };
    }
  });

  const btnRefresh = document.getElementById('btn-refresh-ai-insight');
  if (btnRefresh) {
    btnRefresh.onclick = () => loadAICoachInsight(true);
  }
}

async function loadAICoachInsight(force = false) {
  const contentEl = document.getElementById('dashboard-ai-coach-content');
  if (!contentEl) return;

  if (!force && contentEl.getAttribute('data-loaded') === 'true') return;

  contentEl.innerHTML = '<span style="color:var(--cyan);"><i class="bi bi-hourglass-split"></i> Gemini AI is analysing your preparation metrics…</span>';

  const user = InsigniaState.currentUser || {};
  const data = {
    name: user.name || InsigniaState.resumeData?.fullName || 'Candidate',
    role: user.targetRole || InsigniaState.resumeData?.targetTitle || 'Software Engineer',
    readiness: InsigniaState.readiness,
    stats: InsigniaState.stats
  };

  try {
    const insight = await window.AI.getDashboardInsight(data);
    if (insight) {
      contentEl.setAttribute('data-loaded', 'true');
      contentEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:0.9rem; font-weight:700; color:#fff;">"${escapeDashHTML(insight.overallMessage || 'Keep building your skills!')}"</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:4px;">
            <div style="background:rgba(16,185,129,0.08); padding:8px 12px; border-radius:8px; border-left:3px solid var(--emerald);">
              <span style="font-size:0.72rem; font-weight:700; color:var(--emerald); display:block;">💪 Top Strength</span>
              <span style="font-size:0.8rem; color:var(--text-main);">${escapeDashHTML(insight.topStrength || 'Solid foundation')}</span>
            </div>
            <div style="background:rgba(245,158,11,0.08); padding:8px 12px; border-radius:8px; border-left:3px solid #f59e0b;">
              <span style="font-size:0.72rem; font-weight:700; color:#f59e0b; display:block;">🎯 Focus Area</span>
              <span style="font-size:0.8rem; color:var(--text-main);">${escapeDashHTML(insight.topWeakness || 'Practice more mock interviews')}</span>
            </div>
            <div style="background:rgba(6,182,212,0.08); padding:8px 12px; border-radius:8px; border-left:3px solid var(--cyan);">
              <span style="font-size:0.72rem; font-weight:700; color:var(--cyan); display:block;">🚀 Today's Action</span>
              <span style="font-size:0.8rem; color:var(--text-main);">${escapeDashHTML(insight.nextAction || 'Complete one mock session')}</span>
            </div>
          </div>
          ${insight.prediction ? `
            <div style="font-size:0.78rem; color:var(--purple); font-weight:600; margin-top:4px;">
              🔮 AI Prediction: ${escapeDashHTML(insight.prediction)}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      throw new Error('No insight returned');
    }
  } catch (err) {
    console.warn('[Dashboard AI] Insight error:', err.message);
    contentEl.innerHTML = `<span style="color:var(--text-muted);">Welcome back! Complete Q&amp;A cards and Mock interviews to get personalized AI career guidance.</span>`;
  }
}

function escapeDashHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
