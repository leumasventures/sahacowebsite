/* ============================================================
   PATCH FILE — script2.js  DB Integration
   
   These are the EXACT functions to find and REPLACE in your
   existing script2.js. Do not touch anything else.
   
   Database: u156099858_shcaba_db
   API:      https://sacredheartcollegeaba.com/api
   
   Changes:
   1. init()           — fetches real data from DB on load
   2. renderDashboard()— uses DB counts (students, admissions, etc.)
   3. renderStudents() — fetches enrolled students from DB
   4. renderClasses()  — fetches real classes + student counts from DB
   5. navigate()       — admission pages redirect, everything else DB-backed
   ============================================================ */

'use strict';

import { Auth, Students, Classes, Admissions, Teachers, Subjects, Reports } from './api.js';

/* ─────────────────────────────────────────────────────────────
   SECTION 1 — APP STATE
   Keep this exactly as-is. Just add the _db cache below it.
───────────────────────────────────────────────────────────── */

window.App = window.App || {
  currentSection: 'dashboard',
  currentUser:    { name: 'SAHARCO', role: 'Admin', privileges: null },
  sidebarCollapsed: false,
  data: {
    classes:    [],
    students:   [],
    teachers:   [],
    subjects:   [],
    results:    [],
    attendance: [],
    remarks:    [],
    subjectAllocations: {},
    fixtures:   [],
    schoolInfo: {
      name:      'Sacred Heart College Eziukwu Aba',
      session:   '2025/2026',
      term:      'Second Term',
      principal: 'Rev. Fr. Emmanuel Eze',
    },
  },
};

/* ─────────────────────────────────────────────────────────────
   DB CACHE
   In-memory store for data fetched from the database.
   Avoids re-fetching on every navigate() call.
   Call refreshDBCache() to force a reload.
───────────────────────────────────────────────────────────── */
const _db = {
  students:   null,   // fetched once, invalidated on enroll
  classes:    null,   // fetched once
  teachers:   null,
  subjects:   null,
  dashStats:  null,   // { students, teachers, pending_admissions, ... }
  loading:    {},     // { students: true/false, ... }
};

async function getStudents(force = false) {
  if (_db.students && !force) return _db.students;
  _db.loading.students = true;
  try {
    const res = await Students.getAll({ limit: 2000 });
    _db.students = res.data ?? res ?? [];
    App.data.students = _db.students;  // keep App.data in sync for legacy code
  } catch (e) {
    console.error('[SHC] getStudents:', e.message);
    _db.students = [];
  }
  _db.loading.students = false;
  return _db.students;
}

async function getClasses(force = false) {
  if (_db.classes && !force) return _db.classes;
  try {
    const res = await Classes.getAll();
    _db.classes = res.data ?? res ?? [];
    App.data.classes = _db.classes;
  } catch (e) {
    console.error('[SHC] getClasses:', e.message);
    _db.classes = [];
  }
  return _db.classes;
}

async function getTeachers(force = false) {
  if (_db.teachers && !force) return _db.teachers;
  try {
    const res = await Teachers.getAll({ limit: 500 });
    _db.teachers = res.data ?? res ?? [];
    App.data.teachers = _db.teachers;
  } catch (e) {
    _db.teachers = [];
  }
  return _db.teachers;
}

async function getSubjects(force = false) {
  if (_db.subjects && !force) return _db.subjects;
  try {
    const res = await Subjects.getAll();
    _db.subjects = res.data ?? res ?? [];
    App.data.subjects = _db.subjects;
  } catch (e) {
    _db.subjects = [];
  }
  return _db.subjects;
}

async function getDashStats(force = false) {
  if (_db.dashStats && !force) return _db.dashStats;
  try {
    const res = await Reports.dashboard();
    _db.dashStats = res.data ?? res ?? {};
  } catch (e) {
    _db.dashStats = {};
  }
  return _db.dashStats;
}

/** Call this after an enrollment to refresh student + class counts */
window.refreshDBCache = async function() {
  _db.students  = null;
  _db.classes   = null;
  _db.dashStats = null;
  await Promise.all([ getStudents(true), getClasses(true), getDashStats(true) ]);
};

/* ─────────────────────────────────────────────────────────────
   SECTION 2 — INIT
   REPLACE your existing init() with this.
───────────────────────────────────────────────────────────── */
async function init() {

  /* Auth guard — redirect to login if no valid session */
  try {
    const { user } = await Auth.me();
    App.currentUser = {
      name:          user.name          ?? 'Admin',
      role:          user.role          ?? 'Admin',
      email:         user.email         ?? '',
      teacherId:     user.teacher_id    ?? null,
      assignedClass: user.assigned_class ?? null,
      assignedArm:   user.assigned_arm   ?? null,
      studentId:     user.student_id    ?? null,
      privileges:    user.privileges    ?? null,
    };
  } catch {
    window.location.replace('login.html');
    return;
  }

  /* Update user display */
  const userEl = document.getElementById('current-user-name-role');
  if (userEl) userEl.textContent = `${App.currentUser.name} (${App.currentUser.role})`;

  /* Sidebar + logout */
  initSidebar();
  const doLogout = async () => {
    try { await Auth.logout(); } catch {}
    window.location.replace('login.html');
  };
  document.getElementById('logout-btn')?.addEventListener('click', doLogout);
  document.getElementById('logout-btn-top')?.addEventListener('click', doLogout);

  /* Keyboard */
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* Pre-fetch core data in background (non-blocking) */
  Promise.all([ getClasses(), getStudents(), getTeachers(), getSubjects(), getDashStats() ])
    .catch(e => console.warn('[SHC] background prefetch:', e.message));

  /* Hash routing */
  function handleHash() {
    const hash = window.location.hash.replace('#', '') || (priv.isParent() ? 'results' : 'dashboard');
    navigate(hash);
  }
  window.addEventListener('hashchange', handleHash);
  handleHash();
}

document.addEventListener('DOMContentLoaded', init);

/* ─────────────────────────────────────────────────────────────
   SECTION 3 — NAVIGATE
   REPLACE your existing navigate() with this.
   Admission pages redirect to their own HTML files.
   All other sections load from DB.
───────────────────────────────────────────────────────────── */
function navigate(sectionId) {
  /* Admission pages live in their own HTML files — redirect */
  const externalPages = {
    admissions:      'admissionList.html',
    'new-admission': 'regForm.html',
    enroll:          'enroll.html',
  };
  if (externalPages[sectionId]) {
    window.location.href = externalPages[sectionId];
    return;
  }

  /* Role-based access guard */
  const allowed = App.currentUser.privileges?.allowedSections;
  if (allowed && !allowed.includes(sectionId)) {
    const fallback = priv.isParent() ? 'results' : 'dashboard';
    if (sectionId !== fallback) { navigate(fallback); return; }
  }

  /* Show the right section panel */
  $$('.content-section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(sectionId);
  if (target) { target.classList.remove('hidden'); App.currentSection = sectionId; }

  /* Sidebar active state — works for hash links AND plain href links */
  $$('.sidebar-nav a').forEach(a => {
    a.closest('li')?.classList.remove('active');
    const href = a.getAttribute('href') ?? '';
    if (href === `#${sectionId}` || href.endsWith(`#${sectionId}`)) {
      a.closest('li')?.classList.add('active');
    }
  });

  /* Page title */
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
    settings:        'Settings',
    admissions:      'Admission List',
    'new-admission': 'New Registration',
    enroll:          'Enroll Students',
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titleMap[sectionId] ?? sectionId;

  renderSection(sectionId);
}

function renderSection(id) {
  switch (id) {
    case 'dashboard':     renderDashboard();    break;
    case 'classes':       renderClasses();      break;
    case 'arms':          renderArms();         break;
    case 'students':      renderStudents();     break;
    case 'teachers':      renderTeachers();     break;
    case 'subjects':      renderSubjects();     break;
    case 'results':       renderResults();      break;
    case 'report-cards':  renderReportCards();  break;
    case 'attendance':    renderAttendance();   break;
    case 'fixtures':      renderFixtures();     break;
    case 'settings':      renderSettings();     break;
    /* Admission pages — should never reach here (navigate() redirects first) */
    case 'admissions':    window.location.href = 'admissionList.html'; break;
    case 'new-admission': window.location.href = 'regForm.html';       break;
    case 'enroll':        window.location.href = 'enroll.html';        break;
  }
}

/* ─────────────────────────────────────────────────────────────
   SECTION 4 — DASHBOARD
   REPLACE your existing renderDashboard() with this.
   Pulls real counts from the DB via Reports.dashboard().
───────────────────────────────────────────────────────────── */
async function renderDashboard() {
  if (priv.isParent()) { navigate('results'); return; }

  const section = document.getElementById('dashboard');
  const grid    = document.getElementById('dashboard-stats');

  /* Show skeleton while loading */
  if (grid) {
    grid.innerHTML = Array(6).fill(`
      <div class="stat-card" style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="height:12px;width:55%;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:4px;margin-bottom:.75rem;"></div>
        <div style="height:28px;width:40%;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:4px;"></div>
      </div>`).join('');
  }

  /* Fetch dashboard stats from DB */
  const stats = await getDashStats();

  /* Fetch pending admissions count separately if not in stats */
  let pendingAdm = stats.pending_admissions ?? 0;
  if (!pendingAdm) {
    try {
      const admStats = await Admissions.getStats();
      pendingAdm = (admStats.data ?? admStats)?.pending ?? 0;
    } catch {}
  }

  /* Students already in DB (enrolled) */
  const students   = await getStudents();
  const lowAtt     = students.filter(s => (s.attendance ?? 100) < 75).length;
  const avgAtt     = students.length
    ? (students.reduce((a, b) => a + (b.attendance ?? 100), 0) / students.length).toFixed(1)
    : '—';

  const statsMap = [
    {
      label: 'Total Students',
      val:   stats.students        ?? students.length,
      trend: `${(await getClasses()).length} class(es)`,
      color: '#6366f1',
      cls:   '',
    },
    {
      label: 'Pending Admissions',
      val:   pendingAdm,
      trend: 'Awaiting approval',
      color: '#f59e0b',
      cls:   'warning',
    },
    {
      label: 'Avg Attendance',
      val:   stats.avg_attendance  ?? avgAtt + '%',
      trend: 'This term',
      color: '#22c55e',
      cls:   'success',
    },
    {
      label: 'Active Staff',
      val:   stats.teachers        ?? (await getTeachers()).length,
      trend: 'Teaching staff',
      color: '#3b82f6',
      cls:   '',
    },
    {
      label: 'Subjects Offered',
      val:   stats.subjects        ?? (await getSubjects()).length,
      trend: 'Across all classes',
      color: '#c9962c',
      cls:   'gold',
    },
    {
      label: 'Low Attendance',
      val:   stats.low_attendance  ?? lowAtt,
      trend: 'Students < 75%',
      color: '#ef4444',
      cls:   'alert',
    },
  ];

  if (grid) {
    grid.innerHTML = statsMap.map(d => `
      <div class="stat-card ${d.cls}" style="
        background:#fff; border-radius:12px; padding:1.5rem;
        box-shadow:0 2px 8px rgba(0,0,0,.07);
        border-left:4px solid ${d.color};
        transition:transform .2s,box-shadow .2s;
        cursor:default;">
        <h4 style="margin:0 0 .5rem;font-size:.82rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">${d.label}</h4>
        <div class="number" style="font-size:2rem;font-weight:700;color:#111827;">${d.val}</div>
        ${d.trend ? `<span style="font-size:.78rem;color:#9ca3af;">${d.trend}</span>` : ''}
      </div>`).join('');
  }

  /* Quick-action buttons */
  const btnPrimary   = section?.querySelector('.btn-primary');
  const btnSecondary = section?.querySelector('.btn-secondary');
  const btnOutline   = section?.querySelector('.btn-outline');
  if (btnPrimary)   btnPrimary.onclick   = () => navigate('results');
  if (btnSecondary) btnSecondary.onclick = () => navigate('report-cards');
  if (btnOutline) {
    if (priv.canTakeAttendance()) btnOutline.onclick = () => navigate('attendance');
    else btnOutline.style.display = 'none';
  }

  /* Session badge & footer */
  try {
    const si = App.data.schoolInfo;
    const chip = document.getElementById('session-badge');
    const foot = document.getElementById('footer-session');
    const txt  = `${si.session} · ${si.term}`;
    if (chip) chip.textContent = txt;
    if (foot) foot.textContent = txt;
  } catch {}

  /* Admissions widget in the quick actions area */
  const admBtn = section?.querySelector('.btn-gold');
  if (admBtn) admBtn.onclick = () => window.location.href = 'admissionList.html';
}

/* Add shimmer keyframe if not already present */
(function addShimmer() {
  if (document.getElementById('shimmer-style')) return;
  const s = document.createElement('style');
  s.id = 'shimmer-style';
  s.textContent = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
  document.head.appendChild(s);
})();

/* ─────────────────────────────────────────────────────────────
   SECTION 5 — STUDENTS
   REPLACE your existing renderStudents() with this.
   
   KEY BEHAVIOUR:
   • Fetches ALL enrolled students from DB (/students endpoint)
   • Students who were approved+enrolled via enroll.html
     already exist in the DB — they appear here automatically
   • The class column shows the class they were enrolled into
   • Filters work against DB data (client-side filtering after fetch)
───────────────────────────────────────────────────────────── */

/* Filter state */
let _studentFilter  = '';
let _studentFilters = {};
let _sortCol        = 'name';
let _sortDir        = 1;

async function renderStudents(filter = _studentFilter, filters = _studentFilters) {
  if (priv.isParent()) { navigate('results'); return; }

  _studentFilter  = filter;
  _studentFilters = filters;

  const section   = document.getElementById('students');
  const canManage = priv.canManage();

  /* Loading state */
  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:1rem;">
      <h2 style="margin:0;">Students</h2>
    </div>
    <div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 1rem;"></div>
      <p style="color:#6b7280;">Loading students from database…</p>
    </div>`;

  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(s);
  }

  /* Fetch from DB */
  let all = await getStudents();

  /* Client-side filtering */
  let list = all.filter(s => {
    const q = filter.toLowerCase();
    /* Support both snake_case (from DB) and camelCase (legacy) */
    const name      = (s.name ?? `${s.last_name ?? ''} ${s.first_name ?? ''}`).toLowerCase();
    const id        = (s.adm_no ?? s.id ?? '').toString().toLowerCase();
    const cls       = (s.class ?? s.class_name ?? '').toLowerCase();
    const parentStr = (s.parent ?? s.guardian_name ?? '').toLowerCase();

    if (q && !name.includes(q) && !id.includes(q) && !cls.includes(q) && !parentStr.includes(q)) return false;
    if (filters.cls    && (s.class ?? s.class_name) !== filters.cls)    return false;
    if (filters.arm    && s.arm !== filters.arm)                         return false;
    if (filters.gender && s.gender !== filters.gender)                   return false;
    if (filters.attn === 'low'  && (s.attendance ?? 100) >= 75)         return false;
    if (filters.attn === 'good' && (s.attendance ?? 100) <  75)         return false;
    return true;
  });

  /* Sort */
  list = list.slice().sort((a, b) => {
    const va = a[_sortCol] ?? a.name ?? '';
    const vb = b[_sortCol] ?? b.name ?? '';
    if (typeof va === 'number') return (va - vb) * _sortDir;
    return String(va).localeCompare(String(vb)) * _sortDir;
  });

  /* Stats */
  const male    = all.filter(s => s.gender === 'Male').length;
  const female  = all.filter(s => s.gender === 'Female').length;
  const lowAtt  = all.filter(s => (s.attendance ?? 100) < 75).length;
  const avgAtt  = all.length
    ? (all.reduce((a, b) => a + (b.attendance ?? 100), 0) / all.length).toFixed(1)
    : 0;

  /* Dropdown options from classes in DB */
  const classes  = await getClasses();
  const classSet = [...new Set(all.map(s => s.class ?? s.class_name).filter(Boolean))];
  const armSet   = [...new Set(all.map(s => s.arm).filter(Boolean))];

  const classOpts = ['', ...classSet].map(c =>
    `<option value="${c}" ${_studentFilters.cls===c?'selected':''}>${c||'All Classes'}</option>`).join('');
  const armOpts   = ['', ...armSet].map(a =>
    `<option value="${a}" ${_studentFilters.arm===a?'selected':''}>${a||'All Arms'}</option>`).join('');

  const si = col => _sortCol===col ? (_sortDir===1?' ↑':' ↓') : '';
  const th = (col, label) =>
    `<th style="${thStyle()};cursor:pointer;user-select:none;" onclick="window._setStudentSort('${col}')">${label}${si(col)}</th>`;

  section.innerHTML = `
    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1.5rem;">
      ${[['🎒','Total Students',all.length,'#2563eb'],['👦','Male',male,'#0891b2'],['👧','Female',female,'#7c3aed'],
         ['📉','Low Attendance',lowAtt,lowAtt>0?'#ef4444':'#059669'],['📊','Avg Attendance',avgAtt+'%','#d97706']]
        .map(([icon,label,val,color]) => `
          <div style="background:#fff;border-radius:12px;padding:.9rem 1.1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid ${color};">
            <div style="font-size:1.2rem;">${icon}</div>
            <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2;">${val}</div>
            <div style="font-size:.75rem;color:#6b7280;margin-top:.1rem;">${label}</div>
          </div>`).join('')}
    </div>

    <!-- Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;">
      <h2 style="margin:0;">Students
        <span style="font-size:.9rem;font-weight:400;color:#9ca3af;">(${list.length} of ${all.length})</span>
      </h2>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        ${canManage ? `
          <button onclick="window._openStudentModal()" style="${btnStyle('primary')}">+ Add Student</button>
          <button onclick="window.print()" style="${btnStyle('secondary')}">🖨 Print</button>
          <button onclick="window._refreshStudents()" style="${btnStyle('secondary')}">🔄 Refresh</button>
        ` : ''}
      </div>
    </div>

    <!-- Filter bar -->
    <div style="background:#fff;border-radius:10px;padding:.85rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1.25rem;display:flex;flex-wrap:wrap;gap:.65rem;align-items:center;">
      <input id="student-search" placeholder="🔍 Search name, adm no, parent…"
        value="${filter}"
        style="${inputStyle()};max-width:220px;padding:.45rem .75rem;font-size:.875rem;"
        oninput="window._filterStudents(this.value)">
      <select onchange="window._filterStudents(null,{..._studentFilters,cls:this.value})"
        style="${inputStyle()};max-width:140px;padding:.45rem .65rem;font-size:.85rem;">${classOpts}</select>
      <select onchange="window._filterStudents(null,{..._studentFilters,arm:this.value})"
        style="${inputStyle()};max-width:100px;padding:.45rem .65rem;font-size:.85rem;">${armOpts}</select>
      <select onchange="window._filterStudents(null,{..._studentFilters,gender:this.value})"
        style="${inputStyle()};max-width:110px;padding:.45rem .65rem;font-size:.85rem;">
        <option value="">All Genders</option>
        <option value="Male"   ${filters.gender==='Male'  ?'selected':''}>Male</option>
        <option value="Female" ${filters.gender==='Female'?'selected':''}>Female</option>
      </select>
      <select onchange="window._filterStudents(null,{..._studentFilters,attn:this.value})"
        style="${inputStyle()};max-width:150px;padding:.45rem .65rem;font-size:.85rem;">
        <option value="">All Attendance</option>
        <option value="low"  ${filters.attn==='low' ?'selected':''}>⚠ Below 75%</option>
        <option value="good" ${filters.attn==='good'?'selected':''}>✅ 75% &amp; above</option>
      </select>
      ${(filter || Object.values(filters).some(Boolean))
        ? `<button onclick="window._filterStudents('',{})" style="${btnStyle('secondary')};font-size:.8rem;padding:.35rem .75rem;">✕ Clear</button>` : ''}
    </div>

    <!-- Table -->
    ${list.length === 0 && all.length === 0
      ? `<div style="background:#fff;border-radius:12px;padding:4rem 2rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07);">
           <div style="font-size:3rem;margin-bottom:1rem;">🎒</div>
           <h3 style="margin:0 0 .5rem;color:#374151;">No students enrolled yet</h3>
           <p style="color:#9ca3af;margin:0 0 1.5rem;">
             Students appear here automatically once they are enrolled via the Admissions portal.
           </p>
           <a href="admissionList.html" style="${btnStyle('primary')};text-decoration:none;">📋 Go to Admission List</a>
         </div>`
      : `<div style="overflow-x:auto;">
         <table style="${tableStyle()}">
           <thead><tr style="${thRowStyle()}">
             ${th('adm_no','Adm. No.')}
             ${th('name','Student')}
             ${th('class','Class')}
             ${th('arm','Arm')}
             ${th('gender','Gender')}
             ${th('attendance','Attendance')}
             <th style="${thStyle()}">Actions</th>
           </tr></thead>
           <tbody>
             ${list.length
               ? list.map(s => studentRowDB(s, canManage)).join('')
               : `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#9ca3af;">
                    No students match your filters.
                    <button onclick="window._filterStudents('',{})" style="margin-left:.5rem;${btnStyle('secondary')};font-size:.8rem;">Clear filters</button>
                  </td></tr>`}
           </tbody>
         </table></div>`
    }`;

  /* Expose sort handler */
  window._setStudentSort = function(col) {
    if (_sortCol === col) _sortDir *= -1; else { _sortCol = col; _sortDir = 1; }
    renderStudents(_studentFilter, _studentFilters);
  };

  window._filterStudents = function(f, fil) {
    renderStudents(f ?? _studentFilter, fil ?? _studentFilters);
  };

  window._refreshStudents = async function() {
    _db.students = null;
    await renderStudents('', {});
  };
}

/* ── Single student row (DB version) ── */
function studentRowDB(s, canManage) {
  /* DB returns snake_case; support both */
  const name     = s.name ?? `${s.last_name ?? ''} ${s.first_name ?? ''}`.trim();
  const admNo    = s.adm_no ?? s.id ?? '—';
  const cls      = s.class ?? s.class_name ?? '—';
  const arm      = s.arm   ?? '—';
  const gender   = s.gender ?? '—';
  const att      = s.attendance ?? 100;
  const parent   = s.parent ?? s.guardian_name ?? '';

  const initials   = name.split(' ').slice(0,2).map(n=>n[0]??'').join('').toUpperCase();
  const color      = stringToColor(name);
  const attColor   = att < 75 ? '#ef4444' : att < 90 ? '#f59e0b' : '#22c55e';

  return `<tr id="student-row-${s.id}" style="${trStyle()}">
    <td style="${tdStyle()};font-family:monospace;font-size:.8rem;color:#6b7280;">${admNo}</td>
    <td style="${tdStyle()}">
      <div style="display:flex;align-items:center;gap:.65rem;">
        <div style="width:32px;height:32px;border-radius:50%;background:${color};
          display:flex;align-items:center;justify-content:center;
          font-size:.7rem;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
        <div>
          <div style="font-weight:600;color:#1e3a5f;">${name}</div>
          <div style="font-size:.75rem;color:#9ca3af;">${parent}</div>
        </div>
      </div>
    </td>
    <td style="${tdStyle()}">${cls}</td>
    <td style="${tdStyle()}"><span style="${badgeStyle('secondary')}">${arm}</span></td>
    <td style="${tdStyle()}"><span style="${badgeStyle(gender==='Female'?'info':'secondary')}">${gender}</span></td>
    <td style="${tdStyle()};min-width:120px;">
      <div style="display:flex;align-items:center;gap:.5rem;">
        <div style="flex:1;background:#e5e7eb;border-radius:4px;height:7px;min-width:60px;">
          <div style="width:${att}%;height:100%;border-radius:4px;background:${attColor};transition:width .3s;"></div>
        </div>
        <span style="font-size:.8rem;font-weight:700;color:${attColor};min-width:36px;">${att}%</span>
      </div>
    </td>
    <td style="${tdStyle()}">
      <button onclick="window._viewStudentDB('${s.id}')" style="${btnStyle('info','sm')}">👁 View</button>
      ${canManage ? `
        <button onclick="window._editStudentDB('${s.id}')" style="${btnStyle('secondary','sm')}">✏ Edit</button>
        <button onclick="window._deleteStudentDB('${s.id}')" style="${btnStyle('danger','sm')}">🗑</button>` : ''}
    </td>
  </tr>`;
}

/* ── View student (fetches full profile from DB) ── */
window._viewStudentDB = async function(id) {
  showModal(`<div style="text-align:center;padding:2rem;">
    <div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto;"></div>
    <p style="margin-top:.75rem;color:#6b7280;font-size:.875rem;">Loading student profile…</p>
  </div>`);
  try {
    const res = await Students.getById(id);
    const s   = res.data ?? res;
    const name = s.name ?? `${s.last_name ?? ''} ${s.first_name ?? ''}`.trim();
    const cls  = s.class ?? s.class_name ?? '—';
    showModal(`
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #f3f4f6;">
        <div style="width:52px;height:52px;border-radius:50%;background:${stringToColor(name)};display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;color:#fff;flex-shrink:0;">
          ${name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
        </div>
        <div>
          <h3 style="margin:0;">${name}</h3>
          <p style="margin:.2rem 0 0;font-size:.85rem;color:#6b7280;">${s.adm_no ?? s.id} &nbsp;·&nbsp; ${cls} ${s.arm ?? ''}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        ${[
          ['Adm. No.',    s.adm_no ?? '—'],
          ['Class',       `${cls} ${s.arm ?? ''}`],
          ['Gender',      s.gender ?? '—'],
          ['Date of Birth',s.dob ?? '—'],
          ['Guardian',    s.parent ?? s.guardian_name ?? '—'],
          ['Phone',       s.phone ?? s.guardian_phone ?? '—'],
          ['Attendance',  (s.attendance ?? 100) + '%'],
          ['Enroll Date', s.enroll_date ?? s.enrollDate ?? '—'],
        ].map(([k,v]) => `
          <div style="background:#f9fafb;border-radius:8px;padding:.65rem .9rem;">
            <div style="font-size:.75rem;color:#9ca3af;margin-bottom:.15rem;">${k}</div>
            <div style="font-weight:600;color:#1e3a5f;">${v}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem;">
        <button onclick="closeModal()" style="${btnStyle('primary')}">Close</button>
      </div>`);
  } catch (e) {
    showModal(`<p style="color:#ef4444;padding:1.5rem;">Failed to load student: ${e.message}</p>
      <div style="text-align:right;padding:0 1.5rem 1.5rem;"><button onclick="closeModal()" style="${btnStyle('secondary')}">Close</button></div>`);
  }
};

/* ── Edit student (PATCH to DB) ── */
window._editStudentDB = async function(id) {
  if (!priv.canManage()) { denyAccess('Only Admins can edit students.'); return; }
  let s;
  try { const res = await Students.getById(id); s = res.data ?? res; } catch (e) { toast(e.message, 'error'); return; }

  const name = s.name ?? `${s.last_name ?? ''} ${s.first_name ?? ''}`.trim();
  const classes = await getClasses();
  const clsOpts = classes.map(c =>
    `<option ${(s.class ?? s.class_name) === c.name ? 'selected' : ''}>${c.name}</option>`).join('');
  const curArms = classes.find(c => c.name === (s.class ?? s.class_name))?.arms ?? [];

  showModal(`
    <h3 style="margin:0 0 1.5rem;">✏ Edit — ${name}</h3>
    <form id="edit-student-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div style="grid-column:1/-1;">
          <label style="${labelStyle()}">Full Name *</label>
          <input id="est-name" value="${name}" style="${inputStyle()}" required>
        </div>
        <div>
          <label style="${labelStyle()}">Class *</label>
          <select id="est-class" style="${inputStyle()}" onchange="window._updateEditArms()">${clsOpts}</select>
        </div>
        <div>
          <label style="${labelStyle()}">Arm *</label>
          <select id="est-arm" style="${inputStyle()}">
            ${curArms.map(a => `<option ${a === s.arm ? 'selected' : ''}>${a}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Gender</label>
          <select id="est-gender" style="${inputStyle()}">
            <option ${s.gender==='Male'  ?'selected':''}>Male</option>
            <option ${s.gender==='Female'?'selected':''}>Female</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Attendance (%)</label>
          <input type="number" id="est-att" min="0" max="100" value="${s.attendance ?? 100}" style="${inputStyle()}">
        </div>
        <div>
          <label style="${labelStyle()}">Phone</label>
          <input id="est-phone" value="${s.phone ?? s.guardian_phone ?? ''}" style="${inputStyle()}">
        </div>
        <div>
          <label style="${labelStyle()}">Date of Birth</label>
          <input type="date" id="est-dob" value="${s.dob ?? ''}" style="${inputStyle()}">
        </div>
        <div style="grid-column:1/-1;display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem;">
          <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
          <button type="submit" style="${btnStyle('primary')}">💾 Save Changes</button>
        </div>
      </div>
    </form>`);

  window._updateEditArms = async function() {
    const cls    = document.getElementById('est-class')?.value;
    const clsData = (await getClasses()).find(c => c.name === cls);
    const armSel = document.getElementById('est-arm');
    if (armSel && clsData) armSel.innerHTML = clsData.arms.map(a=>`<option>${a}</option>`).join('');
  };

  document.getElementById('edit-student-form').onsubmit = async function(e) {
    e.preventDefault();
    const payload = {
      name:       document.getElementById('est-name').value.trim(),
      class:      document.getElementById('est-class').value,
      arm:        document.getElementById('est-arm').value,
      gender:     document.getElementById('est-gender').value,
      attendance: parseInt(document.getElementById('est-att').value) || 100,
      phone:      document.getElementById('est-phone').value.trim(),
      dob:        document.getElementById('est-dob').value,
    };
    try {
      await Students.update(id, payload);
      _db.students = null;  // invalidate cache
      closeModal();
      toast('Student updated!', 'success');
      await renderStudents(_studentFilter, _studentFilters);
    } catch (err) {
      toast(`Update failed: ${err.message}`, 'error');
    }
  };
};

/* ── Delete student ── */
window._deleteStudentDB = function(id) {
  if (!priv.canManage()) { denyAccess('Only Admins can delete students.'); return; }
  const s    = (_db.students ?? []).find(st => st.id == id);
  const name = s ? (s.name ?? `${s.last_name ?? ''} ${s.first_name ?? ''}`.trim()) : id;
  showModal(`
    <div style="text-align:center;padding:.5rem 0 1rem;">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">🗑️</div>
      <h3 style="margin:0 0 .5rem;">Delete Student?</h3>
      <p style="color:#6b7280;margin:0;">Delete <strong>${name}</strong>? This cannot be undone.</p>
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:center;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="window._confirmDeleteStudentDB('${id}')" style="${btnStyle('danger')}">Yes, Delete</button>
      </div>
    </div>`);
};

window._confirmDeleteStudentDB = async function(id) {
  try {
    await Students.delete(id);
    _db.students = null;
    closeModal();
    toast('Student deleted.', 'warning');
    await renderStudents('', {});
  } catch (err) {
    toast(`Delete failed: ${err.message}`, 'error');
  }
};

/* ── Add new student manually ── */
window._openStudentModal = async function() {
  if (!priv.canManage()) { denyAccess(); return; }
  const classes = await getClasses();
  const clsOpts = classes.map(c => `<option>${c.name}</option>`).join('');
  const curArms = classes[0]?.arms ?? [];

  showModal(`
    <h3 style="margin:0 0 1.5rem;">➕ Add New Student</h3>
    <form id="new-student-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div><label style="${labelStyle()}">Last Name *</label><input id="ns-last" style="${inputStyle()}" required></div>
        <div><label style="${labelStyle()}">First Name *</label><input id="ns-first" style="${inputStyle()}" required></div>
        <div><label style="${labelStyle()}">Class *</label>
          <select id="ns-class" style="${inputStyle()}" onchange="window._updateNewStudentArms()">${clsOpts}</select>
        </div>
        <div><label style="${labelStyle()}">Arm *</label>
          <select id="ns-arm" style="${inputStyle()}">${curArms.map(a=>`<option>${a}</option>`).join('')}</select>
        </div>
        <div><label style="${labelStyle()}">Gender</label>
          <select id="ns-gender" style="${inputStyle()}"><option>Male</option><option>Female</option></select>
        </div>
        <div><label style="${labelStyle()}">Date of Birth</label><input type="date" id="ns-dob" style="${inputStyle()}"></div>
        <div><label style="${labelStyle()}">Guardian Name</label><input id="ns-parent" style="${inputStyle()}"></div>
        <div><label style="${labelStyle()}">Guardian Phone</label><input id="ns-phone" style="${inputStyle()}"></div>
        <div style="grid-column:1/-1;display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem;">
          <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
          <button type="submit" style="${btnStyle('primary')}">✅ Add Student</button>
        </div>
      </div>
    </form>`);

  window._updateNewStudentArms = async function() {
    const cls    = document.getElementById('ns-class')?.value;
    const clsData = (await getClasses()).find(c => c.name === cls);
    const armSel = document.getElementById('ns-arm');
    if (armSel && clsData) armSel.innerHTML = clsData.arms.map(a=>`<option>${a}</option>`).join('');
  };

  document.getElementById('new-student-form').onsubmit = async function(e) {
    e.preventDefault();
    const payload = {
      last_name:  document.getElementById('ns-last').value.trim(),
      first_name: document.getElementById('ns-first').value.trim(),
      class:      document.getElementById('ns-class').value,
      arm:        document.getElementById('ns-arm').value,
      gender:     document.getElementById('ns-gender').value,
      dob:        document.getElementById('ns-dob').value,
      parent:     document.getElementById('ns-parent').value.trim(),
      phone:      document.getElementById('ns-phone').value.trim(),
    };
    try {
      await Students.create(payload);
      _db.students = null;
      closeModal();
      toast('Student added!', 'success');
      await renderStudents('', {});
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };
};

/* ─────────────────────────────────────────────────────────────
   SECTION 6 — CLASSES (DB version)
   REPLACE your existing renderClasses() with this.
   Shows real student counts per class from the DB.
───────────────────────────────────────────────────────────── */
async function renderClasses() {
  if (!priv.canManage()) { accessDeniedPage('classes'); return; }

  const section = document.getElementById('classes');

  /* Loading state */
  section.innerHTML = `<div style="text-align:center;padding:3rem;">
    <div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 1rem;"></div>
    <p style="color:#6b7280;">Loading classes…</p>
  </div>`;

  const [classes, students] = await Promise.all([ getClasses(), getStudents() ]);

  /* Count students per class in memory */
  function countInClass(className) {
    return students.filter(s => (s.class ?? s.class_name) === className).length;
  }

  const totalArms     = classes.reduce((n, c) => n + (c.arms?.length ?? 0), 0);
  const totalStudents = students.length;

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h2 style="margin:0 0 .2rem;font-size:1.5rem;">Classes &amp; Arms</h2>
        <p style="margin:0;color:#6b7280;font-size:.875rem;">Manage all school levels, classes, and arm assignments</p>
      </div>
      <button onclick="window._openClassModal()" style="${btnStyle('primary')}">+ Add Class</button>
    </div>

    <!-- Summary -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem;margin-bottom:1.75rem;">
      <div style="background:#1e3a5f;color:#fff;border-radius:12px;padding:1rem 1.1rem;">
        <div style="font-size:1.4rem;">🏫</div>
        <div style="font-size:1.6rem;font-weight:800;line-height:1.1;">${classes.length}</div>
        <div style="font-size:.72rem;opacity:.8;margin-top:.15rem;">Total Classes</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:1rem 1.1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid #6366f1;">
        <div style="font-size:1.3rem;">🚪</div>
        <div style="font-size:1.5rem;font-weight:800;color:#6366f1;line-height:1.1;">${totalArms}</div>
        <div style="font-size:.72rem;color:#6b7280;margin-top:.15rem;">Total Arms</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:1rem 1.1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid #0891b2;">
        <div style="font-size:1.3rem;">👩‍🎓</div>
        <div style="font-size:1.5rem;font-weight:800;color:#0891b2;line-height:1.1;">${totalStudents}</div>
        <div style="font-size:.72rem;color:#6b7280;margin-top:.15rem;">Total Students</div>
      </div>
    </div>

    ${classes.length === 0
      ? `<div style="background:#fff;border-radius:12px;padding:4rem 2rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07);">
           <div style="font-size:3.5rem;margin-bottom:1rem;">🏫</div>
           <h3 style="margin:0 0 .5rem;">No classes yet</h3>
           <p style="color:#9ca3af;margin:0 0 1.5rem;">Add your first class to get started.</p>
           <button onclick="window._openClassModal()" style="${btnStyle('primary')}">+ Add First Class</button>
         </div>`
      : `<div style="overflow-x:auto;border-radius:12px;border:1px solid #e5e7eb;background:#fff;">
           <table style="${tableStyle()}">
             <thead><tr style="${thRowStyle()}">
               <th style="${thStyle('40px')}">#</th>
               <th style="${thStyle()}">Class Name</th>
               <th style="${thStyle()}">Arms</th>
               <th style="${thStyle('120px')}">Students</th>
               <th style="${thStyle('140px')}">Actions</th>
             </tr></thead>
             <tbody>
               ${classes.map((c, i) => {
                 const sc = countInClass(c.name);
                 const armChips = (c.arms ?? []).map(a =>
                   `<span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:6px;padding:.12rem .5rem;font-size:.75rem;font-weight:600;margin:.1rem;">${a}</span>`
                 ).join('');
                 return `<tr id="class-row-${c.id}" style="${trStyle()}">
                   <td style="${tdStyle()};color:#9ca3af;font-size:.82rem;">${i+1}</td>
                   <td style="${tdStyle()};font-weight:700;font-size:.95rem;">${c.name}</td>
                   <td style="${tdStyle()}">
                     <div style="display:flex;flex-wrap:wrap;gap:.15rem;">
                       ${armChips || `<span style="font-size:.78rem;color:#d1d5db;">No arms</span>`}
                     </div>
                   </td>
                   <td style="${tdStyle()}">
                     <span style="background:${sc>0?'#eff6ff':'#f3f4f6'};color:${sc>0?'#1d4ed8':'#9ca3af'};border:1px solid ${sc>0?'#bfdbfe':'#e5e7eb'};display:inline-block;padding:.2rem .6rem;border-radius:9999px;font-size:.75rem;font-weight:600;">
                       ${sc} student${sc !== 1 ? 's' : ''}
                     </span>
                   </td>
                   <td style="${tdStyle()}">
                     <button onclick="window._editClassDB('${c.id}')" style="${btnStyle('secondary','sm')}">✏ Edit</button>
                     <button onclick="window._deleteClassDB('${c.id}')" style="${btnStyle('danger','sm')}">🗑</button>
                   </td>
                 </tr>`;
               }).join('')}
             </tbody>
           </table>
         </div>`
    }`;
}

/* ── Add class → POST to DB ── */
window._openClassModal = function(cls = null) {
  const isEdit = !!cls;
  showModal(`
    <h3 style="margin:0 0 1.5rem;">${isEdit ? `✏ Edit — ${cls.name}` : '➕ Add New Class'}</h3>
    <form id="class-db-form">
      <label style="${labelStyle()}">Class Name *</label>
      <input id="cls-db-name" value="${cls?.name ?? ''}" placeholder="e.g. JSS 1, SS 2" style="${inputStyle()}" required>
      <label style="${labelStyle()}">Arms (comma separated) *</label>
      <input id="cls-db-arms" value="${(cls?.arms ?? []).join(', ')}" placeholder="e.g. A, B, C" style="${inputStyle()}">
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
        <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button type="submit" style="${btnStyle('primary')}">${isEdit ? '💾 Save' : '✅ Add Class'}</button>
      </div>
    </form>`);

  document.getElementById('class-db-form').onsubmit = async function(e) {
    e.preventDefault();
    const name = document.getElementById('cls-db-name').value.trim();
    const arms = document.getElementById('cls-db-arms').value.split(',').map(s=>s.trim()).filter(Boolean);
    if (!name) return toast('Class name required.', 'error');
    if (!arms.length) return toast('At least one arm required.', 'error');
    try {
      if (isEdit) await Classes.update(cls.id, { name, arms });
      else        await Classes.create({ name, arms });
      _db.classes = null;
      closeModal();
      toast(isEdit ? 'Class updated!' : `${name} added!`, 'success');
      await renderClasses();
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };
};

window._editClassDB = async function(id) {
  const cls = (_db.classes ?? []).find(c => c.id == id);
  if (!cls) return;
  window._openClassModal(cls);
};

window._deleteClassDB = function(id) {
  const cls = (_db.classes ?? []).find(c => c.id == id);
  const enrolled = (_db.students ?? []).filter(s => (s.class ?? s.class_name) === cls?.name).length;
  if (enrolled > 0) {
    showModal(`<div style="text-align:center;padding:1rem;">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">⚠️</div>
      <h3>Cannot Delete Class</h3>
      <p style="color:#6b7280;margin:.5rem 0 1.5rem;">
        <strong>${cls?.name}</strong> has <strong>${enrolled} enrolled student(s)</strong>. Re-assign them first.
      </p>
      <button onclick="closeModal()" style="${btnStyle('primary')}">OK</button>
    </div>`);
    return;
  }
  showModal(`<div style="text-align:center;padding:1rem;">
    <div style="font-size:2.5rem;margin-bottom:.75rem;">🗑️</div>
    <h3>Delete Class?</h3>
    <p style="color:#6b7280;margin:.5rem 0 1.5rem;">Delete <strong>${cls?.name}</strong>? This cannot be undone.</p>
    <div style="display:flex;gap:.75rem;justify-content:center;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="window._confirmDeleteClassDB('${id}')" style="${btnStyle('danger')}">Yes, Delete</button>
    </div>
  </div>`);
};

window._confirmDeleteClassDB = async function(id) {
  try {
    await Classes.delete(id);
    _db.classes = null;
    closeModal();
    toast('Class deleted.', 'warning');
    await renderClasses();
  } catch (err) {
    toast(`Delete failed: ${err.message}`, 'error');
  }
};