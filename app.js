/**
 * INSIGNIA - AI INTERVIEW PREPARATION SUITE
 * Core Application Controller & State Engine
 */

// Global App State
const InsigniaState = {
  currentUser: {
    name: 'Guest User',
    email: '',
    role: 'Job Seeker',
    targetTitle: 'Software Engineer',
    experienceLevel: 'Mid-Level',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    skills: [],
    skillsKnown: [],
    skillsWanted: [],
    bio: '',
    isGuest: true,
    isRegistered: false
  },
  
  readiness: {
    overall: 78,
    resume: 85,
    technical: 75,
    mock: 70,
    study: 80
  },

  stats: {
    resumesCreated: 2,
    qnaPracticed: 28,
    topicsStudied: 14,
    mockCompleted: 4
  },

  peerNetwork: [],

  resumeData: {
    fullName: 'Alex Morgan',
    targetTitle: 'Senior Frontend Developer',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alex-morgan',
    github: 'github.com/alex-morgan',
    summary: 'Detail-oriented Frontend Engineer with 3+ years of experience crafting high-performance, user-centric web applications using modern JavaScript frameworks, CSS glassmorphism architecture, and scalable REST APIs.',
    skills: 'JavaScript, TypeScript, React, Next.js, HTML5/CSS3, Tailwind, Redux, Node.js, Jest, Git, CI/CD',
    experience: [
      {
        company: 'TechPulse Solutions',
        role: 'Frontend Engineer',
        period: '2023 - Present',
        description: 'Engineered real-time dashboard UI handling 100k+ daily active users using React & WebSockets. Improved page performance score by 35% through code splitting.'
      },
      {
        company: 'CloudScale Labs',
        role: 'Junior Web Developer',
        period: '2021 - 2023',
        description: 'Developed responsive client portals, collaborated with UX designers, and authored comprehensive unit test suites using Jest and React Testing Library.'
      }
    ],
    education: [
      {
        institution: 'University of California, Berkeley',
        degree: 'B.S. in Computer Science',
        period: '2017 - 2021'
      }
    ],
    projects: [
      {
        name: 'Insignia AI Suite',
        tech: 'JS, Glassmorphism CSS, Web APIs',
        description: 'Built an all-in-one AI interview preparation platform with live resume scoring and timed mock interview simulation.'
      }
    ]
  },

  bookmarks: [],
  notes: 'Key Reminders for Technical Round:\n- Use STAR method for behavioral questions\n- Explain time/space complexity before coding\n- Ask clarifying questions early!',
  activeView: 'dashboard'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadStoredState();
  initBackgroundParticles();
  setupNavigation();
  setupAuthModal();

  // Render Initial View
  renderActiveView(InsigniaState.activeView);
  updateUserUI();

  // Only broadcast to server if user is a real registered account (not a guest)
  setTimeout(() => {
    if (window.broadcastAccountToServer && InsigniaState.currentUser.isRegistered && InsigniaState.currentUser.email) {
      window.broadcastAccountToServer(InsigniaState.currentUser);
    }
  }, 500);
});

// View Hook: Profile Setup
window.InsigniaViews = window.InsigniaViews || {};
window.InsigniaViews.profile = function renderProfileView() {
  const u = InsigniaState.currentUser;
  const nameEl = document.getElementById('prof-name');
  const emailEl = document.getElementById('prof-email');
  const titleEl = document.getElementById('prof-title');
  const levelEl = document.getElementById('prof-level');
  const phoneEl = document.getElementById('prof-phone');
  const locationEl = document.getElementById('prof-location');
  const bioEl = document.getElementById('prof-bio');

  if (nameEl) nameEl.value = u.name || '';
  if (emailEl) emailEl.value = u.email || '';
  if (titleEl) titleEl.value = u.targetTitle || '';
  if (levelEl) levelEl.value = u.experienceLevel || 'Mid-Level';
  if (phoneEl) phoneEl.value = u.phone || '';
  if (locationEl) locationEl.value = u.location || '';
  if (bioEl) bioEl.value = u.bio || '';
};

// Load persistent state from localStorage
function loadStoredState() {
  const savedState = localStorage.getItem('insignia_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);

      // Clear stale legacy state: if the saved user is the old hardcoded "Alex Morgan" placeholder,
      // or has the legacy example.com email without isRegistered flag, reset to guest mode.
      if (parsed.currentUser) {
        const isLegacyPlaceholder = 
          parsed.currentUser.email === 'alex.morgan@example.com' ||
          (parsed.currentUser.email && parsed.currentUser.email.endsWith('@example.com') && !parsed.currentUser.isRegistered);
        
        if (isLegacyPlaceholder) {
          // Keep the rest of state (peerNetwork, stats, etc.) but reset current user to guest
          delete parsed.currentUser;
          console.info('Cleared legacy Alex Morgan placeholder — starting as Guest.');
        }
      }

      Object.assign(InsigniaState, parsed);
    } catch (e) {
      console.warn('Failed to parse saved state:', e);
    }
  }
}

// Save state to localStorage
function saveState() {
  localStorage.setItem('insignia_state', JSON.stringify(InsigniaState));
}

// Navigation & View Routing
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetView = btn.dataset.view;
      if (!targetView) return;
      
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderActiveView(targetView);

      // Close mobile sidebar if open
      document.querySelector('.sidebar')?.classList.remove('open');
    });
  });

  // Mobile menu toggle
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });
  }
}

function renderActiveView(viewName) {
  InsigniaState.activeView = viewName;
  saveState();

  const views = document.querySelectorAll('.view-content');
  views.forEach(view => {
    view.classList.remove('active');
  });

  const activeElem = document.getElementById(`view-${viewName}`);
  if (activeElem) {
    activeElem.classList.add('active');
  }

  // Update page header title
  const titleElem = document.getElementById('page-title');
  const subtitleElem = document.getElementById('page-subtitle');

  const pageInfoMap = {
    dashboard: { title: 'Dashboard Command Center', sub: 'Monitor your interview readiness and access preparation tools' },
    profile: { title: 'User Profile Management', sub: 'Update your professional details, skills, and target job roles' },
    resume: { title: 'ATS Resume Builder & Preview', sub: 'Create and analyze ATS-friendly resumes in real-time' },
    qna: { title: 'AI Interview Q&A Generator', sub: 'Practice role-specific technical and HR questions with model answers' },
    study: { title: 'Structured Study Hub', sub: 'Explore curated learning paths and track topic completions' },
    mock: { title: 'Timed Mock Interview Simulator', sub: 'Simulate realistic interview sessions with timer and feedback' },
    skillconnect: { title: 'Skill Connect Network', sub: 'Match skills you know with skills you want to learn with real users' }
  };

  if (pageInfoMap[viewName]) {
    if (titleElem) titleElem.textContent = pageInfoMap[viewName].title;
    if (subtitleElem) subtitleElem.textContent = pageInfoMap[viewName].sub;
  }

  // Trigger view specific initialization hooks
  if (window.InsigniaViews && window.InsigniaViews[viewName]) {
    window.InsigniaViews[viewName]();
  }
}

// User UI Updates
function updateUserUI() {
  const nameElems = document.querySelectorAll('.user-name-text');
  const roleElems = document.querySelectorAll('.user-role-text');
  const avatarElems = document.querySelectorAll('.user-avatar-text');

  const name = InsigniaState.currentUser.name || 'Guest User';
  const email = InsigniaState.currentUser.email || '';
  const role = email || InsigniaState.currentUser.targetTitle || 'Job Seeker';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  nameElems.forEach(el => el.textContent = name);
  roleElems.forEach(el => el.textContent = role);
  avatarElems.forEach(el => el.textContent = initials);

  // Profile Completeness Score calculation
  calculateProfileCompleteness();
}

function calculateProfileCompleteness() {
  const u = InsigniaState.currentUser;
  let score = 0;
  if (u.name) score += 20;
  if (u.email) score += 15;
  if (u.targetTitle) score += 20;
  if (u.skillsKnown && u.skillsKnown.length > 0) score += 25;
  if (u.linkedin || u.github) score += 20;

  const badgeElem = document.getElementById('profile-completeness-text');
  if (badgeElem) {
    badgeElem.textContent = `Profile: ${score}% Complete`;
  }
}

// Auth & Guest Access System
function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const openBtns = document.querySelectorAll('.trigger-auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const guestBtn = document.getElementById('btn-guest-login');
  const loginForm = document.getElementById('form-login');

  openBtns.forEach(btn => {
    btn.addEventListener('click', () => modal.classList.add('active'));
  });

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      InsigniaState.currentUser.isGuest = true;
      InsigniaState.currentUser.name = 'Guest Prepare User';
      InsigniaState.currentUser.targetTitle = 'Full Stack Developer (Guest)';
      updateUserUI();
      saveState();
      modal.classList.remove('active');
      showToast('Logged in as Guest User', 'info');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const name = document.getElementById('login-name')?.value.trim() || InsigniaState.currentUser.name;
      if (!email) return;

      // Only update if this is a real new login (not the placeholder)
      InsigniaState.currentUser.email = email;
      InsigniaState.currentUser.name = name || email.split('@')[0];
      InsigniaState.currentUser.isGuest = false;
      InsigniaState.currentUser.isRegistered = true;

      // Generate ID based on email
      InsigniaState.currentUser.id = 'usr_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');

      updateUserUI();
      saveState();

      if (window.broadcastAccountToServer) {
        window.broadcastAccountToServer(InsigniaState.currentUser);
      }

      modal.classList.remove('active');
      showToast(`Welcome, ${InsigniaState.currentUser.name}! Profile synced across devices.`, 'success');
    });
  }

  // Profile Setup Form Submission Handler
  const profForm = document.getElementById('form-profile-setup');
  if (profForm) {
    profForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('prof-name')?.value || InsigniaState.currentUser.name;
      const email = document.getElementById('prof-email')?.value || InsigniaState.currentUser.email;
      const title = document.getElementById('prof-title')?.value || InsigniaState.currentUser.targetTitle;
      const level = document.getElementById('prof-level')?.value || InsigniaState.currentUser.experienceLevel;
      const phone = document.getElementById('prof-phone')?.value || InsigniaState.currentUser.phone;
      const location = document.getElementById('prof-location')?.value || InsigniaState.currentUser.location;
      const bio = document.getElementById('prof-bio')?.value || InsigniaState.currentUser.bio;

      InsigniaState.currentUser.name = name;
      InsigniaState.currentUser.email = email;
      InsigniaState.currentUser.targetTitle = title;
      InsigniaState.currentUser.experienceLevel = level;
      InsigniaState.currentUser.phone = phone;
      InsigniaState.currentUser.location = location;
      InsigniaState.currentUser.bio = bio;

      // Mark as registered so they appear in Skill Connect network
      if (name && email) {
        InsigniaState.currentUser.isRegistered = true;
        InsigniaState.currentUser.isGuest = false;
        if (!InsigniaState.currentUser.id) {
          InsigniaState.currentUser.id = 'usr_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
      }

      updateUserUI();
      saveState();

      if (window.broadcastAccountToServer && InsigniaState.currentUser.isRegistered) {
        window.broadcastAccountToServer(InsigniaState.currentUser);
      }

      showToast('Profile Details Saved & Synced across all connected devices!', 'success');
    });
  }
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: 'bi-check-circle-fill',
    info: 'bi-info-circle-fill',
    warning: 'bi-exclamation-triangle-fill'
  };

  toast.innerHTML = `
    <i class="bi ${iconMap[type] || 'bi-info-circle-fill'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Interactive Ambient Canvas Particle Background
function initBackgroundParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.floor(width / 25);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.4 + 0.1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();
}
