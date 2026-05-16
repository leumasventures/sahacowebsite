/**
 * auth.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * ─────────────────────────────────────────────────────────────────────────────
 * Single unified authentication script.  Plain <script> tag — NO type="module".
 * Replaces auth.js (module), auth-bridge.js, and login.js.
 *
 * Exposes:
 *   window.SHC_Auth   — full API surface (session, guard, privilege helpers)
 *
 * All auth state is carried by the HttpOnly cookie the server sets.
 * sessionStorage is used ONLY as a fast-path cache to avoid a round-trip
 * on every page load — it is NOT the source of truth.
 *
 * Load order in every page:
 *   <script src="auth.js"></script>      ← this file (FIRST)
 *   <script src="api.js"></script>
 *   <script src="script.js"></script>
 *   ... other scripts ...
 *
 * On login.html this file also wires up the login form, multi-step signup,
 * password toggles, role-hint banners, and SSO placeholders.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────────── */

  var API_BASE    = (global.__ENV__ && global.__ENV__.API_URL)
                      ? global.__ENV__.API_URL
                      : 'https://rms-bckend.onrender.com/api';

  var SESSION_KEY = 'shc_session';
  var TOKEN_KEY   = 'shc_token';    // stores the JWT returned in the login response body
  var SIGNUP_KEY  = 'shc_signup_requests';

  // All portal pages live at the root.
  var ROLE_HOME = {
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

  var PUBLIC_PAGES = ['login.html', 'index.html', 'about.html', 'contact.html', ''];

  /* ── PRIVILEGES MAP ─────────────────────────────────────────────────────── */

  var PRIVILEGES = {
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

  /* ── CORE FETCH ─────────────────────────────────────────────────────────── */

  /** Returns Authorization header object if a token is stored, else empty object */
  function _authHeader() {
    var token = sessionStorage.getItem(TOKEN_KEY);
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function _post(endpoint, body) {
    return fetch(API_BASE + endpoint, {
      method:      'POST',
      credentials: 'include',
      headers:     Object.assign({ 'Content-Type': 'application/json' }, _authHeader()),
      body:        JSON.stringify(body || {}),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.message || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }

  function _get(endpoint) {
    return fetch(API_BASE + endpoint, {
      method:      'GET',
      credentials: 'include',
      headers:     _authHeader(),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.message || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }

  /* ── SESSION CACHE ──────────────────────────────────────────────────────── */

  function _readCache() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function _writeCache(user, privileges) {
    if (!user) return;
    var role = user.role || '';
    var entry = {
      role:          role,
      name:          user.name          || '',
      email:         user.email         || '',
      firstName:     user.firstName     || user.firstname  || '',
      lastName:      user.lastName      || user.lastname   || '',
      id:            user._id           || user.id         || '',
      assignedClass: user.assignedClass || user.assigned_class || '',
      assignedArm:   user.assignedArm   || user.assigned_arm   || '',
      wardId:        user.wardId        || user.ward_id        || null,
      children:      user.children      || [],
      privileges:    privileges || PRIVILEGES[role] || PRIVILEGES['Teacher'],
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
  }

  function _clearCache() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  /* ── PUBLIC SESSION API ─────────────────────────────────────────────────── */

  /** getSession() — sync, returns cached session or null */
  function getSession() {
    return _readCache();
  }

  /** saveSession(user) — persist to sessionStorage after login */
  function saveSession(user) {
    var role = (user && user.role) ? user.role : '';
    _writeCache(user, PRIVILEGES[role] || {});
  }

  /** clearSession() — remove sessionStorage cache */
  function clearSession() {
    _clearCache();
  }

  /**
   * verifySession() — async.
   *
   * Strategy:
   *  1. If shc_token already exists in sessionStorage, call GET /auth/me with
   *     the Bearer header (already attached by _get).  If it succeeds, refresh
   *     the session cache and return.
   *  2. If shc_token is missing (e.g. first load after login on another tab,
   *     or sessionStorage was cleared), call POST /auth/refresh.  The refresh
   *     cookie IS sent cross-origin because it was set with SameSite=None and
   *     its path is /api/auth/refresh.  On success the server returns a new
   *     access token in the body — save it, then load the user.
   *  3. If both fail → return null → auth guard redirects to login.
   */
  function verifySession() {
    var hasToken = !!sessionStorage.getItem(TOKEN_KEY);

    if (hasToken) {
      // Token present — verify it is still valid
      return _get('/auth/me').then(function (data) {
        var user  = data.user || data;
        var token = data.token || data.accessToken;   // server now returns a fresh token
        if (user && user.role) {
          if (token) sessionStorage.setItem(TOKEN_KEY, token);
          _writeCache(user, PRIVILEGES[user.role] || {});
          return _readCache();
        }
        return null;
      }).catch(function () {
        // Token rejected (expired/invalid) — try refresh
        sessionStorage.removeItem(TOKEN_KEY);
        return _tryRefresh();
      });
    }

    // No token — try to get one via the refresh cookie
    return _tryRefresh();
  }

  /**
   * _tryRefresh() — POST /auth/refresh using the HttpOnly refresh cookie.
   * The refresh cookie path is /api/auth/refresh so it IS sent cross-origin
   * when credentials:'include' is set (it was set with SameSite=None; Secure).
   * On success saves the new access token and session cache.
   */
  function _tryRefresh() {
    return _post('/auth/refresh').then(function (data) {
      var token = data.token || data.accessToken;
      var user  = data.user  || data;
      if (token && user && user.role) {
        sessionStorage.setItem(TOKEN_KEY, token);
        _writeCache(user, PRIVILEGES[user.role] || {});
        return _readCache();
      }
      return null;
    }).catch(function () {
      return null;
    });
  }

  /**
   * logout() — POST /auth/logout, clear cache, redirect to login.
   */
  function logout(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    _post('/auth/logout').catch(function () {}).then(function () {
      _clearCache();
      global.location.href = '/login.html';
    });
  }

  /* ── AUTH GUARD ─────────────────────────────────────────────────────────── */

  /**
   * requireAuth(allowedRoles)
   * Fast-path: check sessionStorage cache first.
   * Slow-path: if cache miss, verify with /auth/me.
   * Redirects if not authenticated or wrong role.
   * Returns Promise<session|null>.
   *
   * Usage in any protected page:
   *   SHC_Auth.requireAuth(['Admin','Teacher']).then(function(session){ … });
   */
  function requireAuth(allowedRoles) {
    var roles   = allowedRoles || [];
    var session = getSession();

    if (session) {
      return Promise.resolve(_checkRole(session, roles));
    }

    return verifySession().then(function (session) {
      if (!session) {
        var next = encodeURIComponent(global.location.pathname + global.location.search);
        global.location.href = '/login.html?next=' + next;
        return null;
      }
      return _checkRole(session, roles);
    });
  }

  function _checkRole(session, roles) {
    if (roles.length && roles.indexOf(session.role) === -1) {
      global.location.href = ROLE_HOME[session.role] || '/login.html';
      return null;
    }
    return session;
  }

  /* ── PRIVILEGE HELPERS ──────────────────────────────────────────────────── */

  function hasPrivilege(key) {
    var s = getSession();
    return s ? s.privileges && s.privileges[key] === true : false;
  }

  function canAccessSection(section) {
    var s = getSession();
    if (!s) return false;
    var allowed = (s.privileges && s.privileges.allowedSections) || [];
    return allowed.indexOf(section) !== -1;
  }

  function canActOnClass(cls, arm) {
    var s = getSession();
    if (!s) return false;
    if (s.role === 'Admin') return true;
    return s.assignedClass === cls && s.assignedArm === arm;
  }

  function canViewChild(studentId) {
    var s = getSession();
    if (!s) return false;
    if (s.role !== 'Parent') return true;
    return Array.isArray(s.children) && s.children.some(function (c) { return c.studentId === studentId; });
  }

  /* ── PENDING SIGNUP REQUESTS (sessionStorage, no passwords stored) ────── */

  function getPendingRequests() {
    try { return JSON.parse(sessionStorage.getItem(SIGNUP_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function getPendingCount() {
    return getPendingRequests().filter(function (r) { return r.status === 'pending'; }).length;
  }

  function _saveRequests(list) {
    sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(list));
  }

  function approveRequest(id, note) {
    var list = getPendingRequests();
    var r = list.find ? list.find(function (x) { return x.id === id; }) : null;
    if (r) { r.status = 'approved'; r.adminNote = note || ''; _saveRequests(list); }
  }

  function rejectRequest(id, note) {
    var list = getPendingRequests();
    var r = list.find ? list.find(function (x) { return x.id === id; }) : null;
    if (r) { r.status = 'rejected'; r.adminNote = note || ''; _saveRequests(list); }
  }

  function _addSignupRequest(request) {
    var list = getPendingRequests();
    var id   = 'REQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    var entry = Object.assign({ id: id, status: 'pending', submittedAt: new Date().toISOString() }, request);
    list.push(entry);
    _saveRequests(list);
    return entry;
  }

  /* ════════════════════════════════════════════════════════════════════════
     UI HELPERS  (only used when login.html is active)
  ════════════════════════════════════════════════════════════════════════ */

  function _showFieldError(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    if (message) el.textContent = message;
    el.classList.add('show');
    el.style.visibility = 'visible';
    el.style.display    = 'block';
  }

  function _clearFieldError(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    el.style.visibility = 'hidden';
  }

  function _clearAllFieldErrors(prefix) {
    document.querySelectorAll('[id^="' + prefix + '"][id$="-error"]').forEach(function (el) {
      el.classList.remove('show');
      el.style.visibility = 'hidden';
    });
  }

  function _showFormError(formEl, message) {
    var box = formEl.querySelector('.auth-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'auth-error';
      box.setAttribute('role', 'alert');
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

  function _clearFormError(formEl) {
    var box = formEl.querySelector('.auth-error');
    if (box) box.hidden = true;
  }

  function _setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    if (loading) {
      btn.classList.add('loading');
      btn.textContent = '';
    } else {
      btn.classList.remove('loading');
      btn.textContent = btn.dataset.originalText;
    }
  }

  /* ── Login form handler ─────────────────────────────────────────────────── */

  function _handleLogin(e) {
    e.preventDefault();
    _clearAllFieldErrors('login');

    var role     = (document.getElementById('login-role')     || {}).value;
    var email    = ((document.getElementById('login-username') || {}).value || '').trim();
    var password = (document.getElementById('login-password') || {}).value;

    var valid = true;
    if (!role)     { _showFieldError('login-role-error',     'Please select your role.');                 valid = false; }
    if (!email)    { _showFieldError('login-username-error', 'Please enter your email or portal ID.');    valid = false; }
    if (!password) { _showFieldError('login-password-error', 'Please enter your password or PIN.');       valid = false; }
    if (!valid) return;

    var btn = document.getElementById('login-btn');
    _setLoading(btn, true);

    _post('/auth/login', { email: email, password: password, role: role }).then(function (data) {
      var userRole = data.user && data.user.role;

      // Save JWT from response body — this is the Bearer token used for all
      // subsequent API calls, bypassing the cross-origin cookie restriction.
      var token = data.token || data.accessToken;
      if (token) sessionStorage.setItem(TOKEN_KEY, token);

      // Write session cache BEFORE redirect so the dashboard doesn't bounce back.
      if (data.user) saveSession(data.user);

      if (btn) {
        btn.classList.remove('loading');
        btn.style.background = '#2E7D32';
        btn.textContent = '✔  Signed in successfully!';
      }

      setTimeout(function () {
        global.location.href = ROLE_HOME[userRole] || '/dashboard.html';
      }, 750);
    }).catch(function (err) {
      _setLoading(btn, false);
      _showFieldError('login-password-error', err.message || 'Login failed. Please try again.');
      var pwField = document.getElementById('login-password');
      if (pwField) { pwField.value = ''; pwField.focus(); }
    });
  }

  /* ── Change-password handler ─────────────────────────────────────────────── */

  function _handleChangePassword(e) {
    e.preventDefault();
    var form        = e.target;
    var btn         = form.querySelector('[type="submit"]');
    var currentPass = (form.querySelector('[name="current_password"]') || {}).value;
    var newPass     = (form.querySelector('[name="new_password"]')     || {}).value;
    var confirm     = (form.querySelector('[name="confirm_password"]') || {}).value;

    _clearFormError(form);

    if (!currentPass || !newPass || !confirm) { _showFormError(form, 'All fields are required.'); return; }
    if (newPass !== confirm)                  { _showFormError(form, 'New passwords do not match.'); return; }
    if (newPass.length < 8)                   { _showFormError(form, 'Password must be at least 8 characters.'); return; }

    _setLoading(btn, true);

    _post('/auth/change-password', { currentPassword: currentPass, newPassword: newPass })
      .then(function () {
        _showFormError(form, '✓ Password changed. Please log in again.');
        setTimeout(function () { logout(); }, 2000);
      })
      .catch(function (err) { _showFormError(form, err.message || 'Could not change password.'); })
      .then(function ()     { _setLoading(btn, false); });
  }

  /* ── Forgot-password handler ─────────────────────────────────────────────── */

  function _handleForgotPassword(e) {
    e.preventDefault();
    var form  = e.target;
    var btn   = form.querySelector('[type="submit"]');
    var email = ((form.querySelector('[name="email"]') || {}).value || '').trim();

    _clearFormError(form);
    if (!email) { _showFormError(form, 'Please enter your email address.'); return; }

    _setLoading(btn, true);

    _post('/auth/forgot-password', { email: email })
      .then(function ()     { _showFormError(form, '✓ If that email exists, a reset link has been sent.'); })
      .catch(function (err) { _showFormError(form, err.message || 'Request failed. Try again.'); })
      .then(function ()     { _setLoading(btn, false); });
  }

  /* ── Reset-password handler ─────────────────────────────────────────────── */

  function _handleResetPassword(e) {
    e.preventDefault();
    var form    = e.target;
    var btn     = form.querySelector('[type="submit"]');
    var token   = new URLSearchParams(global.location.search).get('token') || '';
    var newPass = (form.querySelector('[name="new_password"]')     || {}).value;
    var confirm = (form.querySelector('[name="confirm_password"]') || {}).value;

    _clearFormError(form);

    if (!token)                         { _showFormError(form, 'Invalid or expired reset link.'); return; }
    if (!newPass || newPass !== confirm) { _showFormError(form, 'Passwords do not match.'); return; }
    if (newPass.length < 8)             { _showFormError(form, 'Password must be at least 8 characters.'); return; }

    _setLoading(btn, true);

    _post('/auth/reset-password', { token: token, newPassword: newPass })
      .then(function () {
        _showFormError(form, '✓ Password reset. Redirecting to login…');
        setTimeout(function () { global.location.href = '/login.html'; }, 2000);
      })
      .catch(function (err) { _showFormError(form, err.message || 'Reset failed. The link may have expired.'); })
      .then(function ()     { _setLoading(btn, false); });
  }

  /* ── Role hints ─────────────────────────────────────────────────────────── */

  function _showRoleHints(role) {
    ['admin', 'teacher', 'parent'].forEach(function (r) {
      var el = document.getElementById('hint-' + r);
      if (el) el.classList.toggle('show', r === role);
    });
    var input = document.getElementById('login-username');
    if (!input) return;
    var hints = {
      admin:   'e.g. admin@sacredheartcollegeaba.com',
      teacher: 'e.g. enwosu@shc.edu.ng',
      parent:  'e.g. your@email.com',
    };
    input.placeholder = hints[role] || 'Enter your email address';
  }

  /* ── Password strength ──────────────────────────────────────────────────── */

  function _checkPasswordStrength(password, barId) {
    var score = 0;
    if (password.length >= 8)           score++;
    if (/[A-Z]/.test(password))         score++;
    if (/[0-9]/.test(password))         score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    var bar = document.getElementById(barId);
    if (!bar) return;
    bar.className = 'password-strength-bar';
    if (!password) { bar.style.width = '0'; return; }
    var levels = ['', 'strength-weak', 'strength-fair', 'strength-good', 'strength-strong'];
    bar.classList.add(levels[score] || 'strength-weak');
  }

  /* ── Password visibility toggle ─────────────────────────────────────────── */

  function _initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.closest('.password-wrapper') && btn.closest('.password-wrapper').querySelector('input');
        if (!input) return;
        var hidden = input.type === 'password';
        input.type  = hidden ? 'text' : 'password';
        btn.textContent = hidden ? '🙈' : '👁';
      });
    });
  }

  /* ── Tab / view switching ────────────────────────────────────────────────── */

  function _switchView(view) {
    var loginView  = document.getElementById('login-view');
    var signupView = document.getElementById('signup-view');
    var title      = document.getElementById('auth-title');
    var subtitle   = document.getElementById('auth-subtitle');

    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.view === view);
    });

    if (view === 'login') {
      if (loginView)  loginView.classList.add('active');
      if (signupView) signupView.classList.remove('active');
      if (title)      title.textContent    = 'Welcome Back';
      if (subtitle)   subtitle.textContent = 'Sign in to the SHC School Portal';
    } else {
      if (signupView) signupView.classList.add('active');
      if (loginView)  loginView.classList.remove('active');
      if (title)      title.textContent    = 'Account Request';
      if (subtitle)   subtitle.textContent = 'Request a Sacred Heart College portal account';
      _gotoStep(1);
      _signupState.role = null;
      document.querySelectorAll('.role-card').forEach(function (c) { c.classList.remove('selected'); });
      var nextBtn = document.getElementById('step1-next');
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  /* ── Multi-step signup ──────────────────────────────────────────────────── */

  var _signupState = { currentStep: 1, role: null, pendingData: null };

  function _gotoStep(step) {
    for (var i = 1; i <= 4; i++) {
      var el = document.getElementById('step-' + i);
      if (el) el.classList.toggle('active', i === step);
    }
    for (var j = 1; j <= 3; j++) {
      var dot  = document.getElementById('step-dot-' + j);
      var line = document.getElementById('step-line-' + j);
      var lbl  = document.getElementById('step-label-' + j);
      if (!dot) continue;
      dot.classList.remove('active', 'done');
      if (line) line.classList.remove('done');
      if (lbl)  lbl.classList.remove('active');
      if (j < step)       { dot.classList.add('done'); dot.textContent = '✓'; if (line) line.classList.add('done'); }
      else if (j === step) { dot.classList.add('active'); dot.textContent = j; if (lbl) lbl.classList.add('active'); }
      else                 { dot.textContent = j; }
    }
    var ind   = document.getElementById('step-indicator');
    var links = document.getElementById('signup-switch-link');
    var lbls  = document.querySelector('.step-labels');
    [ind, links, lbls].forEach(function (el) {
      if (el) el.style.display = step === 4 ? 'none' : '';
    });
    _signupState.currentStep = step;
  }

  function _val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function _validateStep2() {
    _clearAllFieldErrors('staff');
    _clearAllFieldErrors('parent');
    _clearFieldError('terms-error');
    var valid = true;

    if (!document.getElementById('terms') || !document.getElementById('terms').checked) {
      _showFieldError('terms-error', 'You must agree to the Terms to continue.');
      valid = false;
    }

    if (_signupState.role === 'teacher') {
      var fn = _val('staff-firstname'), ln = _val('staff-lastname'),
          em = _val('staff-email'),    ph = _val('staff-phone'),
          dp = _val('staff-dept'),     pw = _val('staff-password'), cf = _val('staff-confirm');
      if (!fn || fn.length < 2) { _showFieldError('staff-firstname-error', 'Enter your first name.'); valid = false; }
      if (!ln || ln.length < 2) { _showFieldError('staff-lastname-error',  'Enter your last name.');  valid = false; }
      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { _showFieldError('staff-email-error', 'Enter a valid email.'); valid = false; }
      if (!ph || ph.length < 8) { _showFieldError('staff-phone-error',    'Enter a valid phone.');    valid = false; }
      if (!dp)                  { _showFieldError('staff-dept-error',     'Select your department.'); valid = false; }
      if (!pw || pw.length < 6) { _showFieldError('staff-password-error', 'Password must be ≥ 6 chars.'); valid = false; }
      if (pw !== cf)            { _showFieldError('staff-confirm-error',  'Passwords do not match.'); valid = false; }
    }

    if (_signupState.role === 'parent') {
      var fn2 = _val('parent-firstname'), ln2 = _val('parent-lastname'),
          em2 = _val('parent-email'),     ph2 = _val('parent-phone'),
          rl  = _val('parent-relation'),  sn  = _val('parent-student-name'),
          sc  = _val('parent-student-class'),
          pw2 = _val('parent-password'),  cf2 = _val('parent-confirm');
      if (!fn2 || fn2.length < 2) { _showFieldError('parent-firstname-error', 'Enter your first name.'); valid = false; }
      if (!ln2 || ln2.length < 2) { _showFieldError('parent-lastname-error',  'Enter your last name.');  valid = false; }
      if (!em2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em2)) { _showFieldError('parent-email-error', 'Enter a valid email.'); valid = false; }
      if (!ph2 || ph2.length < 8) { _showFieldError('parent-phone-error',    'Enter a valid phone.');  valid = false; }
      if (!rl)  { _showFieldError('parent-relation-error',     'Select your relationship.');  valid = false; }
      if (!sn || sn.length < 3)   { _showFieldError('parent-student-name-error', "Enter your child's name."); valid = false; }
      if (!sc)  { _showFieldError('parent-student-class-error', "Select your child's class."); valid = false; }
      if (!pw2 || pw2.length < 6) { _showFieldError('parent-password-error', 'Password must be ≥ 6 chars.'); valid = false; }
      if (pw2 !== cf2)            { _showFieldError('parent-confirm-error',  'Passwords do not match.'); valid = false; }
    }

    return valid;
  }

  function _collectStep2Data() {
    if (_signupState.role === 'teacher') {
      return {
        type: 'staff',
        data: {
          firstname:  _val('staff-firstname'),
          lastname:   _val('staff-lastname'),
          email:      _val('staff-email'),
          phone:      _val('staff-phone'),
          department: _val('staff-dept'),
          staffId:    _val('staff-staffid'),
          note:       _val('staff-note'),
        },
      };
    }
    return {
      type: 'parent',
      data: {
        firstname:    _val('parent-firstname'),
        lastname:     _val('parent-lastname'),
        email:        _val('parent-email'),
        phone:        _val('parent-phone'),
        relation:     _val('parent-relation'),
        studentName:  _val('parent-student-name'),
        studentClass: _val('parent-student-class'),
        studentArm:   _val('parent-student-arm'),
        studentId:    _val('parent-student-id'),
      },
    };
  }

  function _buildReviewPanel(data) {
    function row(label, value) {
      if (!value) return '';
      return '<div style="display:flex;justify-content:space-between;padding:.55rem 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:.85rem;">' +
        '<span style="color:var(--muted,#888);font-weight:500;">' + label + '</span>' +
        '<span style="font-weight:600;text-align:right;max-width:60%;">' + value + '</span>' +
        '</div>';
    }
    var d = data.data;
    if (data.type === 'staff') {
      return '<div style="background:var(--sand,#fafaf7);border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:.5rem;">' +
        '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.9rem;">' +
        '<span style="font-size:1.4rem;">📚</span><div><div style="font-weight:700;font-size:.95rem;">' + d.firstname + ' ' + d.lastname + '</div>' +
        '<span class="status-badge pending">⏳ Awaiting Approval</span></div></div>' +
        row('Account Type', 'Staff / Teacher') + row('Email', d.email) + row('Phone', d.phone) +
        row('Department', d.department) + row('Staff ID / TRCN', d.staffId) + row('Note to Admin', d.note) +
        '</div>';
    }
    return '<div style="background:var(--sand,#fafaf7);border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:.5rem;">' +
      '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.9rem;">' +
      '<span style="font-size:1.4rem;">👨‍👩‍👧</span><div><div style="font-weight:700;font-size:.95rem;">' + d.firstname + ' ' + d.lastname + '</div>' +
      '<span class="status-badge pending">⏳ Awaiting Approval</span></div></div>' +
      row('Account Type', 'Parent / Guardian') + row('Email', d.email) + row('Phone', d.phone) +
      row('Relationship', d.relation) + row("Child's Name", d.studentName) +
      row("Child's Class", d.studentClass + (d.studentArm ? ' ' + d.studentArm : '')) +
      row('Admission No.', d.studentId) +
      '</div>';
  }

  function _initRoleCards() {
    document.querySelectorAll('.role-card').forEach(function (card) {
      function select() {
        document.querySelectorAll('.role-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        _signupState.role = card.dataset.role;
        var nextBtn = document.getElementById('step1-next');
        if (nextBtn) nextBtn.disabled = false;
        _clearFieldError('signup-role-error');
      }
      card.addEventListener('click', select);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') select(); });
    });

    var step1next = document.getElementById('step1-next');
    if (step1next) {
      step1next.addEventListener('click', function () {
        if (!_signupState.role) { _showFieldError('signup-role-error', 'Please select an account type.'); return; }
        var sf = document.getElementById('staff-fields');
        var pf = document.getElementById('parent-fields');
        if (sf) sf.style.display = _signupState.role === 'teacher' ? 'block' : 'none';
        if (pf) pf.style.display = _signupState.role === 'parent'  ? 'block' : 'none';
        _gotoStep(2);
      });
    }
  }

  function _initStep2() {
    var back = document.getElementById('step2-back');
    var next = document.getElementById('step2-next');
    if (back) back.addEventListener('click', function () { _gotoStep(1); });
    if (next) next.addEventListener('click', function () {
      if (!_validateStep2()) return;
      var data = _collectStep2Data();
      _signupState.pendingData = data;
      var reviewEl = document.getElementById('review-content');
      if (reviewEl) reviewEl.innerHTML = _buildReviewPanel(data);
      _gotoStep(3);
    });

    var sp = document.getElementById('staff-password');
    var pp = document.getElementById('parent-password');
    if (sp) sp.addEventListener('input', function (e) { _checkPasswordStrength(e.target.value, 'strength-bar'); });
    if (pp) pp.addEventListener('input', function (e) { _checkPasswordStrength(e.target.value, 'parent-strength-bar'); });
  }

  function _initStep3() {
    var back   = document.getElementById('step3-back');
    var submit = document.getElementById('submit-btn');
    if (back) back.addEventListener('click', function () { _gotoStep(2); });

    if (submit) {
      submit.addEventListener('click', function () {
        if (!_signupState.pendingData) return;
        _setLoading(submit, true);

        var entry = _addSignupRequest(_signupState.pendingData);
        console.info('[SHC Auth] Signup request saved locally:', entry.id);

        // Send to backend (best-effort — graceful fallback if route not yet live)
        _post('/auth/signup-request', {
          type: _signupState.pendingData.type,
          data: _signupState.pendingData.data,
        }).catch(function () {}).then(function () {
          _setLoading(submit, false);
          var email   = _signupState.pendingData.data.email;
          var typeLabel = _signupState.pendingData.type === 'staff' ? 'staff' : 'parent';
          var successMsg = document.getElementById('success-msg');
          if (successMsg) {
            successMsg.innerHTML =
              'Your <strong>' + typeLabel + '</strong> account request has been submitted.<br><br>' +
              'You will be notified at <strong>' + email + '</strong> once the admin approves your account.';
          }
          _gotoStep(4);
          setTimeout(function () {
            document.querySelectorAll('[data-switch]').forEach(function (link) {
              link.addEventListener('click', function (e) { e.preventDefault(); _switchView(link.dataset.switch); });
            });
          }, 100);
        });
      });
    }
  }

  /* ── SSO placeholders ───────────────────────────────────────────────────── */

  function _handleGoogleSSO() {
    alert('Google SSO is not yet configured for the SHC portal.\nPlease sign in with your email and password.');
  }

  function _handleMicrosoftSSO() {
    alert('Microsoft SSO is not yet configured for the SHC portal.\nPlease sign in with your email and password.');
  }

  /* ── Populate user info ─────────────────────────────────────────────────── */

  function populateUserUI(user) {
    if (!user) return;
    document.querySelectorAll('[data-user-field]').forEach(function (el) {
      var field = el.dataset.userField;
      if (field in user) el.textContent = user[field];
    });
    document.querySelectorAll('[data-role]').forEach(function (el) {
      var allowed = el.dataset.role.split(',').map(function (r) { return r.trim().toLowerCase(); });
      el.hidden = allowed.indexOf((user.role || '').toLowerCase()) === -1;
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     DOMContentLoaded — wire everything depending on which page we're on
  ════════════════════════════════════════════════════════════════════════ */

  /* ── Session-ready promise ───────────────────────────────────────────────
     SHC_Auth.ready  → Promise<session|null>
     Resolves once the auth guard has finished its /auth/me check (or found a
     cached session).  Any code that needs a valid session before running —
     especially loadAppData — should await this instead of running immediately.
  ── */
  var _sessionReadyResolve;
  var _sessionReadyPromise = new Promise(function (resolve) {
    _sessionReadyResolve = resolve;
  });

  document.addEventListener('DOMContentLoaded', function () {
    var page = global.location.pathname.split('/').pop() || 'index.html';

    // ── Login page ────────────────────────────────────────────────────────
    if (page === 'login.html' || page === '') {

      // Wire login form
      var loginForm = document.getElementById('login-form');
      if (loginForm) loginForm.addEventListener('submit', _handleLogin);

      // Wire other auth forms
      var changeForm  = document.getElementById('changePasswordForm');
      var forgotForm  = document.getElementById('forgotPasswordForm');
      var resetForm   = document.getElementById('resetPasswordForm');
      if (changeForm)  changeForm.addEventListener('submit',  _handleChangePassword);
      if (forgotForm)  forgotForm.addEventListener('submit',  _handleForgotPassword);
      if (resetForm)   resetForm.addEventListener('submit',   _handleResetPassword);

      // Tabs
      document.querySelectorAll('.tab').forEach(function (tab) {
        tab.addEventListener('click', function () { _switchView(tab.dataset.view); });
      });
      document.querySelectorAll('[data-switch]').forEach(function (link) {
        link.addEventListener('click', function (e) { e.preventDefault(); _switchView(link.dataset.switch); });
      });

      // SSO
      var gBtn = document.getElementById('google-btn');
      var mBtn = document.getElementById('ms-btn');
      if (gBtn) gBtn.addEventListener('click', _handleGoogleSSO);
      if (mBtn) mBtn.addEventListener('click', _handleMicrosoftSSO);

      // Role hints
      var roleSelect = document.getElementById('login-role');
      if (roleSelect) roleSelect.addEventListener('change', function (e) { _showRoleHints(e.target.value); });

      // Live error clearing
      document.querySelectorAll('#login-form input, #login-form select').forEach(function (el) {
        el.addEventListener('input', function () { _clearAllFieldErrors('login'); });
      });

      // Password toggles & strength
      _initPasswordToggles();

      // Multi-step signup
      _initRoleCards();
      _initStep2();
      _initStep3();

      // Auto-redirect if already logged in
      verifySession().then(function (session) {
        if (session) global.location.href = ROLE_HOME[session.role] || '/dashboard.html';
        _sessionReadyResolve(null); // login page — no guard needed
      });

      return;   // don't run the protected-page guard on the login page
    }

    // ── Protected pages ────────────────────────────────────────────────────
    if (PUBLIC_PAGES.indexOf(page) === -1) {

      // Wire logout buttons
      document.querySelectorAll('[data-action="logout"], .logout-btn, #logoutBtn').forEach(function (el) {
        el.addEventListener('click', logout);
      });

      // Auth guard: cache-first, but ALWAYS ensure a token exists.
      // Having a session cache entry is not enough — if shc_token is missing
      // (e.g. first load after deploying Bearer-token support, or token was
      // cleared by the browser) API calls will 401 even though the session
      // cache says "logged in".  We must have a token before resolving ready.
      var cached    = getSession();
      var hasToken  = !!sessionStorage.getItem(TOKEN_KEY);

      if (cached && hasToken) {
        // Both session and token present — fast path, proceed immediately.
        _sessionReadyResolve(cached);
      } else if (cached && !hasToken) {
        // Session cache present but no token — try to get one via refresh cookie,
        // then resolve ready with whatever we get back.
        verifySession().then(function (session) {
          if (session) {
            _sessionReadyResolve(session);
          } else {
            // Refresh also failed — session is stale, force re-login.
            var next = encodeURIComponent(global.location.pathname);
            global.location.href = '/login.html?next=' + next;
            _sessionReadyResolve(null);
          }
        });
      } else {
        // No session cache at all — full server verify
        verifySession().then(function (session) {
          if (!session) {
            var next = encodeURIComponent(global.location.pathname);
            global.location.href = '/login.html?next=' + next;
            _sessionReadyResolve(null);
          } else {
            _sessionReadyResolve(session);
          }
        });
      }
    } else {
      // Public page — resolve immediately so nothing hangs
      _sessionReadyResolve(null);
    }
  });

  /* ════════════════════════════════════════════════════════════════════════
     EXPOSE window.SHC_Auth
  ════════════════════════════════════════════════════════════════════════ */

  global.SHC_Auth = {
    // Session
    getSession:     getSession,
    saveSession:    saveSession,
    clearSession:   clearSession,
    verifySession:  verifySession,
    requireAuth:    requireAuth,
    logout:         logout,
    signOut:        logout,         // alias

    // ready — Promise<session|null> — resolves once the auth guard completes.
    // Await this before making any authenticated API calls.
    ready: _sessionReadyPromise,

    // Privilege helpers
    hasPrivilege:      hasPrivilege,
    canAccessSection:  canAccessSection,
    canActOnClass:     canActOnClass,
    canViewChild:      canViewChild,

    // Signup requests (admin-side)
    getPendingRequests: getPendingRequests,
    getPendingCount:    getPendingCount,
    approveRequest:     approveRequest,
    rejectRequest:      rejectRequest,

    // UI
    populateUserUI:    populateUserUI,

    // Constants (read-only)
    ROLE_HOME:   ROLE_HOME,
    PRIVILEGES:  PRIVILEGES,
  };

  console.info('[auth] window.SHC_Auth registered.');

}(window));