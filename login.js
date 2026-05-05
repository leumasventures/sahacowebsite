/* ============================================================
   Sacred Heart College Eziukwu Aba – School Portal
   login.js  |  Authentication, Session, Role Management
              |  + Multi-level Signup with Admin Approval
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   STUDENT REGISTRY
───────────────────────────────────────────────────────────── */
const STUDENTS = {
  'SHC/001': { name: 'Chidubem Okonkwo',   class: 'SS 2',  arm: 'A', gender: 'M' },
  'SHC/002': { name: 'Adaeze Eze',         class: 'SS 1',  arm: 'B', gender: 'F' },
  'SHC/003': { name: 'Emeka Nwosu Jr.',    class: 'JSS 3', arm: 'A', gender: 'M' },
  'SHC/004': { name: 'Chioma Okafor',      class: 'SS 3',  arm: 'A', gender: 'F' },
  'SHC/005': { name: 'Ifeanyi Chukwu',     class: 'JSS 1', arm: 'B', gender: 'M' },
  'SHC/006': { name: 'Ngozi Ani',          class: 'JSS 2', arm: 'A', gender: 'F' },
  'SHC/007': { name: 'Obinna Uche',        class: 'SS 1',  arm: 'A', gender: 'M' },
  'SHC/008': { name: 'Amara Obi',          class: 'JSS 3', arm: 'B', gender: 'F' },
  'SHC/009': { name: 'Kelechi Dike',       class: 'SS 2',  arm: 'B', gender: 'M' },
  'SHC/010': { name: 'Nneka Dike',         class: 'JSS 1', arm: 'A', gender: 'F' },
};

/* ─────────────────────────────────────────────────────────────
   CREDENTIAL STORE  (replace with backend API in production)
───────────────────────────────────────────────────────────── */
const USERS = [
  /* ── Admins ── */
  {
    username: 'admin', password: 'admin', role: 'Admin',
    name: 'Principal / Admin', email: 'admin@shc.edu.ng',
    status: 'approved',
  },

  /* ── Teachers ── */
  { username: 'enwosu',  password: 'teacher123', role: 'Teacher', name: 'Mr Emeka Nwosu',   email: 'enwosu@shc.edu.ng',  teacherId: 'T001', assignedClass: 'SS 1',  assignedArm: 'A', status: 'approved' },
  { username: 'anze',    password: 'teacher123', role: 'Teacher', name: 'Mrs Adaora Nze',   email: 'anze@shc.edu.ng',    teacherId: 'T004', assignedClass: 'SS 3',  assignedArm: 'A', status: 'approved' },
  { username: 'ngeze',   password: 'teacher123', role: 'Teacher', name: 'Mrs Ngozi Eze',    email: 'ngeze@shc.edu.ng',   teacherId: 'T002', assignedClass: 'JSS 2', assignedArm: 'B', status: 'approved' },
  { username: 'cobi',    password: 'teacher123', role: 'Teacher', name: 'Mr Chibuike Obi',  email: 'cobi@shc.edu.ng',    teacherId: 'T003', assignedClass: 'SS 2',  assignedArm: 'A', status: 'approved' },
  { username: 'snnaji',  password: 'teacher123', role: 'Teacher', name: 'Mr Samuel Nnaji',  email: 'snnaji@shc.edu.ng',  teacherId: 'T005', assignedClass: 'SS 2',  assignedArm: 'B', status: 'approved' },
  { username: 'iokeke',  password: 'teacher123', role: 'Teacher', name: 'Mrs Ifeoma Okeke', email: 'iokeke@shc.edu.ng',  teacherId: 'T006', assignedClass: 'JSS 1', assignedArm: 'A', status: 'approved' },

  /* ── Parents ── */
  { username: 'parent_shc001', password: '5678', role: 'Parent', name: 'Mrs Okonkwo', studentId: 'SHC/001', status: 'approved' },
  { username: 'parent_shc002', password: '6789', role: 'Parent', name: 'Mr Eze',      studentId: 'SHC/002', status: 'approved' },
  { username: 'parent_shc003', password: '7890', role: 'Parent', name: 'Mr Nwosu',    studentId: 'SHC/003', status: 'approved' },
  { username: 'parent_shc004', password: '8901', role: 'Parent', name: 'Mrs Okafor',  studentId: 'SHC/004', status: 'approved' },
  { username: 'parent_shc005', password: '9012', role: 'Parent', name: 'Mr Chukwu',   studentId: 'SHC/005', status: 'approved' },
  { username: 'parent_shc006', password: '0123', role: 'Parent', name: 'Mrs Ani',     studentId: 'SHC/006', status: 'approved' },
  { username: 'parent_shc007', password: '1234', role: 'Parent', name: 'Mr Uche',     studentId: 'SHC/007', status: 'approved' },
  { username: 'parent_shc008', password: '2345', role: 'Parent', name: 'Mrs Obi',     studentId: 'SHC/008', status: 'approved' },
  { username: 'parent_shc009', password: '3456', role: 'Parent', name: 'Mr Dike',     studentIds: ['SHC/009','SHC/010'], status: 'approved' },
];

/* ─────────────────────────────────────────────────────────────
   SIGNUP REQUESTS STORE
   In production: persist to a database table (e.g. signup_requests).
   Schema:
     id           – unique request ID
     type         – 'staff' | 'parent'
     status       – 'pending' | 'approved' | 'rejected'
     submittedAt  – ISO timestamp
     data         – all form fields (except plain-text password in prod)
     reviewedAt   – ISO timestamp or null
     reviewNote   – admin note or null
───────────────────────────────────────────────────────────── */
const SIGNUP_STORE_KEY = 'shc_signup_requests';

function getSignupRequests() {
  try {
    return JSON.parse(localStorage.getItem(SIGNUP_STORE_KEY) || '[]');
  } catch { return []; }
}

function saveSignupRequests(list) {
  localStorage.setItem(SIGNUP_STORE_KEY, JSON.stringify(list));
}

function addSignupRequest(request) {
  const list = getSignupRequests();
  const id = 'REQ-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  const entry = { id, status: 'pending', submittedAt: new Date().toISOString(), reviewedAt: null, reviewNote: null, ...request };
  list.push(entry);
  saveSignupRequests(list);
  return entry;
}

function updateSignupRequest(id, updates) {
  const list = getSignupRequests();
  const idx  = list.findIndex(r => r.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...updates, reviewedAt: new Date().toISOString() };
  saveSignupRequests(list);
  return true;
}

function getPendingRequests() {
  return getSignupRequests().filter(r => r.status === 'pending');
}

/* ─────────────────────────────────────────────────────────────
   PRIVILEGE MAP
───────────────────────────────────────────────────────────── */
const PRIVILEGES = {
  Admin: {
    allowedSections: ['dashboard','classes','arms','students','teachers','subjects','results','report-cards','attendance','fixtures','parent-portal','settings','signup-approvals'],
    canEnterResults: true, canTakeAttendance: true, canViewResults: true,
    canAddRemarks: true, canViewReports: true, canManageStaff: true,
    canManageStudents: true, canViewParentPortal: true, canAccessSettings: true,
    canApproveSignups: true,
  },
  Teacher: {
    allowedSections: ['dashboard','students','results','report-cards','attendance','fixtures'],
    canEnterResults: true, canTakeAttendance: true, canViewResults: true,
    canAddRemarks: true, canViewReports: true, canManageStaff: false,
    canManageStudents: false, canViewParentPortal: false, canAccessSettings: false,
    canApproveSignups: false,
  },
  Parent: {
    allowedSections: ['parent-portal'],
    canEnterResults: false, canTakeAttendance: false, canViewResults: true,
    canAddRemarks: false, canViewReports: false, canManageStaff: false,
    canManageStudents: false, canViewParentPortal: true, canAccessSettings: false,
    canApproveSignups: false,
  },
};

/* ─────────────────────────────────────────────────────────────
   RESOLVE PARENT CHILDREN
───────────────────────────────────────────────────────────── */
function resolveChildren(user) {
  if (user.role !== 'Parent') return null;
  const ids = user.studentIds ? user.studentIds : user.studentId ? [user.studentId] : [];
  return ids.map(id => ({
    studentId: id,
    ...(STUDENTS[id] || { name: 'Unknown Student', class: '—', arm: '—', gender: '—' }),
  }));
}

/* ─────────────────────────────────────────────────────────────
   PRIVILEGE GUARDS
───────────────────────────────────────────────────────────── */
function hasPrivilege(key)        { const s = getSession(); return s ? s.privileges[key] === true : false; }
function canAccessSection(section){ const s = getSession(); return s ? s.privileges.allowedSections.includes(section) : false; }
function canActOnClass(cls, arm)  { const s = getSession(); if (!s) return false; if (s.role === 'Admin') return true; return s.assignedClass === cls && s.assignedArm === arm; }
function canViewChild(studentId)  { const s = getSession(); if (!s) return false; if (s.role !== 'Parent') return true; return Array.isArray(s.children) && s.children.some(c => c.studentId === studentId); }

/* ─────────────────────────────────────────────────────────────
   SESSION
───────────────────────────────────────────────────────────── */
const SESSION_KEY = 'shc_session';

function saveSession(user) {
  const session = {
    name:          user.name,
    role:          user.role,
    email:         user.email         || '',
    teacherId:     user.teacherId     || null,
    assignedClass: user.assignedClass || null,
    assignedArm:   user.assignedArm   || null,
    children:      resolveChildren(user),
    privileges:    PRIVILEGES[user.role],
    loggedInAt:    Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function getDashboardUrl(role) {
  if (role === 'Parent') return 'parentsPortal.html';
  if (role === 'Admin')  return 'dashboard.html#signup-approvals';
  return 'dashboard.html#dashboard';
}

/* ─────────────────────────────────────────────────────────────
   AUTHENTICATION
   Only allows login if account is 'approved'.
   Returns special codes for pending/rejected states.
───────────────────────────────────────────────────────────── */
const AUTH_RESULT = { OK: 'ok', NOT_FOUND: 'not_found', PENDING: 'pending', REJECTED: 'rejected' };

function authenticate(roleInput, username, password) {
  const roleMap = { admin: 'Admin', teacher: 'Teacher', parent: 'Parent' };
  const expectedRole = roleMap[roleInput];
  if (!expectedRole) return { result: AUTH_RESULT.NOT_FOUND, user: null };

  // Check approved USERS list
  const user = USERS.find(u =>
    (u.username === username || u.email === username) &&
    u.password  === password &&
    u.role      === expectedRole
  );

  if (user) {
    if (user.status === 'approved' || !user.status) return { result: AUTH_RESULT.OK, user };
    if (user.status === 'pending')  return { result: AUTH_RESULT.PENDING,  user: null };
    if (user.status === 'rejected') return { result: AUTH_RESULT.REJECTED, user: null };
  }

  // Check approved signup requests (approved but not yet in USERS)
  const approvedReq = getSignupRequests().find(r =>
    r.status === 'approved' &&
    (r.data.email === username || r.data.username === username) &&
    r.data.password === password &&
    r.type === (expectedRole === 'Teacher' ? 'staff' : 'parent')
  );
  if (approvedReq) return { result: AUTH_RESULT.OK, user: buildUserFromRequest(approvedReq) };

  // Check if there's a pending/rejected request with matching credentials
  const anyReq = getSignupRequests().find(r =>
    (r.data.email === username || r.data.username === username) &&
    r.data.password === password
  );
  if (anyReq) {
    if (anyReq.status === 'pending')  return { result: AUTH_RESULT.PENDING,  user: null };
    if (anyReq.status === 'rejected') return { result: AUTH_RESULT.REJECTED, user: null };
  }

  return { result: AUTH_RESULT.NOT_FOUND, user: null };
}

function buildUserFromRequest(req) {
  if (req.type === 'staff') {
    return {
      username: req.data.email,
      password: req.data.password,
      role: 'Teacher',
      name: `${req.data.firstname} ${req.data.lastname}`,
      email: req.data.email,
      status: 'approved',
    };
  }
  return {
    username: req.data.email,
    password: req.data.password,
    role: 'Parent',
    name: `${req.data.firstname} ${req.data.lastname}`,
    email: req.data.email,
    studentId: req.data.studentId || null,
    status: 'approved',
  };
}

/* ─────────────────────────────────────────────────────────────
   FORM HELPERS
───────────────────────────────────────────────────────────── */
function showError(id, message) {
  const el = document.getElementById(id);
  if (el) { if (message) el.textContent = message; el.classList.add('show'); el.style.visibility = 'visible'; }
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); el.style.visibility = 'hidden'; }
}

function clearAllErrors(prefix) {
  document.querySelectorAll(`[id^="${prefix}"][id$="-error"]`)
    .forEach(el => { el.classList.remove('show'); el.style.visibility = 'hidden'; });
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const labels = { 'login-btn': 'Sign In', 'signup-btn': 'Submit Registration', 'submit-btn': 'Submit Request', 'step2-next': 'Review →', 'step1-next': 'Continue →' };
  if (loading) {
    btn.classList.add('loading');
    btn.setAttribute('data-orig', btn.textContent);
    btn.textContent = '';
  } else {
    btn.classList.remove('loading');
    btn.textContent = labels[btnId] || btn.getAttribute('data-orig') || 'Continue';
  }
}

/* ─────────────────────────────────────────────────────────────
   ROLE HINT BANNERS (login)
───────────────────────────────────────────────────────────── */
function showRoleHints(role) {
  ['admin','teacher','parent'].forEach(r => {
    const el = document.getElementById(`hint-${r}`);
    if (el) el.classList.toggle('show', r === role);
  });
  const input = document.getElementById('login-username');
  if (!input) return;
  const hints = { admin: 'e.g.  admin', teacher: 'e.g.  enwosu  or  ngeze', parent: 'e.g.  parent_shc001' };
  input.placeholder = hints[role] || 'Enter your username or portal ID';
}

/* ─────────────────────────────────────────────────────────────
   LOGIN HANDLER
───────────────────────────────────────────────────────────── */
function handleLogin(e) {
  e.preventDefault();
  clearAllErrors('login');

  const role     = document.getElementById('login-role').value;
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  let valid = true;

  if (!role)     { showError('login-role-error',     'Please select your role.');               valid = false; }
  if (!username) { showError('login-username-error', 'Please enter your username or portal ID.'); valid = false; }
  if (!password) { showError('login-password-error', 'Please enter your password or PIN.');      valid = false; }
  if (!valid) return;

  setLoading('login-btn', true);

  setTimeout(() => {
    const { result, user } = authenticate(role, username, password);

    if (result === AUTH_RESULT.PENDING) {
      setLoading('login-btn', false);
      showError('login-password-error',
        '⏳ Your account is awaiting admin approval. You will be notified once approved.'
      );
      return;
    }

    if (result === AUTH_RESULT.REJECTED) {
      setLoading('login-btn', false);
      showError('login-password-error',
        '❌ Your account request was not approved. Please contact the school office for assistance.'
      );
      return;
    }

    if (result !== AUTH_RESULT.OK || !user) {
      setLoading('login-btn', false);
      showError('login-password-error',
        role === 'parent'
          ? 'Invalid portal ID or PIN. Please contact the school office if you need help.'
          : 'Invalid credentials. Please check your username and password.'
      );
      const pwField = document.getElementById('login-password');
      if (pwField) { pwField.value = ''; pwField.focus(); }
      return;
    }

    const session = saveSession(user);

    const btn = document.getElementById('login-btn');
    if (btn) {
      btn.classList.remove('loading');
      btn.style.background = '#2E7D32';
      btn.textContent = '✔  Signed in successfully!';
    }

    if (session.role === 'Parent' && session.children?.length) {
      console.info(`[SHC Auth] Parent "${session.name}" → children: ${session.children.map(c => c.name).join(', ')}`);
    }

    // Show pending approvals badge for admin
    if (session.role === 'Admin') {
      const pending = getPendingRequests().length;
      if (pending > 0) console.info(`[SHC Auth] Admin login: ${pending} pending signup request(s).`);
    }

    setTimeout(() => { window.location.href = getDashboardUrl(session.role); }, 750);
  }, 850);
}

/* ─────────────────────────────────────────────────────────────
   MULTI-STEP SIGNUP STATE
───────────────────────────────────────────────────────────── */
const signupState = {
  currentStep: 1,
  role: null,   // 'teacher' | 'parent'
};

function gotoStep(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('active', i === step);
  }

  // Update step dots & lines (only steps 1–3 shown in indicator)
  for (let i = 1; i <= 3; i++) {
    const dot  = document.getElementById(`step-dot-${i}`);
    const line = document.getElementById(`step-line-${i}`);
    const lbl  = document.getElementById(`step-label-${i}`);
    if (!dot) continue;
    dot.classList.remove('active','done');
    if (line) line.classList.remove('done');
    if (lbl)  lbl.classList.remove('active');

    if (i < step) {
      dot.classList.add('done');
      dot.textContent = '✓';
      if (line) line.classList.add('done');
    } else if (i === step) {
      dot.classList.add('active');
      dot.textContent = i;
      if (lbl) lbl.classList.add('active');
    } else {
      dot.textContent = i;
    }
  }

  // Hide step indicator & switch link on step 4
  const ind   = document.getElementById('step-indicator');
  const links = document.getElementById('signup-switch-link');
  const lbls  = document.querySelector('.step-labels');
  [ind, links, lbls].forEach(el => {
    if (el) el.style.display = step === 4 ? 'none' : '';
  });

  signupState.currentStep = step;
}

/* ─────────────────────────────────────────────────────────────
   STEP 1: Role selection
───────────────────────────────────────────────────────────── */
function initRoleCards() {
  document.querySelectorAll('.role-card').forEach(card => {
    const select = () => {
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      signupState.role = card.dataset.role;
      const nextBtn = document.getElementById('step1-next');
      if (nextBtn) nextBtn.disabled = false;
      clearError('signup-role-error');
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
  });

  document.getElementById('step1-next')?.addEventListener('click', () => {
    if (!signupState.role) {
      showError('signup-role-error', 'Please select an account type.');
      return;
    }
    // Show correct field group
    document.getElementById('staff-fields').style.display  = signupState.role === 'teacher' ? 'block' : 'none';
    document.getElementById('parent-fields').style.display = signupState.role === 'parent'  ? 'block' : 'none';
    gotoStep(2);
  });
}

/* ─────────────────────────────────────────────────────────────
   STEP 2: Details validation
───────────────────────────────────────────────────────────── */
function validateStep2() {
  clearAllErrors('staff');
  clearAllErrors('parent');
  clearError('terms-error');
  let valid = true;

  const terms = document.getElementById('terms');
  if (!terms?.checked) { showError('terms-error', 'You must agree to the Terms to continue.'); valid = false; }

  if (signupState.role === 'teacher') {
    const fn = document.getElementById('staff-firstname')?.value.trim();
    const ln = document.getElementById('staff-lastname')?.value.trim();
    const em = document.getElementById('staff-email')?.value.trim();
    const ph = document.getElementById('staff-phone')?.value.trim();
    const dp = document.getElementById('staff-dept')?.value;
    const pw = document.getElementById('staff-password')?.value;
    const cf = document.getElementById('staff-confirm')?.value;

    if (!fn || fn.length < 2) { showError('staff-firstname-error', 'Enter your first name.'); valid = false; }
    if (!ln || ln.length < 2) { showError('staff-lastname-error',  'Enter your last name.'); valid = false; }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showError('staff-email-error', 'Enter a valid email address.'); valid = false; }
    if (!ph || ph.length < 8) { showError('staff-phone-error', 'Enter a valid phone number.'); valid = false; }
    if (!dp) { showError('staff-dept-error', 'Please select your department.'); valid = false; }
    if (!pw || pw.length < 6) { showError('staff-password-error', 'Password must be at least 6 characters.'); valid = false; }
    if (pw !== cf) { showError('staff-confirm-error', 'Passwords do not match.'); valid = false; }
  }

  if (signupState.role === 'parent') {
    const fn = document.getElementById('parent-firstname')?.value.trim();
    const ln = document.getElementById('parent-lastname')?.value.trim();
    const em = document.getElementById('parent-email')?.value.trim();
    const ph = document.getElementById('parent-phone')?.value.trim();
    const rl = document.getElementById('parent-relation')?.value;
    const sn = document.getElementById('parent-student-name')?.value.trim();
    const sc = document.getElementById('parent-student-class')?.value;
    const pw = document.getElementById('parent-password')?.value;
    const cf = document.getElementById('parent-confirm')?.value;

    if (!fn || fn.length < 2) { showError('parent-firstname-error', 'Enter your first name.'); valid = false; }
    if (!ln || ln.length < 2) { showError('parent-lastname-error',  'Enter your last name.'); valid = false; }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showError('parent-email-error', 'Enter a valid email address.'); valid = false; }
    if (!ph || ph.length < 8) { showError('parent-phone-error', 'Enter a valid phone number.'); valid = false; }
    if (!rl) { showError('parent-relation-error', 'Please select your relationship.'); valid = false; }
    if (!sn || sn.length < 3) { showError('parent-student-name-error', "Enter your child's full name."); valid = false; }
    if (!sc) { showError('parent-student-class-error', 'Select your child\'s class.'); valid = false; }
    if (!pw || pw.length < 6) { showError('parent-password-error', 'Password must be at least 6 characters.'); valid = false; }
    if (pw !== cf) { showError('parent-confirm-error', 'Passwords do not match.'); valid = false; }
  }

  return valid;
}

function collectStep2Data() {
  if (signupState.role === 'teacher') {
    return {
      type: 'staff',
      data: {
        firstname:  document.getElementById('staff-firstname').value.trim(),
        lastname:   document.getElementById('staff-lastname').value.trim(),
        email:      document.getElementById('staff-email').value.trim(),
        phone:      document.getElementById('staff-phone').value.trim(),
        department: document.getElementById('staff-dept').value,
        staffId:    document.getElementById('staff-staffid').value.trim(),
        note:       document.getElementById('staff-note').value.trim(),
        password:   document.getElementById('staff-password').value, // hashed in prod
      },
    };
  }
  return {
    type: 'parent',
    data: {
      firstname:    document.getElementById('parent-firstname').value.trim(),
      lastname:     document.getElementById('parent-lastname').value.trim(),
      email:        document.getElementById('parent-email').value.trim(),
      phone:        document.getElementById('parent-phone').value.trim(),
      relation:     document.getElementById('parent-relation').value,
      studentName:  document.getElementById('parent-student-name').value.trim(),
      studentClass: document.getElementById('parent-student-class').value,
      studentArm:   document.getElementById('parent-student-arm').value,
      studentId:    document.getElementById('parent-student-id').value.trim(),
      password:     document.getElementById('parent-password').value, // hashed in prod
    },
  };
}

/* ─────────────────────────────────────────────────────────────
   STEP 3: Review panel builder
───────────────────────────────────────────────────────────── */
function buildReviewPanel(data) {
  const row = (label, value) => value
    ? `<div style="display:flex;justify-content:space-between;padding:0.55rem 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
         <span style="color:var(--muted);font-weight:500;">${label}</span>
         <span style="font-weight:600;text-align:right;max-width:60%;">${value}</span>
       </div>`
    : '';

  if (data.type === 'staff') {
    const d = data.data;
    return `
      <div style="background:var(--sand);border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:0.5rem;">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.9rem;">
          <span style="font-size:1.4rem;">📚</span>
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${d.firstname} ${d.lastname}</div>
            <span class="status-badge pending">⏳ Awaiting Approval</span>
          </div>
        </div>
        ${row('Account Type', 'Staff / Teacher')}
        ${row('Email', d.email)}
        ${row('Phone', d.phone)}
        ${row('Department', d.department)}
        ${d.staffId ? row('Staff ID / TRCN', d.staffId) : ''}
        ${d.note ? row('Note to Admin', d.note) : ''}
      </div>
    `;
  }

  const d = data.data;
  return `
    <div style="background:var(--sand);border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.9rem;">
        <span style="font-size:1.4rem;">👨‍👩‍👧</span>
        <div>
          <div style="font-weight:700;font-size:0.95rem;">${d.firstname} ${d.lastname}</div>
          <span class="status-badge pending">⏳ Awaiting Approval</span>
        </div>
      </div>
      ${row('Account Type', 'Parent / Guardian')}
      ${row('Email', d.email)}
      ${row('Phone', d.phone)}
      ${row('Relationship', d.relation)}
      ${row("Child's Name", d.studentName)}
      ${row("Child's Class", d.studentClass + (d.studentArm ? ' ' + d.studentArm : ''))}
      ${d.studentId ? row('Admission No.', d.studentId) : ''}
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
   STEP 2 → 3
───────────────────────────────────────────────────────────── */
function initStep2() {
  document.getElementById('step2-back')?.addEventListener('click', () => gotoStep(1));

  document.getElementById('step2-next')?.addEventListener('click', () => {
    if (!validateStep2()) return;
    const data = collectStep2Data();
    signupState.pendingData = data;
    document.getElementById('review-content').innerHTML = buildReviewPanel(data);
    gotoStep(3);
  });

  // Password strength
  const staffPwd  = document.getElementById('staff-password');
  const parentPwd = document.getElementById('parent-password');
  staffPwd?.addEventListener('input',  () => checkPasswordStrength(staffPwd.value,  'strength-bar'));
  parentPwd?.addEventListener('input', () => checkPasswordStrength(parentPwd.value, 'parent-strength-bar'));
}

/* ─────────────────────────────────────────────────────────────
   STEP 3 → 4: Submit
───────────────────────────────────────────────────────────── */
function initStep3() {
  document.getElementById('step3-back')?.addEventListener('click', () => gotoStep(2));

  document.getElementById('submit-btn')?.addEventListener('click', () => {
    if (!signupState.pendingData) return;
    setLoading('submit-btn', true);

    setTimeout(() => {
      const entry = addSignupRequest(signupState.pendingData);
      console.info('[SHC Auth] New signup request submitted:', entry.id, entry.type);

      // Notify admin (in prod: push notification / email)
      notifyAdminOfNewRequest(entry);

      const email = signupState.pendingData.data.email;
      const successMsg = document.getElementById('success-msg');
      if (successMsg) {
        successMsg.innerHTML = `Your <strong>${signupState.pendingData.type === 'staff' ? 'staff' : 'parent'}</strong> account request has been submitted to the school administration.<br><br>
          You will be notified at <strong>${email}</strong> once the admin approves your account.`;
      }

      gotoStep(4);

      // After step 4 appears, wire up back-to-login link
      setTimeout(() => {
        document.querySelectorAll('[data-switch]').forEach(link =>
          link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.switch); })
        );
      }, 100);
    }, 900);
  });
}

/* ─────────────────────────────────────────────────────────────
   ADMIN NOTIFICATION (stub – replace with real push/email)
───────────────────────────────────────────────────────────── */
function notifyAdminOfNewRequest(entry) {
  // In production: call your notification API
  // e.g. fetch('/api/notify-admin', { method:'POST', body: JSON.stringify(entry) })
  console.info(`[SHC Auth] Admin notification sent for request ${entry.id} (${entry.type})`);
}

/* ─────────────────────────────────────────────────────────────
   PASSWORD STRENGTH METER
───────────────────────────────────────────────────────────── */
function checkPasswordStrength(password, barId = 'strength-bar') {
  let score = 0;
  if (password.length >= 8)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.className = 'password-strength-bar';
  if (!password) { bar.style.width = '0'; return; }
  const levels = ['','strength-weak','strength-fair','strength-good','strength-strong'];
  bar.classList.add(levels[score] || 'strength-weak');
}

/* ─────────────────────────────────────────────────────────────
   PASSWORD VISIBILITY TOGGLE
───────────────────────────────────────────────────────────── */
function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-wrapper')?.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      btn.textContent = hidden ? '🙈' : '👁';
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   TAB SWITCHING
───────────────────────────────────────────────────────────── */
function switchView(view) {
  const loginView  = document.getElementById('login-view');
  const signupView = document.getElementById('signup-view');
  const title      = document.getElementById('auth-title');
  const subtitle   = document.getElementById('auth-subtitle');

  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));

  if (view === 'login') {
    loginView?.classList.add('active');
    signupView?.classList.remove('active');
    if (title)    title.textContent    = 'Welcome Back';
    if (subtitle) subtitle.textContent = 'Sign in to the SHC School Portal';
  } else {
    signupView?.classList.add('active');
    loginView?.classList.remove('active');
    if (title)    title.textContent    = 'Account Request';
    if (subtitle) subtitle.textContent = 'Request a Sacred Heart College portal account';
    // Reset to step 1 when switching to signup
    signupState.role = null;
    signupState.currentStep = 1;
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    const nextBtn = document.getElementById('step1-next');
    if (nextBtn) nextBtn.disabled = true;
    gotoStep(1);
  }
}

/* ─────────────────────────────────────────────────────────────
   SSO PLACEHOLDERS
───────────────────────────────────────────────────────────── */
function handleGoogleSSO()    { alert('Google SSO is not yet configured for the SHC portal.\nPlease use your username / portal ID and password / PIN.'); }
function handleMicrosoftSSO() { alert('Microsoft SSO is not yet configured for the SHC portal.\nPlease use your username / portal ID and password / PIN.'); }

/* ─────────────────────────────────────────────────────────────
   AUTO-REDIRECT IF SESSION EXISTS
───────────────────────────────────────────────────────────── */
function checkExistingSession() {
  const session = getSession();
  if (session) window.location.href = getDashboardUrl(session.role);
}

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  checkExistingSession();

  /* Tabs */
  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => switchView(tab.dataset.view))
  );

  /* Inline switch links */
  document.querySelectorAll('[data-switch]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.switch); })
  );

  /* Login */
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  /* Password toggles */
  initPasswordToggles();

  /* Role hints on login */
  document.getElementById('login-role')?.addEventListener('change', e => showRoleHints(e.target.value));

  /* SSO */
  document.getElementById('google-btn')?.addEventListener('click', handleGoogleSSO);
  document.getElementById('ms-btn')    ?.addEventListener('click', handleMicrosoftSSO);

  /* Live error clearing */
  document.querySelectorAll('#login-form input, #login-form select')
    .forEach(el => el.addEventListener('input', () => clearAllErrors('login')));

  /* Multi-step signup */
  initRoleCards();
  initStep2();
  initStep3();
});

/* ─────────────────────────────────────────────────────────────
   ADMIN APPROVAL API
   Usage in dashboard.html:

     // Get all pending requests:
     const pending = SHC_Auth.getPendingRequests();

     // Approve a request:
     SHC_Auth.approveRequest(req.id, 'Welcome aboard!');

     // Reject a request:
     SHC_Auth.rejectRequest(req.id, 'No vacancy in this department.');

     // Count pending (for badge):
     SHC_Auth.getPendingCount();
───────────────────────────────────────────────────────────── */
function approveRequest(id, note = '') {
  const success = updateSignupRequest(id, { status: 'approved', reviewNote: note });
  if (success) {
    const req = getSignupRequests().find(r => r.id === id);
    if (req) {
      // In production: send approval email/SMS to applicant, add to USERS table
      console.info(`[SHC Auth] Request ${id} APPROVED. Notifying ${req.data.email}`);
    }
  }
  return success;
}

function rejectRequest(id, note = '') {
  const success = updateSignupRequest(id, { status: 'rejected', reviewNote: note });
  if (success) {
    const req = getSignupRequests().find(r => r.id === id);
    if (req) {
      console.info(`[SHC Auth] Request ${id} REJECTED. Notifying ${req.data.email}`);
    }
  }
  return success;
}

/* ─────────────────────────────────────────────────────────────
   EXPORTED AUTH API
───────────────────────────────────────────────────────────── */
window.SHC_Auth = {
  /* Session */
  getSession, saveSession, clearSession,
  /* Privilege guards */
  hasPrivilege, canAccessSection, canActOnClass, canViewChild,
  PRIVILEGES, STUDENTS,
  /* Signup requests (admin use) */
  getSignupRequests,
  getPendingRequests,
  getPendingCount: () => getPendingRequests().length,
  approveRequest,
  rejectRequest,
};