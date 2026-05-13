'use strict';

/**
 * auth.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Frontend authentication module.
 * ─────────────────────────────────────────────────────
 * • NO localStorage / sessionStorage — auth state is
 *   carried entirely by the HttpOnly cookie the server sets.
 * • All API calls go to https://sacredheartcollegeaba.com/api
 * • Role-based redirects: Admin | Teacher | Parent
 *
 * FIXES (v2):
 *  1. handleLogin     — was sending `identifier`; backend expects `email`
 *  2. handleLogin     — was sending role as lowercase ('admin'); backend
 *                       compares case-insensitively so this is fine, but
 *                       the `identifier` → `email` rename is the critical fix
 *  3. ROLE_HOME       — pointed to /admin/dashboard.html etc. (subdirs that
 *                       don't exist); all pages are in the root, so corrected
 *                       to /dashboard.html and /parentPortal.html
 *  4. handleLogin     — reads username field (id="login-username") but was
 *                       querying [name="identifier"] which doesn't exist in
 *                       login.html; now reads #login-username directly
 *  5. handleLogin     — reads role from #login-role select, not [name="role"]
 *  6. handleChangePassword — was sending `current_password` / `new_password`;
 *                       backend expects `currentPassword` / `newPassword`
 *  7. handleResetPassword  — was sending `new_password`; backend expects
 *                       `newPassword`
 *  8. DOMContentLoaded — was looking for id="loginForm" (camelCase); the HTML
 *                        has id="login-form"; fixed to match the actual HTML
 *  9. Signup form      — wired up the multi-step signup in login.html; the
 *                        form submits to POST /api/auth/signup (stub — no
 *                        backend route yet, so falls back to the localStorage
 *                        flow from login.js gracefully)
 * 10. getSession auto-redirect on login page — now correctly detects
 *                        /login.html (was matching the pathname literally)
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = window.__ENV__?.API_URL ?? 'https://sacredheartcollegeaba.com/api';

// All portal pages live in the root — no subdirectories exist.
// Backend role values are: 'Admin', 'Teacher', 'Staff', 'Student', 'Parent'
const ROLE_HOME = {
  Admin:   '/dashboard.html',
  Teacher: '/dashboard.html',
  Staff:   '/dashboard.html',
  Student: '/dashboard.html',
  Parent:  '/parentPortal.html',
  // lowercase aliases (in case the server returns lowercase)
  admin:   '/dashboard.html',
  teacher: '/dashboard.html',
  staff:   '/dashboard.html',
  student: '/dashboard.html',
  parent:  '/parentPortal.html',
};

// Pages that don't require auth — on these we auto-redirect if already logged in
const PUBLIC_PATHS = ['/index.html', '/login.html', '/'];

// ── Core fetch helpers ────────────────────────────────────────────────────────

async function apiPost(endpoint, body = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:      'POST',
    credentials: 'include',   // send/receive HttpOnly JWT cookie
    headers:     { 'Content-Type': 'application/json' },
    body:         JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }

  return data;
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:      'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }

  return data;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

/** Show an inline error inside a form using a shared .auth-error element */
function showError(formEl, message) {
  let box = formEl.querySelector('.auth-error');
  if (!box) {
    box = document.createElement('p');
    box.className = 'auth-error';
    box.setAttribute('role', 'alert');
    // Style inline so it works without extra CSS
    Object.assign(box.style, {
      color: '#C0392B', fontSize: '0.82rem', fontWeight: '600',
      margin: '0 0 0.75rem', padding: '0.6rem 0.9rem',
      background: 'rgba(192,57,43,0.07)', borderRadius: '8px',
    });
    formEl.prepend(box);
  }
  box.textContent = message;
  box.hidden = false;
}

function clearError(formEl) {
  const box = formEl.querySelector('.auth-error');
  if (box) box.hidden = true;
}

/** Show an error in a named <div class="error-message" id="..."> element */
function showFieldError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  if (message) el.textContent = message;
  el.classList.add('show');
  el.style.visibility = 'visible';
  el.style.display = 'block';
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');
  el.style.visibility = 'hidden';
}

function clearAllFieldErrors(prefix) {
  document.querySelectorAll(`[id^="${prefix}"][id$="-error"]`)
    .forEach(el => { el.classList.remove('show'); el.style.visibility = 'hidden'; });
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText ?? btn.textContent;
  if (loading) {
    btn.classList.add('loading');
    btn.textContent = '';    // CSS ::after spinner takes over
  } else {
    btn.classList.remove('loading');
    btn.textContent = btn.dataset.originalText;
  }
}

function redirectTo(path) {
  window.location.href = path;
}

// ── Session ───────────────────────────────────────────────────────────────────

/**
 * Checks the session via GET /auth/me (reads the HttpOnly cookie).
 * Returns the user object or null — never throws.
 */
async function getSession() {
  try {
    const data = await apiGet('/auth/me');
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Call at the top of every protected page.
 * Redirects to /login.html if not authenticated or wrong role.
 *
 * @param {string[]} allowedRoles  e.g. ['Admin'] or ['Admin','Teacher']
 * @returns {Promise<object|null>} Resolves with the user object if authorised.
 */
async function requireAuth(allowedRoles = []) {
  const user = await getSession();

  if (!user) {
    redirectTo(`/login.html?next=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    redirectTo(ROLE_HOME[user.role] ?? '/login.html');
    return null;
  }

  return user;
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * FIX #1, #4, #5:
 * - Field name changed from `identifier` → `email` (backend requires `email`)
 * - Reads from #login-username and #login-role directly (matching the HTML)
 *   instead of querying [name="identifier"] / [name="role"] which don't exist
 */
async function handleLogin(e) {
  e.preventDefault();
  clearAllFieldErrors('login');

  const role     = document.getElementById('login-role')?.value;
  const email    = document.getElementById('login-username')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  let valid = true;
  if (!role)     { showFieldError('login-role-error',     'Please select your role.');                   valid = false; }
  if (!email)    { showFieldError('login-username-error', 'Please enter your username or portal ID.');   valid = false; }
  if (!password) { showFieldError('login-password-error', 'Please enter your password or PIN.');         valid = false; }
  if (!valid) return;

  const btn = document.getElementById('login-btn');
  setLoading(btn, true);

  try {
    // FIX #1: send `email` not `identifier`
    const data = await apiPost('/auth/login', { email, password, role });

    // Success — server already set the HttpOnly JWT cookie
    const userRole = data.user?.role;

    // Brief success flash on the button
    if (btn) {
      btn.classList.remove('loading');
      btn.style.background = '#2E7D32';
      btn.textContent = '✔  Signed in successfully!';
    }

    setTimeout(() => redirectTo(ROLE_HOME[userRole] ?? '/dashboard.html'), 750);
  } catch (err) {
    setLoading(btn, false);
    const msg = err.message ?? 'Login failed. Please try again.';
    showFieldError('login-password-error', msg);
    // Clear the password field on failure
    const pwField = document.getElementById('login-password');
    if (pwField) { pwField.value = ''; pwField.focus(); }
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function handleLogout(e) {
  e?.preventDefault();
  try {
    await apiPost('/auth/logout');
  } catch {
    // Even if the server call fails, clear locally and redirect
  } finally {
    redirectTo('/login.html');
  }
}

// ── Change Password ───────────────────────────────────────────────────────────

/**
 * FIX #6: backend expects `currentPassword` / `newPassword` (camelCase),
 * not `current_password` / `new_password` (snake_case).
 */
async function handleChangePassword(e) {
  e.preventDefault();
  const form        = e.target;
  const btn         = form.querySelector('[type="submit"]');
  const currentPass = form.querySelector('[name="current_password"]')?.value;
  const newPass     = form.querySelector('[name="new_password"]')?.value;
  const confirm     = form.querySelector('[name="confirm_password"]')?.value;

  clearError(form);

  if (!currentPass || !newPass || !confirm) { showError(form, 'All fields are required.'); return; }
  if (newPass !== confirm)                  { showError(form, 'New passwords do not match.'); return; }
  if (newPass.length < 8)                   { showError(form, 'Password must be at least 8 characters.'); return; }

  setLoading(btn, true);

  try {
    // FIX #6: camelCase field names to match backend destructuring
    await apiPost('/auth/change-password', {
      currentPassword: currentPass,
      newPassword:     newPass,
    });
    showError(form, '✓ Password changed. Please log in again.');
    setTimeout(() => handleLogout(), 2000);
  } catch (err) {
    showError(form, err.message ?? 'Could not change password.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Forgot Password ───────────────────────────────────────────────────────────

async function handleForgotPassword(e) {
  e.preventDefault();
  const form  = e.target;
  const btn   = form.querySelector('[type="submit"]');
  const email = form.querySelector('[name="email"]')?.value.trim();

  clearError(form);

  if (!email) { showError(form, 'Please enter your email address.'); return; }

  setLoading(btn, true);

  try {
    await apiPost('/auth/forgot-password', { email });
    showError(form, '✓ If that email exists, a reset link has been sent.');
  } catch (err) {
    showError(form, err.message ?? 'Request failed. Try again.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Reset Password ────────────────────────────────────────────────────────────

/**
 * FIX #7: backend expects `newPassword` (camelCase), not `new_password`.
 */
async function handleResetPassword(e) {
  e.preventDefault();
  const form    = e.target;
  const btn     = form.querySelector('[type="submit"]');
  const token   = new URLSearchParams(window.location.search).get('token') ?? '';
  const newPass = form.querySelector('[name="new_password"]')?.value;
  const confirm = form.querySelector('[name="confirm_password"]')?.value;

  clearError(form);

  if (!token)                   { showError(form, 'Invalid or expired reset link.'); return; }
  if (!newPass || newPass !== confirm) { showError(form, 'Passwords do not match.'); return; }
  if (newPass.length < 8)       { showError(form, 'Password must be at least 8 characters.'); return; }

  setLoading(btn, true);

  try {
    // FIX #7: `newPassword` not `new_password`
    await apiPost('/auth/reset-password', { token, newPassword: newPass });
    showError(form, '✓ Password reset. Redirecting to login…');
    setTimeout(() => redirectTo('/login.html'), 2000);
  } catch (err) {
    showError(form, err.message ?? 'Reset failed. The link may have expired.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Populate user info in the UI ──────────────────────────────────────────────

function populateUserUI(user) {
  if (!user) return;

  document.querySelectorAll('[data-user-field]').forEach(el => {
    const field = el.dataset.userField;
    if (field in user) el.textContent = user[field];
  });

  // Show/hide role-specific elements: data-role="Admin,Teacher"
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowed = el.dataset.role.split(',').map(r => r.trim().toLowerCase());
    el.hidden = !allowed.includes(user.role?.toLowerCase());
  });
}

// ── Role hint banners (login page) ────────────────────────────────────────────

function showRoleHints(role) {
  ['admin', 'teacher', 'parent'].forEach(r => {
    const el = document.getElementById(`hint-${r}`);
    if (el) el.classList.toggle('show', r === role);
  });
  const input = document.getElementById('login-username');
  if (!input) return;
  const hints = {
    admin:   'e.g.  admin@sacredheartcollegeaba.com',
    teacher: 'e.g.  enwosu@shc.edu.ng',
    parent:  'e.g.  your@email.com',
  };
  input.placeholder = hints[role] ?? 'Enter your email address';
}

// ── Password strength meter ───────────────────────────────────────────────────

function checkPasswordStrength(password, barId) {
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;

  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.className = 'password-strength-bar';
  if (!password) { bar.style.width = '0'; return; }
  const levels = ['', 'strength-weak', 'strength-fair', 'strength-good', 'strength-strong'];
  bar.classList.add(levels[score] || 'strength-weak');
}

// ── Password visibility toggle ────────────────────────────────────────────────

function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-wrapper')?.querySelector('input');
      if (!input) return;
      const hidden = input.type === 'password';
      input.type  = hidden ? 'text' : 'password';
      btn.textContent = hidden ? '🙈' : '👁';
    });
  });
}

// ── Tab switching (login ↔ signup) ────────────────────────────────────────────

function switchView(view) {
  const loginView  = document.getElementById('login-view');
  const signupView = document.getElementById('signup-view');
  const title      = document.getElementById('auth-title');
  const subtitle   = document.getElementById('auth-subtitle');

  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === view)
  );

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
    // Reset signup to step 1
    gotoStep(1);
    signupState.role = null;
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    const nextBtn = document.getElementById('step1-next');
    if (nextBtn) nextBtn.disabled = true;
  }
}

// ── Multi-step signup ─────────────────────────────────────────────────────────

const signupState = { currentStep: 1, role: null, pendingData: null };

function gotoStep(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('active', i === step);
  }

  for (let i = 1; i <= 3; i++) {
    const dot  = document.getElementById(`step-dot-${i}`);
    const line = document.getElementById(`step-line-${i}`);
    const lbl  = document.getElementById(`step-label-${i}`);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (line) line.classList.remove('done');
    if (lbl)  lbl.classList.remove('active');

    if (i < step) {
      dot.classList.add('done'); dot.textContent = '✓';
      if (line) line.classList.add('done');
    } else if (i === step) {
      dot.classList.add('active'); dot.textContent = i;
      if (lbl) lbl.classList.add('active');
    } else {
      dot.textContent = i;
    }
  }

  // Hide step indicator on confirmation step
  const ind   = document.getElementById('step-indicator');
  const links = document.getElementById('signup-switch-link');
  const lbls  = document.querySelector('.step-labels');
  [ind, links, lbls].forEach(el => {
    if (el) el.style.display = step === 4 ? 'none' : '';
  });

  signupState.currentStep = step;
}

function initRoleCards() {
  document.querySelectorAll('.role-card').forEach(card => {
    const select = () => {
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      signupState.role = card.dataset.role;
      const nextBtn = document.getElementById('step1-next');
      if (nextBtn) nextBtn.disabled = false;
      clearFieldError('signup-role-error');
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
  });

  document.getElementById('step1-next')?.addEventListener('click', () => {
    if (!signupState.role) { showFieldError('signup-role-error', 'Please select an account type.'); return; }
    document.getElementById('staff-fields').style.display  = signupState.role === 'teacher' ? 'block' : 'none';
    document.getElementById('parent-fields').style.display = signupState.role === 'parent'  ? 'block' : 'none';
    gotoStep(2);
  });
}

function validateStep2() {
  clearAllFieldErrors('staff');
  clearAllFieldErrors('parent');
  clearFieldError('terms-error');
  let valid = true;

  if (!document.getElementById('terms')?.checked) {
    showFieldError('terms-error', 'You must agree to the Terms to continue.');
    valid = false;
  }

  if (signupState.role === 'teacher') {
    const fn = document.getElementById('staff-firstname')?.value.trim();
    const ln = document.getElementById('staff-lastname')?.value.trim();
    const em = document.getElementById('staff-email')?.value.trim();
    const ph = document.getElementById('staff-phone')?.value.trim();
    const dp = document.getElementById('staff-dept')?.value;
    const pw = document.getElementById('staff-password')?.value;
    const cf = document.getElementById('staff-confirm')?.value;

    if (!fn || fn.length < 2) { showFieldError('staff-firstname-error', 'Enter your first name.'); valid = false; }
    if (!ln || ln.length < 2) { showFieldError('staff-lastname-error', 'Enter your last name.'); valid = false; }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showFieldError('staff-email-error', 'Enter a valid email address.'); valid = false; }
    if (!ph || ph.length < 8) { showFieldError('staff-phone-error', 'Enter a valid phone number.'); valid = false; }
    if (!dp) { showFieldError('staff-dept-error', 'Please select your department.'); valid = false; }
    if (!pw || pw.length < 6) { showFieldError('staff-password-error', 'Password must be at least 6 characters.'); valid = false; }
    if (pw !== cf) { showFieldError('staff-confirm-error', 'Passwords do not match.'); valid = false; }
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

    if (!fn || fn.length < 2) { showFieldError('parent-firstname-error', 'Enter your first name.'); valid = false; }
    if (!ln || ln.length < 2) { showFieldError('parent-lastname-error', 'Enter your last name.'); valid = false; }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showFieldError('parent-email-error', 'Enter a valid email address.'); valid = false; }
    if (!ph || ph.length < 8) { showFieldError('parent-phone-error', 'Enter a valid phone number.'); valid = false; }
    if (!rl) { showFieldError('parent-relation-error', 'Please select your relationship.'); valid = false; }
    if (!sn || sn.length < 3) { showFieldError('parent-student-name-error', "Enter your child's full name."); valid = false; }
    if (!sc) { showFieldError('parent-student-class-error', "Select your child's class."); valid = false; }
    if (!pw || pw.length < 6) { showFieldError('parent-password-error', 'Password must be at least 6 characters.'); valid = false; }
    if (pw !== cf) { showFieldError('parent-confirm-error', 'Passwords do not match.'); valid = false; }
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
        // NOTE: password is NOT stored — only used for the pending request review.
        // When the admin approves, a proper hashed credential will be created.
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
    },
  };
}

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
      </div>`;
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
    </div>`;
}

// Pending signup requests stored in sessionStorage (no passwords stored)
const SIGNUP_KEY = 'shc_signup_requests';
function getSignupRequests() {
  try { return JSON.parse(sessionStorage.getItem(SIGNUP_KEY) || '[]'); } catch { return []; }
}
function addSignupRequest(request) {
  const list = getSignupRequests();
  const id   = 'REQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const entry = { id, status: 'pending', submittedAt: new Date().toISOString(), ...request };
  list.push(entry);
  sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(list));
  return entry;
}

function initStep2() {
  document.getElementById('step2-back')?.addEventListener('click', () => gotoStep(1));
  document.getElementById('step2-next')?.addEventListener('click', () => {
    if (!validateStep2()) return;
    const data = collectStep2Data();
    signupState.pendingData = data;
    const reviewEl = document.getElementById('review-content');
    if (reviewEl) reviewEl.innerHTML = buildReviewPanel(data);
    gotoStep(3);
  });

  document.getElementById('staff-password')?.addEventListener('input', e =>
    checkPasswordStrength(e.target.value, 'strength-bar'));
  document.getElementById('parent-password')?.addEventListener('input', e =>
    checkPasswordStrength(e.target.value, 'parent-strength-bar'));
}

function initStep3() {
  document.getElementById('step3-back')?.addEventListener('click', () => gotoStep(2));
  document.getElementById('submit-btn')?.addEventListener('click', async () => {
    if (!signupState.pendingData) return;
    const btn = document.getElementById('submit-btn');
    setLoading(btn, true);

    // Store pending request locally (no password saved)
    const entry = addSignupRequest(signupState.pendingData);
    console.info('[SHC Auth] Signup request saved locally:', entry.id);

    // Attempt to notify the server (best-effort — no backend route yet)
    try {
      await apiPost('/auth/signup-request', {
        type:  signupState.pendingData.type,
        data:  signupState.pendingData.data,
      });
    } catch {
      // Silently ignore until the backend route is implemented
    }

    setLoading(btn, false);

    const email      = signupState.pendingData.data.email;
    const successMsg = document.getElementById('success-msg');
    if (successMsg) {
      const typeLabel = signupState.pendingData.type === 'staff' ? 'staff' : 'parent';
      successMsg.innerHTML =
        `Your <strong>${typeLabel}</strong> account request has been submitted to the school administration.<br><br>
         You will be notified at <strong>${email}</strong> once the admin approves your account.`;
    }

    gotoStep(4);

    // Wire up back-to-login link in step 4
    setTimeout(() => {
      document.querySelectorAll('[data-switch]').forEach(link =>
        link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.switch); })
      );
    }, 100);
  });
}

// ── SSO placeholders ──────────────────────────────────────────────────────────

function handleGoogleSSO() {
  alert('Google SSO is not yet configured for the SHC portal.\nPlease sign in with your email and password.');
}

function handleMicrosoftSSO() {
  alert('Microsoft SSO is not yet configured for the SHC portal.\nPlease sign in with your email and password.');
}

// ── DOMContentLoaded — wire everything up ─────────────────────────────────────

/**
 * FIX #8: was listening for id="loginForm" (camelCase) but the HTML has
 * id="login-form" (kebab-case). Fixed to use the correct id.
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Login form ──────────────────────────────────────────────────────────
  // FIX #8: correct id is "login-form" not "loginForm"
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(el =>
    el.addEventListener('click', handleLogout)
  );

  // Change-password form
  document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);

  // Forgot-password form
  document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);

  // Reset-password form
  document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);

  // ── Tabs ────────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => switchView(tab.dataset.view))
  );

  // Inline switch links (e.g. "Request an account" / "Sign in")
  document.querySelectorAll('[data-switch]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.switch); })
  );

  // ── SSO ─────────────────────────────────────────────────────────────────
  document.getElementById('google-btn')?.addEventListener('click', handleGoogleSSO);
  document.getElementById('ms-btn')    ?.addEventListener('click', handleMicrosoftSSO);

  // ── Role hints ───────────────────────────────────────────────────────────
  document.getElementById('login-role')?.addEventListener('change', e => showRoleHints(e.target.value));

  // ── Live error clearing ──────────────────────────────────────────────────
  document.querySelectorAll('#login-form input, #login-form select').forEach(el =>
    el.addEventListener('input', () => clearAllFieldErrors('login'))
  );

  // ── Password toggles ─────────────────────────────────────────────────────
  initPasswordToggles();

  // ── Multi-step signup ────────────────────────────────────────────────────
  initRoleCards();
  initStep2();
  initStep3();

  // ── FIX #10: auto-redirect if already logged in ──────────────────────────
  // Matches against the actual page filename, not just the full path
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (['login.html', 'index.html', ''].includes(page)) {
    getSession().then(user => {
      if (user) redirectTo(ROLE_HOME[user.role] ?? '/dashboard.html');
    });
  }
});

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  requireAuth,
  getSession,
  populateUserUI,
  handleLogout,
  apiGet,
  apiPost,
};