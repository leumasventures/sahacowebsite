'use strict';

/**
 * auth.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Frontend authentication module.
 * ─────────────────────────────────────────────────────
 * • NO localStorage / sessionStorage — auth state is
 *   carried entirely by the HttpOnly cookie the server sets.
 * • All API calls go through the central api.js module.
 * • Role-based redirects: admin | teacher | student | parent
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = window.__ENV__?.API_URL ?? 'https://sacredheartcollegeaba.com/api';

const ROLE_HOME = {
  admin:   '/admin/dashboard.html',
  teacher: '/teacher/dashboard.html',
  student: '/student/dashboard.html',
  parent:  '/parent/dashboard.html',
};

const PUBLIC_PATHS = [
  '/index.html',
  '/login.html',
  '/',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * POST to the API. Credentials: 'include' ensures the HttpOnly
 * cookie is sent and received on every request.
 */
async function apiPost(endpoint, body = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:      'POST',
    credentials: 'include',           // send/receive HttpOnly cookie
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

/** Show an inline error message inside a form */
function showError(formEl, message) {
  let box = formEl.querySelector('.auth-error');
  if (!box) {
    box = document.createElement('p');
    box.className = 'auth-error';
    box.setAttribute('role', 'alert');
    formEl.prepend(box);
  }
  box.textContent = message;
  box.hidden = false;
}

function clearError(formEl) {
  const box = formEl.querySelector('.auth-error');
  if (box) box.hidden = true;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText ?? btn.textContent;
  btn.textContent = loading ? 'Please wait…' : btn.dataset.originalText;
}

function redirectTo(path) {
  window.location.href = path;
}

// ── Session check (called on every protected page) ────────────────────────────

/**
 * Verifies the session with the server by hitting /auth/me.
 * Returns the user object { id, name, role, … } or null.
 * Does NOT use localStorage — the server reads the HttpOnly cookie.
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
 * Redirects to /login.html if the user is not authenticated or
 * if their role doesn't match the allowed list.
 *
 * @param {string[]} allowedRoles  e.g. ['admin'] or ['admin','teacher']
 * @returns {Promise<object>}      Resolves with the user object if authorised.
 */
async function requireAuth(allowedRoles = []) {
  const user = await getSession();

  if (!user) {
    redirectTo(`/login.html?next=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    // Redirect to the user's own home rather than showing a 403 page
    redirectTo(ROLE_HOME[user.role] ?? '/login.html');
    return null;
  }

  return user;
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const form   = e.target;
  const btn    = form.querySelector('[type="submit"]');
  const id     = form.querySelector('[name="identifier"]')?.value.trim();
  const pass   = form.querySelector('[name="password"]')?.value;
  const role   = form.querySelector('[name="role"]')?.value;   // hidden or select

  clearError(form);

  if (!id || !pass) {
    showError(form, 'Please enter your ID/email and password.');
    return;
  }

  setLoading(btn, true);

  try {
    const data = await apiPost('/auth/login', { identifier: id, password: pass, role });

    // Server has already set the HttpOnly JWT cookie.
    // We only use the role from the response body for the redirect.
    const userRole = data.user?.role;
    redirectTo(ROLE_HOME[userRole] ?? '/');
  } catch (err) {
    showError(form, err.message ?? 'Login failed. Please try again.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function handleLogout(e) {
  e?.preventDefault();

  try {
    await apiPost('/auth/logout');
  } catch {
    // Even if the API call fails, redirect — the cookie TTL will expire
  } finally {
    redirectTo('/login.html');
  }
}

// ── Change Password ───────────────────────────────────────────────────────────

async function handleChangePassword(e) {
  e.preventDefault();
  const form        = e.target;
  const btn         = form.querySelector('[type="submit"]');
  const currentPass = form.querySelector('[name="current_password"]')?.value;
  const newPass     = form.querySelector('[name="new_password"]')?.value;
  const confirm     = form.querySelector('[name="confirm_password"]')?.value;

  clearError(form);

  if (!currentPass || !newPass || !confirm) {
    showError(form, 'All fields are required.');
    return;
  }

  if (newPass !== confirm) {
    showError(form, 'New passwords do not match.');
    return;
  }

  if (newPass.length < 8) {
    showError(form, 'Password must be at least 8 characters.');
    return;
  }

  setLoading(btn, true);

  try {
    await apiPost('/auth/change-password', {
      current_password: currentPass,
      new_password:     newPass,
    });

    // Show success then redirect to login
    showError(form, '✓ Password changed. Please log in again.');
    setTimeout(() => handleLogout(), 2000);
  } catch (err) {
    showError(form, err.message ?? 'Could not change password.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Forgot / Reset Password ───────────────────────────────────────────────────

async function handleForgotPassword(e) {
  e.preventDefault();
  const form  = e.target;
  const btn   = form.querySelector('[type="submit"]');
  const email = form.querySelector('[name="email"]')?.value.trim();

  clearError(form);

  if (!email) {
    showError(form, 'Please enter your email address.');
    return;
  }

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

async function handleResetPassword(e) {
  e.preventDefault();
  const form    = e.target;
  const btn     = form.querySelector('[type="submit"]');
  const token   = new URLSearchParams(window.location.search).get('token') ?? '';
  const newPass = form.querySelector('[name="new_password"]')?.value;
  const confirm = form.querySelector('[name="confirm_password"]')?.value;

  clearError(form);

  if (!token) {
    showError(form, 'Invalid or expired reset link.');
    return;
  }

  if (!newPass || newPass !== confirm) {
    showError(form, 'Passwords do not match.');
    return;
  }

  if (newPass.length < 8) {
    showError(form, 'Password must be at least 8 characters.');
    return;
  }

  setLoading(btn, true);

  try {
    await apiPost('/auth/reset-password', { token, new_password: newPass });
    showError(form, '✓ Password reset. Redirecting to login…');
    setTimeout(() => redirectTo('/login.html'), 2000);
  } catch (err) {
    showError(form, err.message ?? 'Reset failed. The link may have expired.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Populate user info in the UI ──────────────────────────────────────────────

/**
 * Fills elements that have [data-user-field="name|role|…"]
 * with values from the session user object.
 * Call after requireAuth() resolves.
 */
function populateUserUI(user) {
  if (!user) return;

  document.querySelectorAll('[data-user-field]').forEach(el => {
    const field = el.dataset.userField;
    if (field in user) el.textContent = user[field];
  });

  // Show/hide role-specific elements: data-role="admin,teacher"
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowed = el.dataset.role.split(',').map(r => r.trim());
    el.hidden = !allowed.includes(user.role);
  });
}

// ── Auto-init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Login form
  const loginForm = document.getElementById('loginForm');
  loginForm?.addEventListener('submit', handleLogin);

  // Logout buttons/links
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', handleLogout);
  });

  // Change-password form
  const changePwForm = document.getElementById('changePasswordForm');
  changePwForm?.addEventListener('submit', handleChangePassword);

  // Forgot-password form
  const forgotForm = document.getElementById('forgotPasswordForm');
  forgotForm?.addEventListener('submit', handleForgotPassword);

  // Reset-password form
  const resetForm = document.getElementById('resetPasswordForm');
  resetForm?.addEventListener('submit', handleResetPassword);

  // If on the login page and already authenticated, redirect home
  if (PUBLIC_PATHS.includes(window.location.pathname)) {
    getSession().then(user => {
      if (user) redirectTo(ROLE_HOME[user.role] ?? '/');
    });
  }
});

// ── Exports (for pages that import this as a module) ──────────────────────────

export {
  requireAuth,
  getSession,
  populateUserUI,
  handleLogout,
  apiGet,
  apiPost,
};