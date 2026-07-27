/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * Resume Builder Component
 */

window.InsigniaViews = window.InsigniaViews || {};

window.InsigniaViews.resume = function renderResumeView() {
  bindResumeFormInputs();
  renderLiveResumePreview();
  calculateATSScore();
  setupAIResumeScorer();
};

function setupAIResumeScorer() {
  const btn = document.getElementById('btn-ai-score-resume');
  if (!btn) return;

  btn.onclick = async () => {
    const data = InsigniaState.resumeData;
    const resumeText = buildResumeText(data);

    if (resumeText.length < 100) {
      showToast('Please fill in your resume details first before scoring.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> AI is analysing…';
    showAIScorerLoading();

    try {
      const result = await window.AI.scoreResume(resumeText);
      renderAIScorePanel(result);
      showToast(`✨ AI Resume Score: ${result.score}/100 (Grade ${result.grade})`, 'success');

      // Update readiness
      InsigniaState.readiness.resume = Math.min(100, result.score);
      InsigniaState.readiness.overall = Math.round(
        (InsigniaState.readiness.resume + InsigniaState.readiness.technical +
         InsigniaState.readiness.mock + InsigniaState.readiness.study) / 4
      );
      saveState();
    } catch (err) {
      console.error('[Resume AI] Scoring failed:', err.message);
      showToast('⚠️ AI Error: ' + err.message.substring(0, 70), 'warning');
      hideAIScorePanel();
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-stars"></i> AI Score My Resume';
    }
  };
}

function buildResumeText(data) {
  let text = '';
  if (data.fullName)    text += `Name: ${data.fullName}\n`;
  if (data.targetTitle) text += `Target Role: ${data.targetTitle}\n`;
  if (data.email)       text += `Email: ${data.email}\n`;
  if (data.summary)     text += `\nSummary:\n${data.summary}\n`;
  if (data.skills)      text += `\nSkills:\n${data.skills}\n`;
  if (data.experience?.length) {
    text += `\nExperience:\n`;
    data.experience.forEach(e => {
      text += `${e.role} at ${e.company} (${e.period})\n${e.description}\n\n`;
    });
  }
  if (data.education?.length) {
    text += `\nEducation:\n`;
    data.education.forEach(e => {
      text += `${e.degree} — ${e.institution} (${e.period})\n`;
    });
  }
  if (data.projects?.length) {
    text += `\nProjects:\n`;
    data.projects.forEach(p => {
      text += `${p.name} (${p.tech}): ${p.description}\n`;
    });
  }
  return text;
}

function showAIScorerLoading() {
  const panel = document.getElementById('ai-score-panel');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="display:flex; gap:10px; align-items:center; padding:16px; animation: pulse 1.5s ease-in-out infinite;">
      <i class="bi bi-stars" style="color:var(--cyan); font-size:1.4rem;"></i>
      <div>
        <div style="font-weight:700; color:#fff; margin-bottom:2px;">Gemini AI is analysing your resume…</div>
        <div style="font-size:0.78rem; color:var(--text-muted);">Checking ATS compatibility, keywords, and structure</div>
      </div>
    </div>`;
}

function hideAIScorePanel() {
  const panel = document.getElementById('ai-score-panel');
  if (panel) panel.style.display = 'none';
}

function renderAIScorePanel(r) {
  const panel = document.getElementById('ai-score-panel');
  if (!panel) return;

  const scoreColor = r.score >= 80 ? 'var(--emerald)' : r.score >= 60 ? 'var(--cyan)' : '#f59e0b';
  const priorityColor = { High: '#ef4444', Medium: '#f59e0b', Low: 'var(--emerald)' };

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap;">
      <div style="text-align:center; flex-shrink:0;">
        <div style="font-size:3rem; font-weight:900; color:${scoreColor}; line-height:1;">${r.score}</div>
        <div style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">out of 100</div>
      </div>
      <div style="flex:1; min-width:180px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <span style="font-size:1.3rem; font-weight:800; color:${scoreColor};">Grade: ${r.grade}</span>
          <span style="font-size:0.75rem; background:rgba(6,182,212,0.12); color:var(--cyan); border:1px solid rgba(6,182,212,0.25); border-radius:20px; padding:3px 10px; font-weight:700;">ATS Analysis</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5;">${r.summary || ''}</p>
      </div>
    </div>

    <!-- Score Bar -->
    <div style="height:8px; background:rgba(255,255,255,0.07); border-radius:4px; margin-bottom:20px; overflow:hidden;">
      <div style="height:100%; width:${r.score}%; background:linear-gradient(90deg,${scoreColor},var(--cyan)); border-radius:4px; transition:width 1s ease;"></div>
    </div>

    <!-- Strengths -->
    ${r.strengths?.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:0.8rem; font-weight:800; color:var(--emerald); margin-bottom:8px;">✅ Strengths</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${r.strengths.map(s => `
            <div style="font-size:0.82rem; color:var(--text-main); padding:7px 12px; background:rgba(16,185,129,0.08); border-radius:8px; border-left:3px solid var(--emerald);">
              ${s}
            </div>`).join('')}
        </div>
      </div>` : ''}

    <!-- Improvements -->
    ${r.improvements?.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:0.8rem; font-weight:800; color:#f59e0b; margin-bottom:8px;">⚡ Improvements Needed</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${r.improvements.map(imp => `
            <div style="padding:10px 12px; background:rgba(245,158,11,0.07); border-radius:8px; border-left:3px solid ${priorityColor[imp.priority] || '#f59e0b'};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:0.83rem; font-weight:700; color:#fff;">${imp.issue}</span>
                <span style="font-size:0.67rem; font-weight:800; color:${priorityColor[imp.priority] || '#f59e0b'}; border:1px solid; border-radius:10px; padding:1px 8px;">${imp.priority}</span>
              </div>
              <div style="font-size:0.79rem; color:var(--text-muted);">${imp.fix}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

    <!-- Missing Keywords -->
    ${r.keywords_missing?.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:0.8rem; font-weight:800; color:var(--purple); margin-bottom:8px;">🔑 Missing Keywords (Add These!)</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${r.keywords_missing.map(k => `
            <span style="font-size:0.77rem; background:rgba(139,92,246,0.12); color:var(--purple); border:1px solid rgba(139,92,246,0.3); border-radius:20px; padding:4px 12px; font-weight:600;">${k}</span>
          `).join('')}
        </div>
      </div>` : ''}

    <!-- ATS Tips -->
    ${r.ats_tips?.length ? `
      <div>
        <div style="font-size:0.8rem; font-weight:800; color:var(--cyan); margin-bottom:8px;">💡 ATS Optimization Tips</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${r.ats_tips.map((tip, i) => `
            <div style="font-size:0.81rem; color:var(--text-muted); display:flex; gap:8px; align-items:flex-start;">
              <span style="color:var(--cyan); font-weight:700; flex-shrink:0;">${i + 1}.</span>
              <span>${tip}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
  `;
}

function bindResumeFormInputs() {
  const data = InsigniaState.resumeData;

  // Bind main inputs
  bindInput('res-name', data, 'fullName');
  bindInput('res-title', data, 'targetTitle');
  bindInput('res-email', data, 'email');
  bindInput('res-phone', data, 'phone');
  bindInput('res-location', data, 'location');
  bindInput('res-linkedin', data, 'linkedin');
  bindInput('res-github', data, 'github');
  bindInput('res-summary', data, 'summary');
  bindInput('res-skills', data, 'skills');

  // Sample Data Button
  const btnSample = document.getElementById('btn-load-sample-resume');
  if (btnSample) {
    btnSample.onclick = () => {
      InsigniaState.resumeData = {
        fullName: 'Alex Morgan',
        targetTitle: 'Senior Full Stack Engineer',
        email: 'alex.morgan@example.com',
        phone: '+1 (555) 019-2834',
        location: 'San Francisco, CA',
        linkedin: 'linkedin.com/in/alexmorgan',
        github: 'github.com/alexmorgan',
        summary: 'Passionate and results-driven Full Stack Engineer with 4+ years of experience engineering high-concurrency microservices, glassmorphic UI web apps, and automated CI/CD pipelines.',
        skills: 'JavaScript (ES6+), TypeScript, React, Node.js, Express, PostgreSQL, Docker, AWS, GraphQL, REST APIs, Jest',
        experience: [
          {
            company: 'TechSphere Systems',
            role: 'Senior Frontend Developer',
            period: '2022 - Present',
            description: 'Led a team of 5 engineers building scalable cloud management dashboards. Increased system response time by 40% using optimized caching and state management.'
          },
          {
            company: 'Innovate AI Labs',
            role: 'Full Stack Engineer',
            period: '2020 - 2022',
            description: 'Developed AI-assisted analytics tools using React, Python, and Node.js. Integrated WebSocket streams for live data visualizations.'
          }
        ],
        education: [
          {
            institution: 'University of California, Berkeley',
            degree: 'B.S. in Computer Science',
            period: '2016 - 2020'
          }
        ],
        projects: [
          {
            name: 'Insignia AI Preparation Suite',
            tech: 'HTML5, Glassmorphism CSS, ES6 JS',
            description: 'Engineered an all-in-one AI career suite featuring real-time ATS resume preview, Q&A practice flashcards, and timed mock interview room.'
          }
        ]
      };

      // Refresh inputs & preview
      renderResumeView();
      showToast('Sample Resume Data Loaded!', 'success');
      
      // Update overall stats
      InsigniaState.stats.resumesCreated = Math.max(1, InsigniaState.stats.resumesCreated);
      InsigniaState.readiness.resume = 90;
      saveState();
    };
  }

  // Add Dynamic Entry Buttons
  const btnAddExp = document.getElementById('btn-add-exp');
  if (btnAddExp) {
    btnAddExp.onclick = () => {
      InsigniaState.resumeData.experience.push({
        company: 'New Company',
        role: 'Job Role',
        period: '2023 - Present',
        description: 'Key achievements and technical responsibilities...'
      });
      renderResumeView();
    };
  }

  const btnAddEdu = document.getElementById('btn-add-edu');
  if (btnAddEdu) {
    btnAddEdu.onclick = () => {
      InsigniaState.resumeData.education.push({
        institution: 'University / Institute',
        degree: 'Degree Name',
        period: '2019 - 2023'
      });
      renderResumeView();
    };
  }

  // Print PDF Button
  const btnPrint = document.getElementById('btn-print-resume');
  if (btnPrint) {
    btnPrint.onclick = () => {
      window.print();
    };
  }
}

function bindInput(elementId, obj, key) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  el.value = obj[key] || '';
  el.oninput = (e) => {
    obj[key] = e.target.value;
    renderLiveResumePreview();
    calculateATSScore();
    saveState();
  };
}

function renderLiveResumePreview() {
  const data = InsigniaState.resumeData;
  const container = document.getElementById('resume-preview-pane');
  if (!container) return;

  const expHTML = (data.experience || []).map((exp, idx) => `
    <div class="resume-paper-entry">
      <div class="entry-header-row">
        <span>${escapeHTML(exp.role || '')} — <strong>${escapeHTML(exp.company || '')}</strong></span>
        <span>${escapeHTML(exp.period || '')}</span>
      </div>
      <div style="font-size: 11.5px; color: #4b5563; margin-top: 2px;">
        ${escapeHTML(exp.description || '')}
      </div>
    </div>
  `).join('');

  const eduHTML = (data.education || []).map(edu => `
    <div class="resume-paper-entry">
      <div class="entry-header-row">
        <span>${escapeHTML(edu.institution || '')}</span>
        <span>${escapeHTML(edu.period || '')}</span>
      </div>
      <div class="entry-subtitle">${escapeHTML(edu.degree || '')}</div>
    </div>
  `).join('');

  const projHTML = (data.projects || []).map(p => `
    <div class="resume-paper-entry">
      <div class="entry-header-row">
        <span><strong>${escapeHTML(p.name || '')}</strong> <span style="font-weight: 400; color: #6366f1;">(${escapeHTML(p.tech || '')})</span></span>
      </div>
      <div style="font-size: 11.5px; color: #4b5563; margin-top: 2px;">
        ${escapeHTML(p.description || '')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="resume-paper">
      <div class="resume-paper-header">
        <div class="resume-paper-name">${escapeHTML(data.fullName || 'YOUR NAME')}</div>
        <div class="resume-paper-role">${escapeHTML(data.targetTitle || 'TARGET JOB TITLE')}</div>
        <div class="resume-paper-contact">
          ${data.email ? `<span>📧 ${escapeHTML(data.email)}</span>` : ''}
          ${data.phone ? `<span>📞 ${escapeHTML(data.phone)}</span>` : ''}
          ${data.location ? `<span>📍 ${escapeHTML(data.location)}</span>` : ''}
          ${data.linkedin ? `<span>🔗 ${escapeHTML(data.linkedin)}</span>` : ''}
          ${data.github ? `<span>💻 ${escapeHTML(data.github)}</span>` : ''}
        </div>
      </div>

      ${data.summary ? `
        <div class="resume-paper-section">
          <div class="resume-paper-section-title">Professional Summary</div>
          <p style="font-size: 12px; color: #374151;">${escapeHTML(data.summary)}</p>
        </div>
      ` : ''}

      ${data.skills ? `
        <div class="resume-paper-section">
          <div class="resume-paper-section-title">Technical Skills</div>
          <p style="font-size: 12px; color: #374151;">${escapeHTML(data.skills)}</p>
        </div>
      ` : ''}

      ${expHTML ? `
        <div class="resume-paper-section">
          <div class="resume-paper-section-title">Work Experience</div>
          ${expHTML}
        </div>
      ` : ''}

      ${projHTML ? `
        <div class="resume-paper-section">
          <div class="resume-paper-section-title">Key Projects</div>
          ${projHTML}
        </div>
      ` : ''}

      ${eduHTML ? `
        <div class="resume-paper-section">
          <div class="resume-paper-section-title">Education & Qualifications</div>
          ${eduHTML}
        </div>
      ` : ''}
    </div>
  `;
}

function calculateATSScore() {
  const d = InsigniaState.resumeData;
  let score = 50;

  if (d.fullName && d.email && d.phone) score += 10;
  if (d.summary && d.summary.length > 50) score += 10;
  if (d.skills && d.skills.split(',').length >= 5) score += 15;
  if (d.experience && d.experience.length > 0) score += 15;

  const scoreBadge = document.getElementById('ats-score-text');
  if (scoreBadge) {
    scoreBadge.textContent = `${score}% ATS Score`;
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
