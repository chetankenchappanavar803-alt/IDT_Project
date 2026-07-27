/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * Study Hub – Powered by Gemini AI
 */

window.InsigniaViews = window.InsigniaViews || {};

const STUDY_DOMAINS = [
  'Frontend Development', 'Backend & System Design', 'Data Structures & Algorithms',
  'Machine Learning & AI', 'DevOps & Cloud', 'Database Design', 'Mobile Development',
  'Cybersecurity', 'Full Stack Development', 'Computer Networks'
];

window.InsigniaViews.study = function renderStudyView() {
  setupStudyFilters();
  renderDefaultStudyState();
  bindNotesEditor();
};

function renderDefaultStudyState() {
  const container = document.getElementById('study-pathways-container');
  if (!container) return;
  const hasKey = true; // always true — server handles the key
  container.innerHTML = `
    <div style="text-align:center; padding: 50px 20px;">
      <div style="font-size: 3.5rem; margin-bottom:16px;">🧠</div>
      <h3 style="font-size: 1.15rem; font-weight:800; margin-bottom:8px;">AI-Powered Study Plans</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 380px; margin: 0 auto 20px;">
        Select your target domain and experience level, then click <strong style="color:var(--cyan);">"Generate AI Study Plan"</strong> to get a personalized interview prep roadmap.
      </p>
      <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; max-width:500px; margin:0 auto;">
        ${STUDY_DOMAINS.slice(0,6).map(d => `
          <span style="background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.25); border-radius:20px; padding:5px 14px; font-size:0.78rem; color:var(--cyan); cursor:pointer;"
            onclick="document.getElementById('study-domain-select').value='${d}'">${d}</span>
        `).join('')}
      </div>
    </div>`;
}

function setupStudyFilters() {
  const btnPlan = document.getElementById('btn-generate-study-plan');
  if (!btnPlan) return;

  btnPlan.onclick = async () => {
    const domain = document.getElementById('study-domain-select')?.value || 'Frontend Development';
    const level  = document.getElementById('study-level-select')?.value  || 'Mid-Level';
    const role   = InsigniaState.currentUser?.targetRole || InsigniaState.resumeData?.targetTitle || 'Software Engineer';

    btnPlan.disabled = true;
    btnPlan.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating AI Plan…';
    showStudyLoadingState(domain);

    try {
      const plan = await window.AI.generateStudyPlan({ domain, level, role });
      if (plan) {
        renderStudyPlan(plan);
        showToast(`✨ AI Study Plan for "${domain}" generated!`, 'success');
        InsigniaState.stats.topicsStudied = Math.max(InsigniaState.stats.topicsStudied, 1);
        InsigniaState.readiness.study = Math.min(100, InsigniaState.readiness.study + 5);
        saveState();
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.error('[Study] AI plan failed:', err.message);
      showToast('⚠️ AI Error: ' + err.message.substring(0, 70), 'warning');
      renderDefaultStudyState();
    } finally {
      btnPlan.disabled = false;
      btnPlan.innerHTML = '<i class="bi bi-stars"></i> Generate AI Study Plan';
    }
  };
}

function showStudyLoadingState(domain) {
  const container = document.getElementById('study-pathways-container');
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      ${Array(4).fill(0).map(() => `
        <div class="glass-card" style="padding: 20px; animation: pulse 1.5s ease-in-out infinite;">
          <div style="height:16px; background:rgba(255,255,255,0.06); border-radius:8px; width:50%; margin-bottom:12px;"></div>
          <div style="height:12px; background:rgba(255,255,255,0.04); border-radius:6px; width:90%; margin-bottom:8px;"></div>
          <div style="height:12px; background:rgba(255,255,255,0.04); border-radius:6px; width:70%;"></div>
        </div>`).join('')}
      <div style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.84rem;">
        <i class="bi bi-stars" style="color:var(--cyan);"></i>
        Gemini AI is creating your personalized "${domain}" study plan…
      </div>
    </div>`;
}

function renderStudyPlan(plan) {
  const container = document.getElementById('study-pathways-container');
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="font-size:1.15rem; font-weight:800; color:#fff; margin-bottom:3px;">
            <i class="bi bi-book-half" style="color:var(--cyan); margin-right:8px;"></i>${plan.domain}
          </h3>
          <p style="font-size:0.8rem; color:var(--text-muted);">AI-generated study plan • ${plan.topics?.length || 0} topics</p>
        </div>
        <span style="font-size:0.78rem; padding:5px 14px; background:rgba(6,182,212,0.15); color:var(--cyan); border-radius:20px; font-weight:700; border:1px solid rgba(6,182,212,0.3);">
          ${plan.level}
        </span>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        ${(plan.topics || []).map((t, idx) => `
          <div class="glass-card" style="padding:18px 20px;" id="study-topic-${idx}">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
              <div style="display:flex; gap:14px; align-items:flex-start; flex:1;">
                <input type="checkbox" style="margin-top:4px; width:18px; height:18px; cursor:pointer; accent-color:var(--cyan);"
                  onchange="toggleTopicComplete(this, ${idx})">
                <div style="flex:1;">
                  <h4 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:5px;">${idx + 1}. ${escapeStudyHTML(t.title)}</h4>
                  <p style="font-size:0.84rem; color:var(--text-muted); line-height:1.6; margin-bottom:10px;">${escapeStudyHTML(t.summary)}</p>

                  ${t.keyPoints?.length ? `
                    <div style="margin-bottom:10px;">
                      <div style="font-size:0.72rem; font-weight:700; color:var(--purple); margin-bottom:5px;">📌 Key Interview Points:</div>
                      <ul style="padding-left:16px; font-size:0.81rem; color:var(--text-main); line-height:1.8; margin:0;">
                        ${t.keyPoints.map(k => `<li>${escapeStudyHTML(k)}</li>`).join('')}
                      </ul>
                    </div>` : ''}

                  ${t.code ? `
                    <pre style="background:rgba(0,0,0,0.5); padding:12px 14px; border-radius:8px; font-family:var(--font-code); font-size:0.79rem; color:#a5f3fc; overflow-x:auto; border:1px solid rgba(6,182,212,0.15); margin:0;"><code>${escapeStudyHTML(t.code)}</code></pre>
                  ` : ''}
                </div>
              </div>
              <span style="font-size:0.73rem; color:var(--text-dim); white-space:nowrap; flex-shrink:0;">⏱ ${t.duration}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function bindNotesEditor() {
  const notesArea = document.getElementById('study-notes-area');
  if (!notesArea) return;
  notesArea.value = InsigniaState.notes || '';
  notesArea.oninput = (e) => {
    InsigniaState.notes = e.target.value;
    saveState();
  };
}

window.toggleTopicComplete = function(checkbox, idx) {
  const card = document.getElementById(`study-topic-${idx}`);
  if (checkbox.checked) {
    if (card) card.style.borderLeft = '3px solid var(--emerald)';
    InsigniaState.stats.topicsStudied += 1;
    InsigniaState.readiness.study = Math.min(100, InsigniaState.readiness.study + 5);
    InsigniaState.readiness.overall = Math.round(
      (InsigniaState.readiness.resume + InsigniaState.readiness.technical +
       InsigniaState.readiness.mock + InsigniaState.readiness.study) / 4
    );
    saveState();
    showToast('✅ Topic completed! Great progress!', 'success');
  } else {
    if (card) card.style.borderLeft = '';
  }
};

function escapeStudyHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
