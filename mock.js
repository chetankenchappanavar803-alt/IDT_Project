/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * Mock Interview Simulator – Powered by Gemini AI
 */

window.InsigniaViews = window.InsigniaViews || {};

let mockTimerInterval = null;
let currentMockQuestionIdx = 0;
let remainingSeconds = 120;
let mockQuestions = [];        // AI-generated or fallback questions
let mockAnswers   = [];        // User answers per question
let mockConfig    = {};        // Role, level, company from config pane

const FALLBACK_MOCK_QUESTIONS = [
  { question: "Can you introduce yourself and highlight a technical project you are most proud of?", type: "HR", hint: "Concise intro + measurable project impact" },
  { question: "How do you handle unexpected bugs or high latency in a production environment under pressure?", type: "Behavioral", hint: "STAR method — process + outcome" },
  { question: "Explain the trade-offs between Client-Side Rendering (CSR) and Server-Side Rendering (SSR).", type: "Technical", hint: "Performance, SEO, TTFB, hydration" },
  { question: "Design a URL shortener service like bit.ly. Walk through your architecture.", type: "System Design", hint: "Hash generation, DB, caching, scaling" },
  { question: "Describe a time you received critical feedback on your code. How did you respond?", type: "Behavioral", hint: "Growth mindset + specific action taken" }
];

window.InsigniaViews.mock = function renderMockView() {
  setupMockConfig();
};

function setupMockConfig() {
  const btnStart = document.getElementById('btn-start-mock');
  if (!btnStart) return;

  btnStart.onclick = () => startMockSession();
}

async function startMockSession() {
  // Read config
  mockConfig = {
    role:    document.getElementById('mock-target-role')?.value?.trim()  || 'Software Engineer',
    level:   document.getElementById('mock-level-select')?.value          || 'Mid-Level',
    company: document.getElementById('mock-company-input')?.value?.trim() || '',
    count:   parseInt(document.getElementById('mock-count-select')?.value) || 5
  };

  const configPane = document.getElementById('mock-config-pane');
  const roomPane   = document.getElementById('mock-room-pane');
  const reportPane = document.getElementById('mock-report-pane');
  const loadPane   = document.getElementById('mock-loading-pane');

  if (configPane) configPane.style.display = 'none';
  if (reportPane) reportPane.style.display = 'none';
  if (roomPane)   roomPane.style.display   = 'none';
  if (loadPane)   loadPane.style.display   = 'block';

  // Try AI generation
  try {
    mockQuestions = await window.AI.generateMockQuestions({
      role: mockConfig.role,
      level: mockConfig.level,
      targetCompany: mockConfig.company,
      count: mockConfig.count
    });
    showToast(`✨ ${mockQuestions.length} AI questions generated for ${mockConfig.role}`, 'success');
  } catch (err) {
    console.error('[Mock] AI question generation failed:', err.message);
    showToast(`⚠️ AI Error: ${err.message.substring(0, 80)} — using sample questions`, 'warning');
    mockQuestions = FALLBACK_MOCK_QUESTIONS.slice(0, mockConfig.count);
  }

  mockAnswers = new Array(mockQuestions.length).fill('');
  currentMockQuestionIdx = 0;

  if (loadPane)  loadPane.style.display  = 'none';
  if (roomPane)  roomPane.style.display  = 'block';

  renderMockQuestion(currentMockQuestionIdx);
  startTimer();
}

function renderMockQuestion(idx) {
  const q           = mockQuestions[idx];
  const qText       = document.getElementById('mock-current-question-text');
  const qType       = document.getElementById('mock-question-type-badge');
  const qHint       = document.getElementById('mock-question-hint');
  const counterText = document.getElementById('mock-question-counter');
  const progressBar = document.getElementById('mock-progress-bar');
  const inputArea   = document.getElementById('mock-response-input');

  if (qText)       qText.textContent    = q.question;
  if (qType)       qType.textContent    = q.type || 'Technical';
  if (qHint)       qHint.textContent    = q.hint ? `💡 ${q.hint}` : '';
  if (counterText) counterText.textContent = `Question ${idx + 1} of ${mockQuestions.length}`;
  if (progressBar) {
    const pct = Math.round(((idx) / mockQuestions.length) * 100);
    progressBar.style.width = `${pct}%`;
  }
  if (inputArea)  inputArea.value = mockAnswers[idx] || '';
  remainingSeconds = 120;
}

function startTimer() {
  clearInterval(mockTimerInterval);
  updateTimerUI();
  mockTimerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerUI();
    if (remainingSeconds <= 0) {
      clearInterval(mockTimerInterval);
      showToast('Time is up! Moving to next question…', 'warning');
      nextMockQuestion();
    }
  }, 1000);
}

function updateTimerUI() {
  const timerBadge = document.getElementById('mock-timer-display');
  if (!timerBadge) return;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  timerBadge.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  timerBadge.style.color = remainingSeconds <= 20 ? '#ef4444' : 'var(--cyan)';
}

window.nextMockQuestion = function() {
  // Save current answer
  const inputArea = document.getElementById('mock-response-input');
  if (inputArea) mockAnswers[currentMockQuestionIdx] = inputArea.value;

  currentMockQuestionIdx++;
  if (currentMockQuestionIdx < mockQuestions.length) {
    renderMockQuestion(currentMockQuestionIdx);
    startTimer();
  } else {
    finishMockInterview();
  }
};

async function finishMockInterview() {
  clearInterval(mockTimerInterval);

  const roomPane   = document.getElementById('mock-room-pane');
  const reportPane = document.getElementById('mock-report-pane');
  const loadPane   = document.getElementById('mock-loading-pane');
  const loadMsg    = document.getElementById('mock-loading-message');

  if (roomPane)  roomPane.style.display  = 'none';
  if (loadPane)  loadPane.style.display  = 'block';
  if (loadMsg)   loadMsg.textContent     = '🤖 Gemini AI is evaluating your answers…';

  // Evaluate all answers with AI
  let evaluations = [];
  try {
    const evalPromises = mockQuestions.map((q, i) =>
      window.AI.evaluateMockAnswer({
        question: q.question,
        answer:   mockAnswers[i] || '',
        role:     mockConfig.role,
        type:     q.type || 'Technical'
      })
    );
    evaluations = await Promise.all(evalPromises);
  } catch (err) {
    console.warn('AI evaluation failed:', err);
    // Generate fallback scores
    evaluations = mockQuestions.map((q, i) => ({
      score:       mockAnswers[i]?.length > 20 ? 7 : 4,
      feedback:    mockAnswers[i]?.length > 20
        ? 'Good attempt. Review the model answer for improvement areas.'
        : 'Answer was too brief. Practice with more detail.',
      strengths:   ['Attempted the question'],
      improvements:['Add more specific examples', 'Quantify your results'],
      modelAnswer: 'Structure your answer using the STAR method with specific metrics.'
    }));
  }

  if (loadPane) loadPane.style.display = 'none';
  if (reportPane) reportPane.style.display = 'block';

  renderMockReport(evaluations);

  // Update stats
  InsigniaState.stats.mockCompleted += 1;
  const avgScore = evaluations.reduce((s, e) => s + (e.score || 0), 0) / evaluations.length;
  InsigniaState.readiness.mock = Math.min(100, InsigniaState.readiness.mock + Math.round(avgScore));
  InsigniaState.readiness.overall = Math.round(
    (InsigniaState.readiness.resume + InsigniaState.readiness.technical +
     InsigniaState.readiness.mock + InsigniaState.readiness.study) / 4
  );
  saveState();
  showToast('✅ Mock Interview Complete! AI Feedback Generated.', 'success');
}

function renderMockReport(evaluations) {
  const avgScore  = evaluations.reduce((s, e) => s + (e.score || 0), 0) / evaluations.length;
  const pct       = Math.round(avgScore * 10);
  const grade     = pct >= 85 ? 'A' : pct >= 70 ? 'B+' : pct >= 55 ? 'B' : pct >= 40 ? 'C+' : 'C';
  const gradeColor = pct >= 75 ? 'var(--emerald)' : pct >= 55 ? 'var(--cyan)' : '#f59e0b';

  // Overall score card
  const overallEl = document.getElementById('mock-report-overall');
  if (overallEl) {
    overallEl.innerHTML = `
      <div style="text-align:center; margin-bottom:28px;">
        <div style="font-size:4rem; font-weight:900; color:${gradeColor}; line-height:1;">${pct}%</div>
        <div style="font-size:1.2rem; font-weight:800; color:${gradeColor}; margin-top:4px;">Grade: ${grade}</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;">
          ${mockConfig.role} • ${mockConfig.level} • ${evaluations.length} Questions
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px;">
        <div style="background:rgba(255,255,255,0.04); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(6,182,212,0.2);">
          <div style="font-size:1.7rem; font-weight:800; color:var(--cyan);">${pct}%</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Overall Score</div>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(139,92,246,0.2);">
          <div style="font-size:1.7rem; font-weight:800; color:var(--purple);">${evaluations.filter(e => (e.score||0) >= 7).length}/${evaluations.length}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Strong Answers</div>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:16px; border-radius:12px; text-align:center; border:1px solid rgba(16,185,129,0.2);">
          <div style="font-size:1.7rem; font-weight:800; color:var(--emerald);">${mockAnswers.filter(a => a && a.length > 30).length}/${mockAnswers.length}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Answered</div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${evaluations.map((ev, i) => {
          const q      = mockQuestions[i];
          const score  = ev.score || 0;
          const barPct = score * 10;
          const barColor = score >= 7 ? 'var(--emerald)' : score >= 5 ? 'var(--cyan)' : '#f59e0b';
          return `
            <div style="background:rgba(0,0,0,0.3); border-radius:12px; padding:16px; border:1px solid var(--glass-border);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px;">
                <div style="font-size:0.82rem; font-weight:700; color:#fff; flex:1; line-height:1.4;">
                  Q${i+1}: ${q.question.substring(0, 80)}${q.question.length > 80 ? '…' : ''}
                </div>
                <div style="font-size:0.88rem; font-weight:800; color:${barColor}; white-space:nowrap;">${score}/10</div>
              </div>

              <div style="height:5px; background:rgba(255,255,255,0.08); border-radius:4px; margin-bottom:10px; overflow:hidden;">
                <div style="height:100%; width:${barPct}%; background:${barColor}; border-radius:4px; transition:width 0.8s ease;"></div>
              </div>

              <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px; line-height:1.5;">${ev.feedback || ''}</p>

              ${ev.strengths?.length ? `
                <div style="margin-bottom:6px;">
                  <span style="font-size:0.72rem; font-weight:700; color:var(--emerald);">✅ Strengths:</span>
                  <span style="font-size:0.78rem; color:var(--text-main);"> ${ev.strengths.join(' · ')}</span>
                </div>` : ''}

              ${ev.improvements?.length ? `
                <div style="margin-bottom:8px;">
                  <span style="font-size:0.72rem; font-weight:700; color:#f59e0b;">⚡ Improve:</span>
                  <span style="font-size:0.78rem; color:var(--text-main);"> ${ev.improvements.join(' · ')}</span>
                </div>` : ''}

              ${ev.modelAnswer ? `
                <details style="margin-top:8px;">
                  <summary style="font-size:0.75rem; color:var(--cyan); cursor:pointer; font-weight:700;">🤖 View Model Answer</summary>
                  <p style="font-size:0.79rem; color:var(--text-muted); margin-top:8px; padding:10px; background:rgba(6,182,212,0.06); border-radius:8px; line-height:1.6;">${ev.modelAnswer}</p>
                </details>` : ''}
            </div>`;
        }).join('')}
      </div>

      <div style="margin-top:24px; text-align:center;">
        <button class="btn-primary" onclick="resetMockSession()" style="padding:12px 32px;">
          <i class="bi bi-arrow-counterclockwise"></i> Try Again
        </button>
      </div>
    `;
  }
}

window.resetMockSession = function() {
  clearInterval(mockTimerInterval);
  mockQuestions = [];
  mockAnswers   = [];
  currentMockQuestionIdx = 0;

  const configPane = document.getElementById('mock-config-pane');
  const roomPane   = document.getElementById('mock-room-pane');
  const reportPane = document.getElementById('mock-report-pane');
  const loadPane   = document.getElementById('mock-loading-pane');

  if (configPane) configPane.style.display = 'block';
  if (roomPane)   roomPane.style.display   = 'none';
  if (reportPane) reportPane.style.display = 'none';
  if (loadPane)   loadPane.style.display   = 'none';
};
