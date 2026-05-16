'use strict';

/**
 * auth-bridge.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * ──────────────────────────────────────────────────────────────
 * Compatibility shim: exposes window.SHC_Auth with the same API
 * that dashboard.html / parentPortal.html / script.js expect,
 * but backed by the HttpOnly-cookie session from auth.js instead
 * of the old hardcoded login.js credentials.
 *
 * Load this instead of login.js on every protected page:
 *   <script src="auth-bridge.js"></script>
 *
 * auth.js (type="module") is NOT required on protected pages —
 * only on login.html. The session cookie is verified server-side
 * on every API call. This bridge just handles UI/redirect logic.
 */

(function () {

  const API_BASE   = window.__ENV__?.API_URL ?? 'https://rms-bckend.onrender.com/api';
  const SESSION_KEY = 'shc_session';

  // ── Privileges map (mirrors data/users.js PRIVILEGES) ──────────────────────

  const PRIVILEGES = {
    Admin: {
      allowedSections:     ['dashboard','classes','arms','students','teachers','subjects','results','report-cards','attendance','fixtures','parent-portal','settings'],
      canEnterResults:     true,  canTakeAttendance:   true,  canViewResults:  true,
      canAddRemarks:       true,  canViewReports:      true,  canManageStaff:  true,
      canManageStudents:   true,  canViewParentPortal: true,  canAccessSettings: true,
    },
    Teacher: {
      allowedSections:     ['dashboard','students','results','report-cards','attendance','fixtures'],
      canEnterResults:     true,  canTakeAttendance:   true,  canViewResults:  true,
      canAddRemarks:       true,  canViewReports:      true,  canManageStaff:  false,
      canManageStudents:   false, canViewParentPortal: false, canAccessSettings: false,
    },
    Staff: {
      allowedSections:     ['dashboard','students','attendance'],
      canEnterResults:     false, canTakeAttendance:   true,  canViewResults:  false,
      canAddRemarks:       false, canViewReports:      false, canManageStaff:  false,
      canManageStudents:   false, canViewParentPortal: false, canAccessSettings: false,
    },
    Parent: {
      allowedSections:     ['parent-portal'],
      canEnterResults:     false, canTakeAttendance:   false, canViewResults:  true,
      canAddRemarks:       false, canViewReports:      false, canManageStaff:  false,
      canManageStudents:   false, canViewParentPortal: true,  canAccessSettings: false,
    },
    Student: {
      allowedSections:     ['parent-portal'],
      canEnterResults:     false, canTakeAttendance:   false, canViewResults:  true,
      canAddRemarks:       false, canViewReports:      false, canManageStaff:  false,
      canManageStudents:   false, canViewParentPortal: false, canAccessSettings: false,
    },
  };

  // ── Session cache helpers ───────────────────────────────────────────────────

  function _readCache() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  function _writeCache(user, privileges) {
    if (!user) return;
    const role = user.role || '';
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      role,
      name:          user.name          || '',
      email:         user.email         || '',
      firstName:     user.firstName     || user.firstname || '',
      lastName:      user.lastName      || user.lastname  || '',
      id:            user._id           || user.id        || '',
      assignedClass: user.assignedClass || user.assigned_class || '',
      assignedArm:   user.assignedArm   || user.assigned_arm   || '',
      wardId:        user.wardId        || user.ward_id        || null,
      children:      user.children      || [],
      privileges:    privileges || PRIVILEGES[role] || PRIVILEGES.Teacher,
    }));
  }

  function _clearCache() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Core fetch ──────────────────────────────────────────────────────────────

  async function _post(endpoint, body = {}) {
    const res = await fetch(API_BASE + endpoint, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:         JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  }

  async function _get(endpoint) {
    const res = await fetch(API_BASE + endpoint, {
      method:      'GET',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * getSession() — returns cached session or null.
   * Compatible with old login.js: sync, returns the session object directly.
   */
  function getSession() {
    return _readCache();
  }

  /**
   * saveSession(user) — write user to cache (called after login).
   */
  function saveSession(user) {
    const role = user?.role || '';
    _writeCache(user, PRIVILEGES[role] || {});
  }

  /**
   * clearSession() — remove cache (called on logout).
   */
  function clearSession() {
    _clearCache();
  }

  /**
   * verifySession() — async check via /auth/me cookie round-trip.
   * Returns user or null. Refreshes cache on success.
   */
  async function verifySession() {
    try {
      const data = await _get('/auth/me');
      const user = data.user ?? data;
      if (user && user.role) {
        _writeCache(user, PRIVILEGES[user.role] || {});
        return _readCache();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * logout() — POST /auth/logout, clear cache, redirect to login.
   */
  async function logout() {
    try { await _post('/auth/logout'); } catch { /* ignore */ }
    _clearCache();
    window.location.href = '/login.html';
  }

  // Privilege helpers (same API as login.js)
  function hasPrivilege(key)         { const s = getSession(); return s ? s.privileges?.[key] === true : false; }
  function canAccessSection(section) { const s = getSession(); return s ? (s.privileges?.allowedSections || []).includes(section) : false; }
  function canActOnClass(cls, arm)   { const s = getSession(); if (!s) return false; if (s.role === 'Admin') return true; return s.assignedClass === cls && s.assignedArm === arm; }
  function canViewChild(studentId)   { const s = getSession(); if (!s) return false; if (s.role !== 'Parent') return true; return Array.isArray(s.children) && s.children.some(c => c.studentId === studentId); }

  // Pending signup requests (sessionStorage — no passwords)
  const SIGNUP_KEY = 'shc_signup_requests';
  function getPendingRequests()     { try { return JSON.parse(sessionStorage.getItem(SIGNUP_KEY) || '[]'); } catch { return []; } }
  function getPendingCount()        { return getPendingRequests().filter(r => r.status === 'pending').length; }
  function approveRequest(id, note) { const list = getPendingRequests(); const r = list.find(x => x.id === id); if (r) { r.status = 'approved'; r.adminNote = note || ''; sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(list)); } }
  function rejectRequest(id, note)  { const list = getPendingRequests(); const r = list.find(x => x.id === id); if (r) { r.status = 'rejected'; r.adminNote = note || ''; sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(list)); } }

  // ── Auth guard — call on protected pages ────────────────────────────────────

  /**
   * requireAuth(allowedRoles?)
   * Checks the cached session first (sync fast path).
   * If missing, does a cookie round-trip to /auth/me.
   * Redirects to /login.html if not authenticated.
   *
   * @param {string[]} allowedRoles  Optional role whitelist
   */
  async function requireAuth(allowedRoles = []) {
    let session = getSession();

    if (!session) {
      session = await verifySession();
    }

    if (!session) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return null;
    }

    if (allowedRoles.length && !allowedRoles.includes(session.role)) {
      const home = { Admin: '/dashboard.html', Teacher: '/dashboard.html', Staff: '/dashboard.html', Student: '/dashboard.html', Parent: '/parentPortal.html' };
      window.location.href = home[session.role] || '/login.html';
      return null;
    }

    return session;
  }

  // ── Expose as window.SHC_Auth ───────────────────────────────────────────────

  window.SHC_Auth = {
    getSession,
    saveSession,
    clearSession,
    verifySession,
    requireAuth,
    logout,
    hasPrivilege,
    canAccessSection,
    canActOnClass,
    canViewChild,
    getPendingRequests,
    getPendingCount,
    approveRequest,
    rejectRequest,
    // Aliases used in some pages
    signOut: logout,
  };

  // ── Auto-guard: redirect to login if no session ─────────────────────────────
  // Only fires on non-public pages (i.e. not login.html / index.html).

  document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const isPublic = ['login.html', 'index.html', 'about.html', 'contact.html', ''].includes(page);

    if (!isPublic) {
      // Wire all logout buttons
      document.querySelectorAll('[data-action="logout"], .logout-btn, #logoutBtn').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); logout(); });
      });

      // ── CRITICAL FIX: guard race condition ──────────────────────────────────
      // We have a fast sync check (sessionStorage) and a slow async check
      // (/auth/me cookie round-trip). We must NOT redirect based on the sync
      // check alone — on a fresh page load after login the cache may not exist
      // yet (if SHC_Auth.saveSession wasn't called, e.g. older login path).
      //
      // Strategy:
      //  1. If cache exists → trust it immediately (common fast path).
      //  2. If cache is empty → do NOT redirect yet; fire async verify.
      //     Only redirect if the server also says no session.
      //
      const cached = getSession();
      if (cached) {
        // Session confirmed from cache — nothing to do.
        return;
      }

      // Cache miss: check server before redirecting (avoids false-positive blink)
      verifySession().then(session => {
        if (!session) {
          const next = encodeURIComponent(window.location.pathname);
          window.location.href = `/login.html?next=${next}`;
        }
        // If session verified — _writeCache was called inside verifySession,
        // so subsequent getSession() calls will succeed.
      });
    }
  });

})();