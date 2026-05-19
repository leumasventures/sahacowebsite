/* ============================================================
   Sacred Heart College – School Management Dashboard
   script2.js – v3.0  |  Role-Enforced Application Logic
   Roles: Admin (full) | Teacher (results + attendance) | Parent (view results only)
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────
   1. APP STATE
───────────────────────────────────────── */
window.App = window.App || {
  currentSection: 'dashboard',
  currentUser: { name: 'SAHARCO', role: 'Admin', privileges: null },
  sidebarCollapsed: false,

  data: {
    classes: [],
    students: [],
    teachers: [],
    subjects: [],
    results: [],
    attendance: [],
    remarks: [],
    subjectAllocations: {}, // { studentId: [subjectNames] } for SS2/SS3, { 'ClassName_Arm': [subjectNames] } for others

    fixtures: [],

    schoolInfo: {
      name:      'Sacred Heart College Eziukwu Aba',
      session:   '2025/2026',
      term:      'Second Term',
      principal: 'Rev. Fr. Sullivan Obinna Achilihu',
    },
  },
};

/* ─────────────────────────────────────────
   2. PRIVILEGE HELPERS
   Central place for all access checks.
───────────────────────────────────────── */
const priv = {
  /** Is the current role Admin? */
  isAdmin:   () => App.currentUser.role === 'Admin',
  /** Is the current role Teacher? */
  isTeacher: () => App.currentUser.role === 'Teacher',
  /** Is the current role Parent? */
  isParent:  () => App.currentUser.role === 'Parent',

  /** Can the user enter or edit results? */
  canEnterResults: () => {
    const p = App.currentUser.privileges;
    return p ? p.canEnterResults === true : priv.isAdmin() || priv.isTeacher();
  },

  /** Can the user take attendance? */
  canTakeAttendance: () => {
    const p = App.currentUser.privileges;
    return p ? p.canTakeAttendance === true : priv.isAdmin() || priv.isTeacher();
  },

  /** Can the user manage students / staff / classes? (Admin only) */
  canManage: () => {
    const p = App.currentUser.privileges;
    return p ? p.canManageStudents === true : priv.isAdmin();
  },

  /** Can the user access settings? (Admin only) */
  canAccessSettings: () => {
    const p = App.currentUser.privileges;
    return p ? p.canAccessSettings === true : priv.isAdmin();
  },

  /** Can the user add principal/teacher remarks? (Admin only) */
  canAddRemarks: () => {
    const p = App.currentUser.privileges;
    return p ? p.canAddRemarks === true : priv.isAdmin();
  },

  /**
   * Teacher class/arm scope guard.
   * Admins always pass. Teachers only pass for their own assigned class/arm.
   */
  canActOnClass: (cls, arm) => {
    if (priv.isAdmin()) return true;
    const u = App.currentUser;
    return u.assignedClass === cls && u.assignedArm === arm;
  },
};

/* Deny helper — shows toast and returns true when access is blocked */
function denyAccess(msg = 'Access denied.') {
  toast(msg, 'error');
  return true; // caller does: if (denyAccess()) return;
}

/* ─────────────────────────────────────────
   3. UTILITIES
───────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function toast(message, type = 'info') {
  const existing = document.getElementById('toast-container');
  const container = existing || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;top:1.2rem;right:1.2rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;';
    document.body.appendChild(c);
    return c;
  })();

  const colors = { info: '#3b82f6', success: '#22c55e', warning: '#f59e0b', error: '#ef4444' };
  const t = document.createElement('div');
  t.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:.75rem 1.25rem;border-radius:8px;
    font-size:.875rem;box-shadow:0 4px 12px rgba(0,0,0,.2);max-width:340px;
    animation:slideInRight .25s ease;cursor:pointer;`;
  t.textContent = message;
  t.onclick = () => t.remove();
  container.appendChild(t);

  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `@keyframes slideInRight{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}`;
    document.head.appendChild(s);
  }
  setTimeout(() => t.remove(), 4000);
}

function confirmDlg(message) { return window.confirm(message); }

function grade(score) {
  if (score >= 70) return { letter: 'A', remark: 'Excellent' };
  if (score >= 60) return { letter: 'B', remark: 'Very Good' };
  if (score >= 50) return { letter: 'C', remark: 'Good' };
  if (score >= 45) return { letter: 'D', remark: 'Pass' };
  if (score >= 40) return { letter: 'E', remark: 'Weak Pass' };
  return { letter: 'F', remark: 'Fail' };
}

function makeId(prefix, arr) { return prefix + String(arr.length + 1).padStart(3, '0'); }
function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ─────────────────────────────────────────
   4. NAVIGATION
───────────────────────────────────────── */
function navigate(sectionId) {
  /* Block sections the role can't see */
  const allowed = App.currentUser.privileges?.allowedSections;
  if (allowed && !allowed.includes(sectionId)) {
    const fallback = priv.isParent() ? 'results' : 'dashboard';
    if (sectionId !== fallback) { navigate(fallback); return; }
  }

  $$('.content-section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(sectionId);
  if (target) { target.classList.remove('hidden'); App.currentSection = sectionId; }

  $$('.sidebar-nav a').forEach(a => {
    a.closest('li')?.classList.remove('active');
    if (a.getAttribute('href') === `#${sectionId}`) a.closest('li')?.classList.add('active');
  });

  const titleMap = {
    dashboard:       'School Dashboard',
    classes:         'Classes',
    arms:            'Class Arms',
    students:        'Students',
    teachers:        'Staff',
    subjects:        'Subjects',
    results:         'Results',
    'report-cards':  'Report Cards',
    attendance:      'Attendance',
    fixtures:        'Fixtures & Honours',
    'parent-portal': 'Parent Portal',
    'timetable':     'Timetable',
    'fees':            'Fee Setup & Templates',
    'levies':          'Levies',
    'former-students': 'Former Students',
    'former-staff':    'Former Staff',
    'access-tokens': 'Access Tokens',
    'users':         'User Management',
    settings:        'Settings',

    // ── Admission pages (external — title only, no renderSection needed) ──
    admissions:      'Admission List',
    'new-admission': 'New Registration',
    enroll:          'Enroll Students',
  };

  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titleMap[sectionId] || sectionId;

  renderSection(sectionId);
}

function renderSection(id) {
  switch (id) {
    case 'dashboard':       renderDashboard();    break;
    case 'classes':         renderClasses();      break;
    case 'arms':            renderArms();         break;
    case 'students':        renderStudents();     break;
    case 'teachers':        renderTeachers();     break;
    case 'subjects':        renderSubjects();     break;
    case 'results':         renderResults();      break;
    case 'report-cards':    renderReportCards();  break;
    case 'attendance':      renderAttendance();   break;
    case 'fixtures':        renderFixtures();     break;
    case 'settings':        renderSettings();     break;
    case 'timetable':       renderTimetable();    break;
    case 'fees':            renderFees();           break;
    case 'levies':          navigate('fees'); return; // merged into Finance
    case 'former-students': renderFormerStudents(); break;
    case 'former-staff':    renderFormerStaff();    break;
    case 'access-tokens':   renderAccessTokens(); break;
    case 'users':           renderUsers();        break;

    // ── Admission pages live on their own HTML files ──
    case 'admissions':      window.location.href = 'admissionList.html'; break;
    case 'new-admission':   window.location.href = 'regForm.html';       break;
    case 'enroll':          window.location.href = 'enroll.html';        break;
  }
}

/* ─────────────────────────────────────────
   5. SIDEBAR
───────────────────────────────────────── */
function initSidebar() {
  /* Hide nav links that the current role cannot access */
  $$('.sidebar-nav a[href]').forEach(a => {
    const section = a.getAttribute('href').replace('#', '');
    const allowed = App.currentUser.privileges?.allowedSections;
    if (allowed && !allowed.includes(section)) {
      a.closest('li')?.style.setProperty('display', 'none');
    }
  });

  $$('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const hash = a.getAttribute('href').replace('#', '');
      navigate(hash);
      if (window.innerWidth < 768) collapseSidebar(true);
    });
  });

  const toggleBtn = $('.sidebar-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => toggleSidebar());

  const ham = document.getElementById('sidebar-toggle-mobile');
  if (ham) ham.addEventListener('click', () => toggleSidebar());

  $$('.has-submenu > a').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); a.closest('li').classList.toggle('open'); });
  });
}

function toggleSidebar() { App.sidebarCollapsed = !App.sidebarCollapsed; collapseSidebar(App.sidebarCollapsed); }
function collapseSidebar(collapsed) {
  const sidebar = document.getElementById('sidebar');
  const main = $('.main-container');
  App.sidebarCollapsed = collapsed;
  sidebar?.classList.toggle('collapsed', collapsed);
  main?.classList.toggle('sidebar-collapsed', collapsed);
}

/* ─────────────────────────────────────────
   6. DASHBOARD
   Parents → redirect to results immediately
───────────────────────────────────────── */
function renderDashboard() {
  /* Parents should never land on the dashboard */
  if (priv.isParent()) { navigate('results'); return; }

  const s = App.data;
  const lowAttendance = s.students.filter(st => st.attendance < 75).length;
  const avgAtt = s.students.length
    ? (s.students.reduce((a, b) => a + b.attendance, 0) / s.students.length).toFixed(1) : 0;

  const statsMap = {
    'Total Students':        { val: s.students.length,     trend: `${s.classes.length} `, cls: '' },
    'Pending Results':       { val: 0,                    trend: '',           cls: 'warning' },
    'Average Attendance':    { val: avgAtt + '%',          trend: '',            cls: 'success' },
    'Active Staff':          { val: s.teachers.length,     trend: `${s.teachers.length} `, cls: '' },
    'Subjects Offered':      { val: s.subjects.length,     trend: '',                             cls: 'info' },
    'Low Attendance Alerts': { val: lowAttendance,         trend: '',              cls: 'alert' },
  };

  const grid = document.getElementById('dashboard-stats');
  if (!grid) return;
  grid.innerHTML = Object.entries(statsMap).map(([label, d]) => `
    <div class="stat-card ${d.cls}" style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid ${statColor(d.cls)};">
      <h4 style="margin:0 0 .5rem;font-size:.85rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">${label}</h4>
      <div class="number" style="font-size:2rem;font-weight:700;color:#111827;">${d.val}</div>
      ${d.trend ? `<span style="font-size:.8rem;color:#6b7280;">${d.trend}</span>` : ''}
    </div>
  `).join('');

  /* Only show buttons relevant to the role */
  const btnPrimary   = $('.btn-primary');
  const btnSecondary = $('.btn-secondary');
  const btnOutline   = $('.btn-outline');
  if (btnPrimary)   btnPrimary.onclick   = () => navigate('results');
  if (btnSecondary) btnSecondary.onclick = () => navigate('report-cards');
  if (btnOutline) {
    if (priv.canTakeAttendance()) {
      btnOutline.onclick = () => navigate('attendance');
    } else {
      btnOutline.style.display = 'none';
    }
  }
}

function statColor(cls) {
  const map = { warning: '#f59e0b', success: '#22c55e', info: '#3b82f6', alert: '#ef4444', '': '#6366f1' };
  return map[cls] || '#6366f1';
}

/* ─────────────────────────────────────────────────────────────────
   7. CLASSES  (Admin only)
   
   Supports all school tiers:
     • Day Care   (Creche / Toddler / Reception)
     • Nursery    (Nursery 1, Nursery 2, Nursery 3)
     • Primary    (Primary 1–6)
     • Junior     (JSS 1–3)
     • Senior     (SSS 1–3)

   Improvements over base version:
   • 5-level system with distinct palette + icons per tier
   • Stats row scoped per tier (collapsible tier groups in table)
   • Level presets: selecting a tier pre-fills suggested class names
   • Age range helper shown per tier in modal
   • Arm manager: add/remove chips, quick-add presets
   • Cascade guard: block delete if students enrolled
   • Duplicate name validation across all tiers
   • Filter by tier tabs + text search
   • Animated save highlight on row
   • Full backward-compat — existing Junior/Senior data unaffected
───────────────────────────────────────────────────────────────── */

/* ── TIER CONFIG  (single source of truth) ──────────────────── */
const CLASS_TIERS = {
  'Day Care': {
    icon:      '🍼',
    color:     '#f472b6',   // pink
    surface:   '#fdf2f8',
    border:    '#f9a8d4',
    text:      '#be185d',
    badge:     'pink',
    ageRange:  '0 – 2 years',
    presets:   ['Creche', 'Toddler', 'Reception'],
    armSuggestions: ['A', 'B'],
  },
  'Nursery': {
    icon:      '🌱',
    color:     '#34d399',   // emerald
    surface:   '#ecfdf5',
    border:    '#6ee7b7',
    text:      '#065f46',
    badge:     'success',
    ageRange:  '3 – 5 years',
    presets:   ['Nursery 1', 'Nursery 2', 'Nursery 3'],
    armSuggestions: ['A', 'B', 'C'],
  },
  'Primary': {
    icon:      '📖',
    color:     '#60a5fa',   // blue
    surface:   '#eff6ff',
    border:    '#bfdbfe',
    text:      '#1d4ed8',
    badge:     'info',
    ageRange:  '6 – 11 years',
    presets:   ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6'],
    armSuggestions: ['A', 'B', 'C', 'D'],
  },
  'Junior': {
    icon:      '📘',
    color:     '#818cf8',   // indigo
    surface:   '#eef2ff',
    border:    '#c7d2fe',
    text:      '#3730a3',
    badge:     'purple',
    ageRange:  '11 – 14 years',
    presets:   ['JSS 1', 'JSS 2', 'JSS 3'],
    armSuggestions: ['A', 'B', 'C', 'D', 'E'],
  },
  'Senior': {
    icon:      '🎓',
    color:     '#f59e0b',   // amber
    surface:   '#fffbeb',
    border:    '#fde68a',
    text:      '#92400e',
    badge:     'warning',
    ageRange:  '14 – 18 years',
    presets:   ['SSS 1', 'SSS 2', 'SSS 3'],
    armSuggestions: ['A', 'B', 'C', 'D', 'E'],
  },
};

const TIER_ORDER = ['Day Care','Nursery','Primary','Junior','Senior'];

/* ── TIER BADGE INLINE STYLE ─────────────────────────────────── */
function tierBadgeStyle(level) {
  const t = CLASS_TIERS[level];
  if (!t) return badgeStyle('neutral');
  return `display:inline-flex;align-items:center;gap:.3rem;background:${t.surface};color:${t.text};border:1px solid ${t.border};padding:.2rem .65rem;border-radius:9999px;font-size:.75rem;font-weight:700;white-space:nowrap;`;
}

/* ── MAIN RENDER ─────────────────────────────────────────────── */

/* ── Sections moved to separate files — see dashboard.html script tags ── */
/* classes.js | students.js | staff.js | subjects.js | results.js        */
/* attendance.js | fixtures.js | settings.js | change-password.js        */
/* access-tokens.js | users.js | report-card.js                          */