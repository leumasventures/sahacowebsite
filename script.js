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
  // Use custom grading scale from settings if available
  const scale = App?.data?.gradingScale;
  if (Array.isArray(scale) && scale.length) {
    const n = parseFloat(score);
    const match = scale.find(s => n >= s.min && n <= s.max);
    if (match) return { letter: match.grade, remark: match.remark, gpa: match.gpa ?? null };
  }
  // Default WAEC-style fallback
  if (score >= 75) return { letter: 'A1', remark: 'Excellent',  gpa: 5.0 };
  if (score >= 70) return { letter: 'B2', remark: 'Very Good',  gpa: 4.0 };
  if (score >= 65) return { letter: 'B3', remark: 'Good',       gpa: 3.5 };
  if (score >= 60) return { letter: 'C4', remark: 'Credit',     gpa: 3.0 };
  if (score >= 55) return { letter: 'C5', remark: 'Credit',     gpa: 2.5 };
  if (score >= 50) return { letter: 'C6', remark: 'Credit',     gpa: 2.0 };
  if (score >= 45) return { letter: 'D7', remark: 'Pass',       gpa: 1.5 };
  if (score >= 40) return { letter: 'E8', remark: 'Weak Pass',  gpa: 1.0 };
  return             { letter: 'F9', remark: 'Fail',       gpa: 0.0 };
}

/* ── Settings helpers ── accessed everywhere ─────────────────────────────────
   These are thin getters so every module reads the live App.data values.
   Call getSetting('key', defaultValue) from any module.
──────────────────────────────────────────────────────────────────────────── */
function getSetting(key, fallback) {
  const gs = App?.data?.generalSettings || {};
  return (gs[key] !== undefined && gs[key] !== null) ? gs[key] : fallback;
}

function getScoreBreakdown() {
  const bk = App?.data?.scoreBreakdown;
  if (bk && typeof bk === 'object' && Object.keys(bk).length) return bk;
  return { 'CA 1': 10, 'CA 2': 10, 'Exam': 80 };
}

function getPassMark()      { return getSetting('passMark', 40); }
function getMaxScore()      { return getSetting('maxScore', 100); }
function getDecimalPlaces() { return getSetting('decimalPlaces', 1); }
function getResultMode()    { return getSetting('resultMode', 'average'); }
function getPositionMode()  { return getSetting('positionMode', 'class'); }
function showStudentPhoto() { return getSetting('showPhoto', false); }
function showGPAOnReport()  { return getSetting('showGPA', false); }
function showClassAvg()     { return getSetting('showClassAvg', true); }
function showDomainOnReport(){ return getSetting('showDomain', true); }
function showAttendanceOnReport(){ return getSetting('showAttendance', true); }
function getReportFooter()  { return getSetting('reportFooter', 'Head Teacher / Principal Signature'); }
function getCurrency()      { return getSetting('currency', '₦'); }
function getDateFormat()    { return getSetting('dateFormat', 'DD/MM/YYYY'); }

/* expose globally */
window.getSetting          = getSetting;
window.getScoreBreakdown   = getScoreBreakdown;
window.getPassMark         = getPassMark;
window.getMaxScore         = getMaxScore;
window.getDecimalPlaces    = getDecimalPlaces;
window.getResultMode       = getResultMode;
window.getPositionMode     = getPositionMode;
window.showStudentPhoto    = showStudentPhoto;
window.showGPAOnReport     = showGPAOnReport;
window.showClassAvg        = showClassAvg;
window.showDomainOnReport  = showDomainOnReport;
window.showAttendanceOnReport = showAttendanceOnReport;
window.getReportFooter     = getReportFooter;
window.getCurrency         = getCurrency;

/* ── saveAppData — persists all App.data settings to the backend ─────────────
   Called by every save function in settings.js.
──────────────────────────────────────────────────────────────────────────── */
window.saveAppData = async function() {
  try {
    const gs = App.data.generalSettings || {};
    const si = App.data.schoolInfo      || {};
    const payload = {
      /* school info */
      school_name:      si.name        || '',
      school_address:   si.address     || '',
      school_phone:     si.phone       || '',
      school_email:     si.email       || '',
      school_logo:      si.logo        || '',
      school_motto:     si.motto       || '',
      school_website:   si.website     || '',
      principal_name:   si.principal   || '',
      current_session:  si.session     || '',
      current_term:     si.term        || '',
      resumption_date:  si.resumptionDate || '',
      announcements:    si.announcements  || '',
      /* grading scale — stored as JSON string */
      grading_scale:    JSON.stringify(App.data.gradingScale    || []),
      score_breakdown:  JSON.stringify(App.data.scoreBreakdown  || {}),
      domain_labels:    JSON.stringify(App.data.domainLabels    || {}),
      /* general settings */
      result_mode:      gs.resultMode      || 'average',
      position_mode:    gs.positionMode    || 'class',
      decimal_places:   String(gs.decimalPlaces  ?? 1),
      report_footer:    gs.reportFooter    || '',
      comment_char_limit: String(gs.commentCharLimit ?? 150),
      show_photo:       gs.showPhoto      ? '1' : '0',
      show_gpa:         gs.showGPA        ? '1' : '0',
      show_class_avg:   gs.showClassAvg   !== false ? '1' : '0',
      show_domain:      gs.showDomain     !== false ? '1' : '0',
      show_attendance:  gs.showAttendance !== false ? '1' : '0',
      cumulative_results: gs.cumulativeResults ? '1' : '0',
      score_entry_mode: gs.scoreEntryMode  || 'split',
      max_score:        String(gs.maxScore    ?? 100),
      pass_mark:        String(gs.passMark    ?? 40),
      max_subjects:     String(gs.maxSubjectsPerStudent ?? 9),
      allow_score_edit: gs.allowScoreEdit ? '1' : '0',
      lock_published:   gs.lockPublished  ? '1' : '0',
      auto_grade:       gs.autoGrade      ? '1' : '0',
      validate_range:   gs.validateRange  ? '1' : '0',
      portal_parent:    gs.portalParent   ? '1' : '0',
      portal_teacher:   gs.portalTeacher  ? '1' : '0',
      results_public:   gs.resultsPublic  ? '1' : '0',
      fees_portal:      gs.feesPortal     ? '1' : '0',
      date_format:      gs.dateFormat     || 'DD/MM/YYYY',
      currency:         gs.currency       || '₦',
      locale:           gs.locale         || 'en-NG',
      dark_mode:        gs.darkMode       ? '1' : '0',
      compact_tables:   gs.compactTables  ? '1' : '0',
      print_watermark:  gs.printWatermark ? '1' : '0',
      /* promotion settings */
      promotion_settings: JSON.stringify(App.data.promotionSettings || {}),
      att_term_start:   (App.data.attendanceSettings?.termStart)  || '',
      att_term_end:     (App.data.attendanceSettings?.termEnd)    || '',
      att_expected_days:String(App.data.attendanceSettings?.expectedDays || ''),
      att_working_days: JSON.stringify(App.data.attendanceSettings?.workingDays || []),
      att_min_pct:      String(App.data.attendanceSettings?.minAttendancePct || 75),
    };
    await Admin.updateSettings(payload);
  } catch (e) {
    console.error('[saveAppData]', e.message);
    toast('Settings saved locally but could not sync to server: ' + e.message, 'warning');
  }
};

/* ── loadSettingsFromBackend — called after loadAppData to hydrate App.data ──
   Parses JSON fields from the flat key-value store back into structured objects.
──────────────────────────────────────────────────────────────────────────── */
window.loadSettingsFromBackend = function(settings) {
  if (!settings) return;

  // Parse grading scale
  if (settings.grading_scale) {
    try { App.data.gradingScale = JSON.parse(settings.grading_scale); } catch(e) {}
  }
  // Parse score breakdown
  if (settings.score_breakdown) {
    try { App.data.scoreBreakdown = JSON.parse(settings.score_breakdown); } catch(e) {}
  }
  // Parse domain labels
  if (settings.domain_labels) {
    try { App.data.domainLabels = JSON.parse(settings.domain_labels); } catch(e) {}
  }
  // Parse attendance settings
  if (settings.att_working_days) {
    try {
      App.data.attendanceSettings = App.data.attendanceSettings || {};
      App.data.attendanceSettings.workingDays = JSON.parse(settings.att_working_days);
    } catch(e) {}
  }

  // Hydrate generalSettings from flat keys
  App.data.generalSettings = {
    resultMode:        settings.result_mode       || 'average',
    positionMode:      settings.position_mode     || 'class',
    decimalPlaces:     parseInt(settings.decimal_places)    || 1,
    reportFooter:      settings.report_footer     || '',
    commentCharLimit:  parseInt(settings.comment_char_limit)|| 150,
    showPhoto:         settings.show_photo        === '1',
    showGPA:           settings.show_gpa          === '1',
    showClassAvg:      settings.show_class_avg    !== '0',
    showDomain:        settings.show_domain       !== '0',
    showAttendance:    settings.show_attendance   !== '0',
    cumulativeResults: settings.cumulative_results=== '1',
    scoreEntryMode:    settings.score_entry_mode  || 'split',
    maxScore:          parseInt(settings.max_score)         || 100,
    passMark:          parseInt(settings.pass_mark)         || 40,
    maxSubjectsPerStudent: parseInt(settings.max_subjects)  || 9,
    allowScoreEdit:    settings.allow_score_edit  === '1',
    lockPublished:     settings.lock_published    === '1',
    autoGrade:         settings.auto_grade        === '1',
    validateRange:     settings.validate_range    === '1',
    portalParent:      settings.portal_parent     !== '0',
    portalTeacher:     settings.portal_teacher    !== '0',
    resultsPublic:     settings.results_public    === '1',
    feesPortal:        settings.fees_portal       !== '0',
    dateFormat:        settings.date_format       || 'DD/MM/YYYY',
    currency:          settings.currency          || '₦',
    locale:            settings.locale            || 'en-NG',
    darkMode:          settings.dark_mode         === '1',
    compactTables:     settings.compact_tables    === '1',
    printWatermark:    settings.print_watermark   === '1',
  };

  // Parse promotion settings
  if (settings.promotion_settings) {
    try { App.data.promotionSettings = JSON.parse(settings.promotion_settings); } catch(e) {}
  }

  // Attendance settings
  App.data.attendanceSettings = {
    ...(App.data.attendanceSettings || {}),
    termStart:        settings.att_term_start   || '',
    termEnd:          settings.att_term_end     || '',
    expectedDays:     parseInt(settings.att_expected_days) || null,
    minAttendancePct: parseInt(settings.att_min_pct)       || 75,
  };
};

function getPromotionSettings() {
  return App?.data?.promotionSettings || {
    enableCumulative:       true,
    useAverage:             true,  minAverage:    40,
    usePassCount:           true,  minPassCount:  5,
    useNoFail:              false, noFailMark:    30,
    useAttendance:          false, minAttendance: 75,
    useCoreSubjects:        false, coreSubjects:  ['Mathematics','English Language'],
    labelPromoted:          'PROMOTED',
    labelRepeat:            'REPEAT',
    labelIncomplete:        'INCOMPLETE',
    showTermBreakdown:      true,
    showCumulativePosition: true,
    showPromotionBox:       true,
    showNextClass:          false,
  };
}
window.getPromotionSettings = getPromotionSettings;

/* ─ computeCumulative(studentId, session) ────────────────────────────────
   Aggregates all three terms' results for a student in a session.
   Returns: { subjects:[{name,t1,t2,t3,total,avg,grade,remark}], grandAvg,
              passed, failed, promotion }
──────────────────────────────────────────────────────────────────────────*/
window.computeCumulative = function(studentId, session) {
  const ps       = getPromotionSettings();
  const passMark = getPassMark();
  const terms    = ['First Term', 'Second Term', 'Third Term'];
  const allResults = (App?.data?.results || []).filter(
    r => r.studentId === studentId && r.session === session
  );

  // Collect unique subjects across all terms
  const subjectNames = [...new Set(allResults.map(r => r.subject))];

  const subjects = subjectNames.map(name => {
    const byTerm = {};
    terms.forEach(t => {
      const r = allResults.find(x => x.subject === name && x.term === t);
      byTerm[t] = r ? r.total : null;
    });
    const scores  = Object.values(byTerm).filter(v => v !== null);
    const total   = scores.reduce((s, v) => s + v, 0);
    const avg     = scores.length ? total / scores.length : null;
    const g       = avg !== null ? grade(avg) : { letter: '—', remark: '—' };
    return {
      name,
      t1:    byTerm['First Term'],
      t2:    byTerm['Second Term'],
      t3:    byTerm['Third Term'],
      total: scores.length === 3 ? total : null,
      avg:   avg !== null ? parseFloat(avg.toFixed(getDecimalPlaces())) : null,
      grade: g.letter,
      remark:g.remark,
      passed: avg !== null && avg >= passMark,
    };
  });

  const scoredSubjects = subjects.filter(s => s.avg !== null);
  const grandAvg = scoredSubjects.length
    ? parseFloat((scoredSubjects.reduce((s, x) => s + x.avg, 0) / scoredSubjects.length).toFixed(getDecimalPlaces()))
    : null;

  const passed  = subjects.filter(s => s.passed).length;
  const failed  = subjects.filter(s => s.avg !== null && !s.passed).length;
  const complete = subjects.every(s => s.total !== null);

  // ── Promotion decision ──────────────────────────────────────────────
  let promotion = ps.labelIncomplete;
  if (complete || scoredSubjects.length >= 3) {
    let canPromote = true;
    const reasons = [];

    if (ps.useAverage && grandAvg !== null && grandAvg < ps.minAverage) {
      canPromote = false;
      reasons.push(`Average ${grandAvg}% < required ${ps.minAverage}%`);
    }
    if (ps.usePassCount && passed < ps.minPassCount) {
      canPromote = false;
      reasons.push(`Only ${passed} subject(s) passed — need ${ps.minPassCount}`);
    }
    if (ps.useNoFail) {
      const belowMin = subjects.filter(s => s.avg !== null && s.avg < ps.noFailMark);
      if (belowMin.length) {
        canPromote = false;
        reasons.push(`${belowMin.length} subject(s) below ${ps.noFailMark}%: ${belowMin.map(s=>s.name).join(', ')}`);
      }
    }
    if (ps.useCoreSubjects && ps.coreSubjects?.length) {
      const student = App?.data?.students?.find(s => s.id === studentId);
      // Check attendance from student record
      if (ps.useAttendance && student) {
        const att = parseFloat(student.attendance) || 100;
        if (att < ps.minAttendance) {
          canPromote = false;
          reasons.push(`Attendance ${att}% < required ${ps.minAttendance}%`);
        }
      }
      const coreFailures = ps.coreSubjects.filter(cn => {
        const s = subjects.find(x => x.name.toLowerCase() === cn.toLowerCase());
        return s && s.avg !== null && !s.passed;
      });
      if (coreFailures.length) {
        canPromote = false;
        reasons.push(`Failed core subject(s): ${coreFailures.join(', ')}`);
      }
    }

    promotion = canPromote ? ps.labelPromoted : ps.labelRepeat;
    return { subjects, grandAvg, passed, failed, complete, promotion, reasons };
  }

  return { subjects, grandAvg, passed, failed, complete: false, promotion, reasons: ['Not all three terms recorded'] };
};
window.getPromotionSettings = getPromotionSettings;
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
  if (priv.isParent()) { navigate('results'); return; }

  const s = App.data;
  const lowAttendance = s.students.filter(st => st.attendance < 75).length;
  const avgAtt = s.students.length
    ? (s.students.reduce((a, b) => a + b.attendance, 0) / s.students.length).toFixed(1) : 0;

  const term    = s.schoolInfo?.term    || '';
  const session = s.schoolInfo?.session || '';
  const studentsWithResults = new Set(
    s.results.filter(r => r.term === term && r.session === session).map(r => r.studentId)
  );
  const pending = Math.max(0, s.students.length - studentsWithResults.size);

  const statsMap = {
    'Total Students':     { val: s.students.length,  trend: `${s.classes.length} class(es)`, cls: '' },
    'Pending Results':    { val: pending,             trend: term || '—',                     cls: pending > 0 ? 'warning' : 'success' },
    'Average Attendance': { val: avgAtt + '%',        trend: lowAttendance > 0 ? `⚠ ${lowAttendance} low` : '✓ All good', cls: lowAttendance > 0 ? 'warning' : 'success' },
    'Active Staff':       { val: s.teachers.length,  trend: `${s.subjects.length} subjects`,  cls: '' },
  };

  const grid = document.getElementById('dashboard-stats');
  if (!grid) return;
  grid.innerHTML = Object.entries(statsMap).map(([label, d]) => `
    <div class="stat-card ${d.cls}" style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid ${statColor(d.cls)};">
      <h4 style="margin:0 0 .5rem;font-size:.78rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">${label}</h4>
      <div style="font-size:2rem;font-weight:700;color:#111827;">${d.val}</div>
      ${d.trend ? `<span style="font-size:.75rem;color:#9ca3af;">${d.trend}</span>` : ''}
    </div>
  `).join('');

  /* Subject allocation panel */
  const allocPanel = document.getElementById('dashboard-allocations');
  if (allocPanel) renderDashboardAllocations(allocPanel);

  /* Results completion panel */
  const compPanel = document.getElementById('dashboard-completion');
  if (compPanel) renderDashboardCompletion(compPanel, term, session);

  /* Wire nav buttons */
  const btnPrimary   = $('.btn-primary');
  const btnSecondary = $('.btn-secondary');
  const btnOutline   = $('.btn-outline');
  if (btnPrimary)   btnPrimary.onclick   = () => navigate('results');
  if (btnSecondary) btnSecondary.onclick = () => navigate('report-cards');
  if (btnOutline) {
    if (priv.canTakeAttendance()) { btnOutline.onclick = () => navigate('attendance'); }
    else { btnOutline.style.display = 'none'; }
  }
}

/* ── Dashboard: Subject Allocation per Class ──────────────────── */
async function renderDashboardAllocations(el) {
  el.innerHTML = `
    <div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden;margin-bottom:1.5rem;">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
        <div>
          <h3 style="margin:0;font-size:1rem;font-weight:700;color:#1e3a5f;">📚 Subject Allocations by Class</h3>
          <p style="margin:.25rem 0 0;font-size:.78rem;color:#6b7280;">Subjects assigned to each class and arm</p>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <select id="dash-alloc-filter" onchange="loadDashboardAllocations()" style="padding:.35rem .7rem;border:1px solid #e5e7eb;border-radius:7px;font-size:.8rem;color:#374151;">
            <option value="">All Classes</option>
            ${App.data.classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
          <button onclick="navigate('results');setTimeout(()=>switchResultTab('allocate'),200)" style="padding:.35rem .9rem;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:7px;font-size:.78rem;font-weight:600;cursor:pointer;">Manage →</button>
        </div>
      </div>
      <div id="dash-alloc-body" style="padding:.75rem 1.25rem 1.25rem;">
        <div style="text-align:center;padding:1.5rem;color:#9ca3af;">Loading…</div>
      </div>
    </div>`;
  await loadDashboardAllocations();
}

window.loadDashboardAllocations = async function() {
  const body   = document.getElementById('dash-alloc-body');
  if (!body) return;
  const filter = document.getElementById('dash-alloc-filter')?.value || '';
  const classes = App.data.classes.filter(c => !filter || c.name === filter);
  if (!classes.length) { body.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ca3af;">No classes.</div>'; return; }

  const rows = [];
  for (const cls of classes) {
    for (const arm of (cls.arms || [])) {
      try {
        const resp = await Results.getClassAllocation(cls.name, arm);
        rows.push({ cls: cls.name, arm, subjects: resp.subjects || resp.data || [] });
      } catch(e) {
        rows.push({ cls: cls.name, arm, subjects: [] });
      }
    }
  }

  if (!rows.length) { body.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ca3af;">No arms found.</div>'; return; }
  const totalSubs = App.data.subjects.length;

  body.innerHTML = rows.map((r, i) => {
    const subs = r.subjects;
    const statusColor = subs.length === 0 ? '#dc2626' : subs.length < totalSubs ? '#d97706' : '#16a34a';
    const statusLabel = subs.length === 0 ? '⚠ None assigned' : subs.length < totalSubs ? `${subs.length}/${totalSubs} assigned` : `✓ All ${subs.length} assigned`;
    return `
      <div style="margin-bottom:.85rem;">
        <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.35rem;flex-wrap:wrap;">
          <span style="font-weight:700;font-size:.88rem;color:#1e3a5f;min-width:80px;">${r.cls} ${r.arm}</span>
          <span style="font-size:.72rem;font-weight:600;color:${statusColor};background:${statusColor}18;padding:.15rem .55rem;border-radius:4px;">${statusLabel}</span>
        </div>
        ${subs.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:.3rem;">
              ${subs.map(sub=>`<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:.15rem .55rem;border-radius:4px;font-size:.72rem;">${sub}</span>`).join('')}
             </div>`
          : `<div style="font-size:.75rem;color:#9ca3af;font-style:italic;">No subjects assigned — <button onclick="navigate('results');setTimeout(()=>switchResultTab('allocate'),200)" style="background:none;border:none;color:#2563eb;cursor:pointer;font-size:.75rem;text-decoration:underline;">configure allocation</button></div>`}
      </div>${i < rows.length-1 ? '<hr style="border:none;border-top:1px solid #f3f4f6;margin:.5rem 0;">' : ''}`;
  }).join('');
};

/* ── Dashboard: Results Completion ──────────────────────────────── */
async function renderDashboardCompletion(el, term, session) {
  if (!term || !session) {
    el.innerHTML = `<div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);padding:1.5rem;margin-bottom:1.5rem;">
      <p style="color:#9ca3af;font-size:.85rem;text-align:center;">Set current term and session in Settings to see result completion.</p></div>`;
    return;
  }

  const allResults = App.data.results.filter(r => r.term === term && r.session === session);
  const matrix = [];

  for (const cls of App.data.classes) {
    for (const arm of (cls.arms || [])) {
      const students = App.data.students.filter(s => s.class === cls.name && s.arm === arm);
      if (!students.length) continue;
      let allocSubs = [];
      try {
        const resp = await Results.getClassAllocation(cls.name, arm);
        allocSubs = resp.subjects || resp.data || [];
      } catch(e) {}
      if (!allocSubs.length) allocSubs = App.data.subjects.map(s => s.name);
      if (!allocSubs.length) continue;

      const subStatus = allocSubs.map(sub => {
        const entered = students.filter(st => allResults.some(r => r.studentId === st.id && r.subject === sub)).length;
        return { sub, entered, total: students.length, pct: students.length ? Math.round(entered/students.length*100) : 0 };
      });

      const doneCount    = subStatus.filter(s => s.pct === 100).length;
      const partialCount = subStatus.filter(s => s.pct > 0 && s.pct < 100).length;
      const pendingCount = subStatus.filter(s => s.pct === 0).length;
      matrix.push({ cls: cls.name, arm, students: students.length, subStatus, doneCount, partialCount, pendingCount, totalSubs: allocSubs.length });
    }
  }

  el.innerHTML = `
    <div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden;margin-bottom:1.5rem;">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
        <div>
          <h3 style="margin:0;font-size:1rem;font-weight:700;color:#1e3a5f;">📊 Results Completion — ${term}, ${session}</h3>
          <p style="margin:.25rem 0 0;font-size:.78rem;color:#6b7280;">Scores entered vs pending per class</p>
        </div>
        <button onclick="navigate('results')" style="padding:.35rem .9rem;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:7px;font-size:.78rem;font-weight:600;cursor:pointer;">Enter Results →</button>
      </div>
      <div style="padding:1.25rem;">
        ${!matrix.length ? '<div style="text-align:center;padding:2rem;color:#9ca3af;">No class data available.</div>' :
          matrix.map((m, i) => {
            const overallPct = m.totalSubs ? Math.round((m.doneCount / m.totalSubs) * 100) : 0;
            const barColor   = overallPct === 100 ? '#16a34a' : overallPct > 60 ? '#2563eb' : overallPct > 0 ? '#d97706' : '#dc2626';
            const pendingSubs = m.subStatus.filter(s => s.pct < 100);
            return `
            <div style="margin-bottom:1rem;">
              <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.3rem;flex-wrap:wrap;">
                <span style="font-weight:700;font-size:.9rem;color:#1e3a5f;min-width:80px;">${m.cls} ${m.arm}</span>
                <span style="font-size:.75rem;color:#6b7280;">${m.students} students · ${m.totalSubs} subjects</span>
                <div style="margin-left:auto;display:flex;gap:.3rem;font-size:.7rem;flex-wrap:wrap;">
                  ${m.doneCount > 0    ? `<span style="background:#dcfce7;color:#166534;padding:.1rem .5rem;border-radius:3px;">✓ ${m.doneCount} complete</span>` : ''}
                  ${m.partialCount > 0 ? `<span style="background:#fef3c7;color:#92400e;padding:.1rem .5rem;border-radius:3px;">◑ ${m.partialCount} partial</span>` : ''}
                  ${m.pendingCount > 0 ? `<span style="background:#fee2e2;color:#991b1b;padding:.1rem .5rem;border-radius:3px;">✕ ${m.pendingCount} pending</span>` : ''}
                </div>
              </div>
              <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;margin-bottom:.35rem;">
                <div style="height:100%;width:${overallPct}%;background:${barColor};border-radius:4px;"></div>
              </div>
              ${pendingSubs.length ? `
              <div style="display:flex;flex-wrap:wrap;gap:.25rem;">
                ${pendingSubs.slice(0,7).map(s => {
                  const c = s.pct === 0 ? '#dc2626' : '#d97706';
                  return `<span style="font-size:.68rem;color:${c};background:${c}11;border:1px solid ${c}22;padding:.1rem .4rem;border-radius:3px;cursor:pointer;"
                    onclick="navigate('results');setTimeout(()=>{document.getElementById('res-class').value='${m.cls}';populateResultStudents();setTimeout(()=>{document.getElementById('res-arm').value='${m.arm}';document.getElementById('res-subject').value='${s.sub}';document.getElementById('res-term').value=document.getElementById('res-term')?.value||'First Term';loadResultEntry();},100);},200)"
                    title="${s.entered}/${s.total} entered — click to enter">${s.sub} (${s.entered}/${s.total})</span>`;
                }).join('')}
                ${pendingSubs.length > 7 ? `<span style="font-size:.68rem;color:#6b7280;">+${pendingSubs.length-7} more</span>` : ''}
              </div>` : `<div style="font-size:.72rem;color:#16a34a;font-weight:600;">✓ All results entered for this class</div>`}
            </div>${i < matrix.length-1 ? '<hr style="border:none;border-top:1px solid #f3f4f6;margin:.75rem 0;">' : ''}`;
          }).join('')}
      </div>
    </div>`;
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

/* ─────────────────────────────────────────
   INIT — sets App.currentUser from auth session
   Called by persistence_patch.js after auth.ready
─────────────────────────────────────────── */
function init() {
  const s = window.SHC_Auth?.getSession?.();
  if (s) {
    App.currentUser = {
      name:          s.name          || 'User',
      role:          s.role          || 'Admin',
      email:         s.email         || '',
      teacherId:     s.teacherId     || null,
      assignedClass: s.assignedClass || null,
      assignedArm:   s.assignedArm   || null,
      studentId:     s.studentId     || null,
      privileges:    s.privileges    || null,
      wardId:        s.wardId        || s.ward_id || null,
    };
  } else if (window.SHC_Auth) {
    window.location.href = 'login.html';
    return;
  }

  /* Update UI name/role display */
  const userEl = document.getElementById('current-user-name-role');
  if (userEl) userEl.textContent = `${App.currentUser.name} (${App.currentUser.role})`;

  /* Wire sidebar + initial navigation */
  if (typeof initSidebar === 'function') initSidebar();

  /* Navigate to hash or dashboard */
  const hash = location.hash.replace('#', '');
  navigate(hash && hash !== '' ? hash : 'dashboard');
}
window.init = init;

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


/* ═══════════════════════════════════════════════════════════════════
   SHARED HELPERS — used by all module files
   Must be defined here (script.js loads first)
═══════════════════════════════════════════════════════════════════ */
function showModal(html) {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:2rem;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:slideUp .2s ease;">
      ${html}
    </div>`;
  if (!document.getElementById('modal-style')) {
    const s = document.createElement('style'); s.id = 'modal-style';
    s.textContent = '@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(s);
  }
}

function closeModal() { document.getElementById('modal-overlay')?.remove(); }
window.closeModal = closeModal;

/* ─────────────────────────────────────────
   18. ACCESS DENIED PAGE
───────────────────────────────────────── */
function accessDeniedPage(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
      <div style="font-size:4rem;margin-bottom:1rem;">🔒</div>
      <h2 style="color:#1e3a5f;margin:0 0 .5rem;">Access Denied</h2>
      <p style="color:#6b7280;max-width:400px;">You do not have permission to view this section.
      Please contact the school admin if you think this is an error.</p>
      <button onclick="navigate('${priv.isParent()?'results':'dashboard'}')" style="${btnStyle('primary')};margin-top:1.5rem;">← Go Back</button>
    </div>`;
}

/* ─────────────────────────────────────────
   19.0 STYLE HELPERS  —  Design Token System
   
   Design philosophy:
   • Single source of truth via TOKENS object
   • All helpers derive from tokens — change a token, everything updates
   • Consistent 4-step size scale: xs / sm / md / lg
   • Every helper accepts (variant, size) with safe fallbacks
   • No magic strings scattered across the codebase
   • Hover/focus states via injected <style> block (call injectBaseStyles())
   • Fully backward-compatible with existing call sites
───────────────────────────────────────────────────────────────── */

/* ── 19.1. DESIGN TOKENS ─────────────────────────────────────────── */

const TOKENS = {
  // Brand palette
  color: {
    primary:        '#1e3a5f',
    primaryLight:   '#2a4f7f',
    primarySurface: '#eff6ff',
    primaryBorder:  '#bfdbfe',
    primaryText:    '#1d4ed8',

    success:        '#16a34a',
    successSurface: '#dcfce7',
    successBorder:  '#bbf7d0',
    successText:    '#166534',

    danger:         '#dc2626',
    dangerSurface:  '#fee2e2',
    dangerBorder:   '#fecaca',
    dangerText:     '#991b1b',

    warning:        '#d97706',
    warningSurface: '#fef3c7',
    warningBorder:  '#fde68a',
    warningText:    '#92400e',

    info:           '#0891b2',
    infoSurface:    '#ecfeff',
    infoBorder:     '#a5f3fc',
    infoText:       '#0e7490',

    neutral:        '#6b7280',
    neutralSurface: '#f9fafb',
    neutralBorder:  '#e5e7eb',
    neutralText:    '#374151',

    muted:          '#9ca3af',
    mutedSurface:   '#f3f4f6',

    // Semantic surface colours for banners / callouts
    purple:         '#7c3aed',
    purpleSurface:  '#f5f3ff',
    purpleBorder:   '#ddd6fe',
    purpleText:     '#5b21b6',
  },

  // Spacing scale  (xs / sm / md / lg)
  padding: {
    btn: {
      xs: '.2rem .5rem',
      sm: '.35rem .75rem',
      md: '.55rem 1.1rem',
      lg: '.75rem 1.5rem',
    },
    input: {
      sm: '.35rem .6rem',
      md: '.55rem .85rem',
      lg: '.7rem 1rem',
    },
    cell: {
      sm: '.5rem .75rem',
      md: '.7rem 1rem',
      lg: '.9rem 1.25rem',
    },
  },

  // Typography
  fontSize: {
    xs:   '.75rem',
    sm:   '.8rem',
    base: '.875rem',
    md:   '.9rem',
    lg:   '1rem',
  },

  // Radii
  radius: {
    xs:  '4px',
    sm:  '6px',
    md:  '8px',
    lg:  '10px',
    xl:  '12px',
    pill:'9999px',
  },

  // Shadows
  shadow: {
    none: 'none',
    xs:   '0 1px 2px rgba(0,0,0,.06)',
    sm:   '0 1px 4px rgba(0,0,0,.08)',
    md:   '0 4px 12px rgba(0,0,0,.10)',
    lg:   '0 8px 24px rgba(0,0,0,.12)',
    focus:'0 0 0 3px rgba(30,58,95,.18)',
  },

  // Transitions
  transition: {
    fast:   'all .12s ease',
    normal: 'all .18s ease',
    slow:   'all .28s ease',
  },
};


/* ── 19.2. BTN STYLE ─────────────────────────────────────────────── */

/**
 * btnStyle(variant?, size?, options?)
 *
 * Variants: primary | secondary | danger | success | info | warning |
 *           outline | ghost | outlineDanger | outlineSuccess | link
 * Sizes:    xs | sm | md | lg
 * Options:  { fullWidth, iconOnly, rounded }
 *
 * Examples:
 *   btnStyle()                  → primary md
 *   btnStyle('danger', 'sm')
 *   btnStyle('outline', 'lg', { fullWidth: true })
 *   btnStyle('ghost', 'xs')
 */
function btnStyle(variant = 'primary', size = 'md', opts = {}) {
  const C = TOKENS.color;
  const pad  = TOKENS.padding.btn[size]  ?? TOKENS.padding.btn.md;
  const font = TOKENS.fontSize[size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'];

  const variants = {
    // Filled
    primary:       `background:${C.primary};color:#fff;border:1.5px solid ${C.primary};`,
    secondary:     `background:${C.neutralSurface};color:${C.neutralText};border:1.5px solid ${C.neutralBorder};`,
    danger:        `background:${C.danger};color:#fff;border:1.5px solid ${C.danger};`,
    success:       `background:${C.success};color:#fff;border:1.5px solid ${C.success};`,
    info:          `background:${C.info};color:#fff;border:1.5px solid ${C.info};`,
    warning:       `background:${C.warning};color:#fff;border:1.5px solid ${C.warning};`,
    // Outlined
    outline:       `background:transparent;color:${C.primary};border:1.5px solid ${C.primary};`,
    outlineDanger: `background:transparent;color:${C.danger};border:1.5px solid ${C.danger};`,
    outlineSuccess:`background:transparent;color:${C.success};border:1.5px solid ${C.success};`,
    outlineNeutral:`background:transparent;color:${C.neutralText};border:1.5px solid ${C.neutralBorder};`,
    // Soft / ghost
    soft:          `background:${C.primarySurface};color:${C.primaryText};border:1.5px solid ${C.primaryBorder};`,
    softDanger:    `background:${C.dangerSurface};color:${C.dangerText};border:1.5px solid ${C.dangerBorder};`,
    softSuccess:   `background:${C.successSurface};color:${C.successText};border:1.5px solid ${C.successBorder};`,
    softWarning:   `background:${C.warningSurface};color:${C.warningText};border:1.5px solid ${C.warningBorder};`,
    ghost:         `background:transparent;color:${C.neutralText};border:1.5px solid transparent;`,
    ghostDanger:   `background:transparent;color:${C.danger};border:1.5px solid transparent;`,
    // Link-style
    link:          `background:transparent;color:${C.primaryText};border:none;text-decoration:underline;padding:0;`,
  };

  const chosen = variants[variant] ?? variants.primary;
  const width  = opts.fullWidth  ? 'width:100%;justify-content:center;' : '';
  const radius = opts.rounded    ? `border-radius:${TOKENS.radius.pill};` : `border-radius:${TOKENS.radius.md};`;
  const padStr = opts.iconOnly   ? `padding:${pad.split(' ')[0]};` : `padding:${pad};`;

  return [
    chosen,
    padStr,
    radius,
    width,
    `font-size:${font};`,
    `font-weight:600;`,
    `font-family:inherit;`,
    `line-height:1.4;`,
    `cursor:pointer;`,
    `display:inline-flex;align-items:center;justify-content:center;gap:.4rem;`,
    `transition:${TOKENS.transition.fast};`,
    `white-space:nowrap;`,
    `text-decoration:none;`,
  ].join('');
}

/* ── 19.3. INPUT STYLE ───────────────────────────────────────────── */
/**
 * inputStyle(size?, opts?)
 * Sizes: sm | md | lg
 * Options: { inline, error, success, noBorder }
 */
function inputStyle(size = 'md', opts = {}) {
  const pad  = TOKENS.padding.input[size] ?? TOKENS.padding.input.md;
  const font = size === 'sm' ? TOKENS.fontSize.sm : size === 'lg' ? TOKENS.fontSize.lg : TOKENS.fontSize.md;

  let borderColor = TOKENS.color.neutralBorder;
  if (opts.error)   borderColor = TOKENS.color.danger;
  if (opts.success) borderColor = TOKENS.color.success;
  if (opts.noBorder) borderColor = 'transparent';

  const display = opts.inline ? 'inline-block;width:auto;' : 'block;width:100%;';

  return [
    `display:${display}`,
    `padding:${pad};`,
    `border:1.5px solid ${borderColor};`,
    `border-radius:${TOKENS.radius.md};`,
    `font-size:${font};`,
    `font-family:inherit;`,
    `color:#1f2937;`,
    `background:#fff;`,
    `box-sizing:border-box;`,
    `outline:none;`,
    `transition:border-color .15s, box-shadow .15s;`,
    `line-height:1.5;`,
  ].join('');
}

/**
 * selectStyle(size?, opts?) — same rhythm as inputStyle but adds appearance reset
 */
function selectStyle(size = 'md', opts = {}) {
  return inputStyle(size, opts) +
    'appearance:none;-webkit-appearance:none;' +
    `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");` +
    'background-repeat:no-repeat;background-position:right .75rem center;padding-right:2.25rem;';
}

/**
 * textareaStyle(size?, opts?)
 */
function textareaStyle(size = 'md', opts = {}) {
  return inputStyle(size, opts) + 'resize:vertical;min-height:80px;';
}


/* ── 19.4. LABEL / HELPER TEXT STYLES ───────────────────────────── */

function labelStyle(opts = {}) {
  const color = opts.error ? TOKENS.color.dangerText : '#374151';
  return `display:block;font-size:${TOKENS.fontSize.sm};font-weight:600;color:${color};margin-bottom:.3rem;letter-spacing:.01em;`;
}

function helperTextStyle(type = 'default') {
  const colors = {
    default: TOKENS.color.muted,
    error:   TOKENS.color.dangerText,
    success: TOKENS.color.successText,
    warning: TOKENS.color.warningText,
  };
  return `display:block;font-size:${TOKENS.fontSize.xs};color:${colors[type] ?? colors.default};margin-top:.3rem;line-height:1.4;`;
}

/** Wraps a label + input + optional helper into a consistent field block */
function fieldGroupStyle() {
  return 'display:flex;flex-direction:column;gap:0;margin-bottom:1.1rem;';
}


/* ── 19.5. TABLE STYLES ──────────────────────────────────────────── */

/**
 * tableStyle(opts?)
 * Options: { striped, bordered, compact, hover }
 */
function tableStyle(opts = {}) {
  return [
    'width:100%;',
    'border-collapse:collapse;',
    `font-size:${TOKENS.fontSize.md};`,
    'border-spacing:0;',
    'min-width:480px;',           /* ensures horizontal scroll on mobile */
    opts.bordered ? `border:1px solid ${TOKENS.color.neutralBorder};border-radius:${TOKENS.radius.lg};overflow:hidden;` : '',
  ].join('');
}

function thRowStyle() {
  return `background:${TOKENS.color.neutralSurface};border-bottom:2px solid ${TOKENS.color.neutralBorder};`;
}

/**
 * thStyle(width?, align?)
 */
function thStyle(width, align = 'left') {
  const widthStr = width ? `width:${width};` : '';
  return [
    `padding:${TOKENS.padding.cell.md};`,
    `text-align:${align};`,
    `font-size:${TOKENS.fontSize.xs};`,
    `font-weight:700;`,
    `color:${TOKENS.color.neutral};`,
    `text-transform:uppercase;`,
    `letter-spacing:.05em;`,
    `white-space:nowrap;`,
    widthStr,
  ].join('');
}

/**
 * tdStyle(opts?)
 * Options: { align, muted, bold, nowrap }
 */
function tdStyle(opts = {}) {
  const color = opts.muted ? TOKENS.color.muted : opts.bold ? '#111827' : TOKENS.color.neutralText;
  const align = opts.align ?? 'left';
  return [
    `padding:${TOKENS.padding.cell.md};`,
    `border-bottom:1px solid ${TOKENS.color.mutedSurface};`,
    `color:${color};`,
    `vertical-align:middle;`,
    `text-align:${align};`,
    `font-size:${TOKENS.fontSize.md};`,
    opts.bold   ? 'font-weight:600;' : '',
    opts.nowrap ? 'white-space:nowrap;' : '',
  ].join('');
}

function trStyle(opts = {}) {
  const bg = opts.selected  ? TOKENS.color.primarySurface
           : opts.highlight ? '#fffbeb'
           : 'transparent';
  return `background:${bg};transition:background .12s;`;
}

/** Compact variant — same API but tighter padding */
function thStyleSm(width, align = 'left') {
  return thStyle(width, align).replace(TOKENS.padding.cell.md, TOKENS.padding.cell.sm);
}
function tdStyleSm(opts = {}) {
  return tdStyle(opts).replace(TOKENS.padding.cell.md, TOKENS.padding.cell.sm);
}


/* ── 19.6. BADGE STYLE ───────────────────────────────────────────── */

/**
 * badgeStyle(variant?, opts?)
 * Variants: info | success | warning | danger | neutral | primary |
 *           purple | outline-* (outlineInfo, outlineDanger…)
 * Options: { dot, size }
 */
function badgeStyle(variant = 'info', opts = {}) {
  const C = TOKENS.color;
  const variants = {
    info:          `background:${C.infoSurface};color:${C.infoText};border:1px solid ${C.infoBorder};`,
    success:       `background:${C.successSurface};color:${C.successText};border:1px solid ${C.successBorder};`,
    warning:       `background:${C.warningSurface};color:${C.warningText};border:1px solid ${C.warningBorder};`,
    danger:        `background:${C.dangerSurface};color:${C.dangerText};border:1px solid ${C.dangerBorder};`,
    neutral:       `background:${C.mutedSurface};color:${C.neutralText};border:1px solid ${C.neutralBorder};`,
    primary:       `background:${C.primarySurface};color:${C.primaryText};border:1px solid ${C.primaryBorder};`,
    purple:        `background:${C.purpleSurface};color:${C.purpleText};border:1px solid ${C.purpleBorder};`,
    // Solid variants
    solidInfo:     `background:${C.info};color:#fff;border:1px solid ${C.info};`,
    solidSuccess:  `background:${C.success};color:#fff;border:1px solid ${C.success};`,
    solidDanger:   `background:${C.danger};color:#fff;border:1px solid ${C.danger};`,
    solidWarning:  `background:${C.warning};color:#fff;border:1px solid ${C.warning};`,
    solidPrimary:  `background:${C.primary};color:#fff;border:1px solid ${C.primary};`,
    solidNeutral:  `background:${C.neutral};color:#fff;border:1px solid ${C.neutral};`,
  };

  const font  = opts.size === 'lg' ? TOKENS.fontSize.sm : opts.size === 'sm' ? '.65rem' : TOKENS.fontSize.xs;
  const pad   = opts.size === 'lg' ? '.3rem .8rem' : opts.size === 'sm' ? '.1rem .4rem' : '.2rem .55rem';
  const dot   = opts.dot ? 'display:inline-flex;align-items:center;gap:.35rem;' : 'display:inline-block;';
  const dotEl = opts.dot ? `• ` : '';  // caller injects this before badge text if desired

  return [
    variants[variant] ?? variants.info,
    dot,
    `padding:${pad};`,
    `border-radius:${TOKENS.radius.pill};`,
    `font-size:${font};`,
    `font-weight:600;`,
    `line-height:1.4;`,
    `white-space:nowrap;`,
    `letter-spacing:.02em;`,
  ].join('');
}



/* ── Sections moved to separate files — see dashboard.html script tags ── */
/* classes.js | students.js | staff.js | subjects.js | results.js        */
/* attendance.js | fixtures.js | settings.js | change-password.js        */
/* access-tokens.js | users.js | report-card.js                          */