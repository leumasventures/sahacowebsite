/**
 * api.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * ─────────────────────────────────────────────────────────────────────────────
 * Single unified API client.  Plain <script> tag — NO type="module".
 * Exposes window.API (and individual window.Auth, window.Classes, etc.)
 * so every other script can call them without import.
 *
 * All data goes to the backend: https://rms-bckend.onrender.com/api
 *
 * Load order in every page:
 *   <script src="auth.js"></script>      ← session / guard
 *   <script src="api.js"></script>       ← this file
 *   <script src="script.js"></script>
 *   <script src="persistence_patch.js"></script>
 *   ... other page scripts ...
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────────── */

  var BASE_URL          = (global.__ENV__ && global.__ENV__.API_URL)
                            ? global.__ENV__.API_URL
                            : 'https://rms-bckend.onrender.com/api';
  var DEFAULT_TIMEOUT   = 15000;
  var EXPORT_TIMEOUT    = 60000;

  /* ── CORE REQUEST ────────────────────────────────────────────────────────── */

  /**
   * request(method, path, body, isFormData, timeoutMs)
   * Returns a Promise that resolves with the parsed JSON body,
   * or rejects with an Error that has .status, .code, .errors attached.
   */
  function request(method, path, body, isFormData, timeoutMs) {
    var timeout = timeoutMs || DEFAULT_TIMEOUT;
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, timeout)
      : null;

    var options = {
      method:      method,
      credentials: 'include',
      headers:     {},
    };
    if (controller) options.signal = controller.signal;

    // Attach the JWT stored by auth.js after login.
    // This makes every API call work cross-origin regardless of cookie policy.
    var token = sessionStorage.getItem('shc_token');
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    if (body !== null && body !== undefined) {
      if (isFormData) {
        options.body = body;                          // FormData — browser sets Content-Type
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    return fetch(BASE_URL + path, options).then(function (res) {
      if (timer) clearTimeout(timer);

      if (res.status === 204) return null;

      return res.json().catch(function () { return { message: res.statusText }; })
        .then(function (data) {
          if (!res.ok) {
            var err    = new Error(data.message || ('API error ' + res.status));
            err.status = res.status;
            err.code   = data.code   || null;
            err.errors = data.errors || null;
            err.data   = data;
            throw err;
          }
          return data;
        });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err.name === 'AbortError') {
        var t  = new Error('Request timed out: ' + method + ' ' + path);
        t.status = 408;
        throw t;
      }
      throw err;
    });
  }

  var get    = function (path, ms)       { return request('GET',    path, null,  false, ms); };
  var post   = function (path, body)     { return request('POST',   path, body,  false); };
  var put    = function (path, body)     { return request('PUT',    path, body,  false); };
  var patch  = function (path, body)     { return request('PATCH',  path, body,  false); };
  var del    = function (path)           { return request('DELETE', path, null,  false); };
  var upload = function (path, form, ms) { return request('POST',   path, form,  true,  ms || DEFAULT_TIMEOUT); };

  /* ── QUERY STRING ────────────────────────────────────────────────────────── */

  function buildQuery(params) {
    var pairs = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v !== null && v !== undefined && v !== '') {
        pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
    });
    return pairs.length ? '?' + pairs.join('&') : '';
  }

  /* ── RESPONSE NORMALISER (used by loadAppData) ───────────────────────────── */

  function normalizeList(res) {
    if (Array.isArray(res)) return res;
    var keys = ['data','students','staff','classes','subjects','results','fixtures','notices'];
    for (var i = 0; i < keys.length; i++) {
      if (res && Array.isArray(res[keys[i]])) return res[keys[i]];
    }
    return [];
  }

  /* ── UI TOAST (thin wrapper so api.js doesn't depend on script.js order) ─── */

  function uiToast(msg, type) {
    if (typeof global.toast === 'function') global.toast(msg, type || 'error');
    else console.warn('[api]', type || 'error', msg);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     AUTH
     Matches backend routes: /api/auth/*
  ══════════════════════════════════════════════════════════════════════════ */

  var Auth = {
    /** POST /auth/login  { email, password, role } */
    login: function (email, password, role) {
      return post('/auth/login', { email: email, password: password, role: role });
    },
    /** POST /auth/logout */
    logout: function () {
      return post('/auth/logout');
    },
    /** GET /auth/me */
    me: function () {
      return get('/auth/me');
    },
    /** POST /auth/refresh */
    refresh: function () {
      return post('/auth/refresh');
    },
    /** POST /auth/change-password  { currentPassword, newPassword } */
    changePassword: function (currentPassword, newPassword) {
      return post('/auth/change-password', { currentPassword: currentPassword, newPassword: newPassword });
    },
    /** POST /auth/forgot-password  { email } */
    forgotPassword: function (email) {
      return post('/auth/forgot-password', { email: email });
    },
    /** POST /auth/reset-password  { token, newPassword } */
    resetPassword: function (token, newPassword) {
      return post('/auth/reset-password', { token: token, newPassword: newPassword });
    },
    /** POST /auth/signup-request  { type, data } */
    signupRequest: function (type, data) {
      return post('/auth/signup-request', { type: type, data: data });
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     CLASSES
     Backend param: :name (URL-encoded class name string, e.g. "SS%202")
  ══════════════════════════════════════════════════════════════════════════ */

  var Classes = {
    /** GET /classes?level=&search= */
    getAll: function (params) {
      return get('/classes' + buildQuery(params));
    },
    /** GET /classes/:name */
    getByName: function (name) {
      return get('/classes/' + encodeURIComponent(name));
    },
    getById: function (name) {           // alias — callers may pass a name string
      return get('/classes/' + encodeURIComponent(name));
    },
    /** POST /classes  { name, level, arms[] } */
    create: function (data) {
      return post('/classes', data);
    },
    /** PUT /classes/:name  { name?, level? } */
    update: function (name, data) {
      return put('/classes/' + encodeURIComponent(name), data);
    },
    /** DELETE /classes/:name */
    delete: function (name) {
      return del('/classes/' + encodeURIComponent(name));
    },
    /** GET /classes/:name/students?arm= */
    getStudents: function (name, params) {
      return get('/classes/' + encodeURIComponent(name) + '/students' + buildQuery(params));
    },
    /** GET /classes/:name/summary?arm=&term=&session= */
    getSummary: function (name, params) {
      return get('/classes/' + encodeURIComponent(name) + '/summary' + buildQuery(params));
    },
    /** PATCH /classes/:name/assign-teacher  { teacher_id, arm? } */
    assignTeacher: function (name, data) {
      return patch('/classes/' + encodeURIComponent(name) + '/assign-teacher', data);
    },
    /* Arms */
    /** GET /classes/:name/arms */
    getArms: function (name) {
      return get('/classes/' + encodeURIComponent(name) + '/arms');
    },
    /** POST /classes/:name/arms  { arm } | { arms: [] } */
    addArm: function (name, data) {
      return post('/classes/' + encodeURIComponent(name) + '/arms', data);
    },
    /** PATCH /classes/:name/arms/:arm  { new_name } */
    renameArm: function (name, arm, data) {
      return patch('/classes/' + encodeURIComponent(name) + '/arms/' + encodeURIComponent(arm), data);
    },
    /** DELETE /classes/:name/arms/:arm */
    deleteArm: function (name, arm) {
      return del('/classes/' + encodeURIComponent(name) + '/arms/' + encodeURIComponent(arm));
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     STUDENTS
  ══════════════════════════════════════════════════════════════════════════ */

  var Students = {
    /** GET /students?class=&arm=&gender=&search=&sortBy=&sortDir=&page=&limit= */
    getAll: function (params) {
      return get('/students' + buildQuery(params));
    },
    getById: function (id) {
      return get('/students/' + id);
    },
    /** POST /students  { name, class, arm, gender, … } */
    create: function (data) {
      return post('/students', data);
    },
    update: function (id, data) {
      return put('/students/' + id, data);
    },
    /** PATCH /students/:id/status  { status } */
    setStatus: function (id, status) {
      return patch('/students/' + id + '/status', { status: status });
    },
    delete: function (id) {
      return del('/students/' + id);
    },
    /** GET /students/:id/results?term=&session= */
    getResults: function (id, params) {
      return get('/students/' + id + '/results' + buildQuery(params));
    },
    /** GET /students/:id/attendance?term=&session= */
    getAttendance: function (id, params) {
      return get('/students/' + id + '/attendance' + buildQuery(params));
    },
    /** GET /students/:id/report-card?term=&session= */
    getReportCard: function (id, params) {
      return get('/students/' + id + '/report-card' + buildQuery(params));
    },
    /** GET /students/:id/summary?term=&session= */
    getSummary: function (id, params) {
      return get('/students/' + id + '/summary' + buildQuery(params));
    },
    /** PATCH /students/:id/transfer  { class, arm } */
    transfer: function (id, data) {
      return patch('/students/' + id + '/transfer', data);
    },
    /** PATCH /students/:id/attendance  { attendance: 0-100 } */
    updateAttendance: function (id, val) {
      return patch('/students/' + id + '/attendance', { attendance: val });
    },
    /** GET /students/export?class=&arm= */
    export: function (params) {
      return get('/students/export' + buildQuery(params), EXPORT_TIMEOUT);
    },
    /** POST /students/bulk  { class, arm, students: [] } */
    bulkCreate: function (data) {
      return post('/students/bulk', data);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     STAFF / TEACHERS  (same backend routes, aliased below)
  ══════════════════════════════════════════════════════════════════════════ */

  var Staff = {
    /** GET /staff?category=&status=&department=&subject=&search= */
    getAll: function (params) {
      return get('/staff' + buildQuery(params));
    },
    getById: function (id) {
      return get('/staff/' + id);
    },
    /** POST /staff  { name, category, position, … } */
    create: function (data) {
      return post('/staff', data);
    },
    update: function (id, data) {
      return put('/staff/' + id, data);
    },
    /** PATCH /staff/:id/status  { status } */
    setStatus: function (id, status) {
      return patch('/staff/' + id + '/status', { status: status });
    },
    /** PATCH /staff/:id/assign-class  { classUnit, arm } */
    assignClass: function (id, data) {
      return patch('/staff/' + id + '/assign-class', data);
    },
    /** PATCH /staff/:id/assign-subject  { subject_id } */
    assignSubject: function (id, data) {
      return patch('/staff/' + id + '/assign-subject', data);
    },
    /** GET /staff/:id/students */
    getStudents: function (id) {
      return get('/staff/' + id + '/students');
    },
    /** POST /staff/:id/credentials  { credentials: [{name,size,type}] } */
    uploadCredential: function (id, data) {
      return post('/staff/' + id + '/credentials', data);
    },
    /** DELETE /staff/:id/credentials/:credIndex */
    deleteCredential: function (id, credIndex) {
      return del('/staff/' + id + '/credentials/' + credIndex);
    },
    delete: function (id) {
      return del('/staff/' + id);
    },
    /** GET /staff/export */
    export: function (params) {
      return get('/staff/export' + buildQuery(params), EXPORT_TIMEOUT);
    },
  };

  var Teachers = Staff;   // /api/teachers is aliased to /api/staff on the server

  /* ══════════════════════════════════════════════════════════════════════════
     SUBJECTS
  ══════════════════════════════════════════════════════════════════════════ */

  var Subjects = {
    /** GET /subjects?level=&type=&code=&search= */
    getAll: function (params) {
      return get('/subjects' + buildQuery(params));
    },
    getById: function (id) {
      return get('/subjects/' + id);
    },
    /** POST /subjects  { name, code, level?, type? } */
    create: function (data) {
      return post('/subjects', data);
    },
    update: function (id, data) {
      return put('/subjects/' + id, data);
    },
    delete: function (id) {
      return del('/subjects/' + id);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     RESULTS
  ══════════════════════════════════════════════════════════════════════════ */

  var Results = {
    /** GET /results?studentId=&class=&arm=&subject=&term=&session= */
    getAll: function (params) {
      return get('/results' + buildQuery(params));
    },
    getById: function (id) {
      return get('/results/' + id);
    },
    /** POST /results  { studentId, subject, term, session, ca, exam } */
    create: function (data) {
      return post('/results', data);
    },
    /** PUT /results/:id  { ca?, exam? } */
    update: function (id, data) {
      return put('/results/' + id, data);
    },
    delete: function (id) {
      return del('/results/' + id);
    },
    /**
     * POST /results/bulk
     * { class_id, subject_id, term_id, session_id, results:[{student_id,ca,exam}] }
     */
    bulkCreate: function (data) {
      return post('/results/bulk', data);
    },
    /** GET /results/stats?class=&arm=&term=&session= */
    getStats: function (params) {
      return get('/results/stats' + buildQuery(params));
    },
    /** GET /results/report-card/:studentId?term=&session= */
    getReportCard: function (studentId, term, session) {
      return get('/results/report-card/' + studentId + buildQuery({ term: term, session: session }));
    },
    /* Subject allocations */
    /** GET /results/allocations/class/:class/:arm */
    getClassAllocation: function (cls, arm) {
      return get('/results/allocations/class/' + encodeURIComponent(cls) + '/' + encodeURIComponent(arm));
    },
    /** PUT /results/allocations/class/:class/:arm  { subjects[] } */
    setClassAllocation: function (cls, arm, subjects) {
      return put('/results/allocations/class/' + encodeURIComponent(cls) + '/' + encodeURIComponent(arm), { subjects: subjects });
    },
    /** DELETE /results/allocations/class/:class/:arm */
    clearClassAllocation: function (cls, arm) {
      return del('/results/allocations/class/' + encodeURIComponent(cls) + '/' + encodeURIComponent(arm));
    },
    /** GET /results/allocations/student/:studentId */
    getStudentAllocation: function (studentId) {
      return get('/results/allocations/student/' + studentId);
    },
    /** PUT /results/allocations/student/:studentId  { subjects[] } */
    setStudentAllocation: function (studentId, subjects) {
      return put('/results/allocations/student/' + studentId, { subjects: subjects });
    },
    /** POST /results/allocations/bulk-student  { class, arm, subjects[] } */
    bulkSetStudentAllocations: function (data) {
      return post('/results/allocations/bulk-student', data);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     ATTENDANCE
  ══════════════════════════════════════════════════════════════════════════ */

  var Attendance = {
    /** GET /attendance?studentId=&class=&arm=&date=&term=&session=&status= */
    getAll: function (params) {
      return get('/attendance' + buildQuery(params));
    },
    /**
     * POST /attendance  { studentId, class, arm, date, term, session, status }
     * status values: 'p' | 'a' | 'l' | 'e'
     */
    mark: function (data) {
      return post('/attendance', data);
    },
    /**
     * POST /attendance/bulk
     * { class, arm, date, term, session, records:[{student_id, status}] }
     */
    bulkMark: function (data) {
      return post('/attendance/bulk', data);
    },
    /** PUT /attendance/:id  { status?, remarks? } */
    update: function (id, data) {
      return put('/attendance/' + id, data);
    },
    /** GET /attendance/summary/:studentId?term=&session= */
    getSummary: function (studentId, term, session) {
      return get('/attendance/summary/' + studentId + buildQuery({ term: term, session: session }));
    },
    /** GET /attendance/class-summary?class=&arm=&term=&session= */
    getClassSummary: function (params) {
      return get('/attendance/class-summary' + buildQuery(params));
    },
    /** GET /attendance/domains?class=&arm=&term=&session= */
    getClassDomains: function (params) {
      return get('/attendance/domains' + buildQuery(params));
    },
    /**
     * PUT /attendance/domains/:studentId?term=&session=
     * { cognitive?, affective?, psychomotor?, behavior_0?…behavior_7? }
     */
    setStudentDomains: function (studentId, term, session, data) {
      return put('/attendance/domains/' + studentId + buildQuery({ term: term, session: session }), data);
    },
    /** GET /attendance/school-days/:term */
    getSchoolDays: function (term) {
      return get('/attendance/school-days/' + encodeURIComponent(term));
    },
    /** GET /attendance/export?class=&arm=&term=&session= */
    export: function (params) {
      return get('/attendance/export' + buildQuery(params), EXPORT_TIMEOUT);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     FIXTURES
  ══════════════════════════════════════════════════════════════════════════ */

  var Fixtures = {
    getAll: function (params) {
      return get('/fixtures' + buildQuery(params));
    },
    getById: function (id) {
      return get('/fixtures/' + id);
    },
    create: function (data) {
      return post('/fixtures', data);
    },
    update: function (id, data) {
      return put('/fixtures/' + id, data);
    },
    delete: function (id) {
      return del('/fixtures/' + id);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     NOTICES
  ══════════════════════════════════════════════════════════════════════════ */

  var Notices = {
    /** GET /notices?audience= */
    getAll: function (params) {
      return get('/notices' + buildQuery(params));
    },
    /** POST /notices  { title, body, audience, pinned } */
    create: function (data) {
      return post('/notices', data);
    },
    delete: function (id) {
      return del('/notices/' + id);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     ADMIN / SETTINGS
  ══════════════════════════════════════════════════════════════════════════ */

  var Admin = {
    /** GET /admin  → { data: { key: value, … } } */
    getSettings: function () {
      return get('/admin');
    },
    /**
     * POST /admin  { key: value, … }
     * Note: backend route is POST (not PUT) for settings updates.
     */
    updateSettings: function (data) {
      return post('/admin', data);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
     LOAD APP DATA
     Fetches everything needed to bootstrap the in-memory App.data object
     that script.js reads.  Call once after DOMContentLoaded.
  ══════════════════════════════════════════════════════════════════════════ */

  function loadAppData() {
    var App = global.App;
    if (!App) {
      console.error('[api] window.App not found — ensure script.js loads before api.js');
      return Promise.resolve();
    }

    return Promise.all([
      Classes.getAll().catch(function () { return []; }),
      Students.getAll({ limit: 2000 }).catch(function () { return []; }),
      Staff.getAll().catch(function () { return []; }),
      Subjects.getAll().catch(function () { return []; }),
      Fixtures.getAll().catch(function () { return []; }),
      Notices.getAll().catch(function () { return []; }),
    ]).then(function (results) {
      var classes  = normalizeList(results[0]);
      var students = normalizeList(results[1]);
      var staff    = normalizeList(results[2]);
      var subjects = normalizeList(results[3]);
      var fixtures = normalizeList(results[4]);
      var notices  = normalizeList(results[5]);

      if (classes.length)  App.data.classes  = classes;
      if (students.length) App.data.students = students;
      if (staff.length)  { App.data.teachers = staff; App.data.staff = staff; }
      if (subjects.length) App.data.subjects = subjects;
      if (fixtures.length) App.data.fixtures = fixtures;
      if (notices.length)  App.data.notices  = notices;

      return Admin.getSettings().then(function (res) {
        var d = res && res.data;
        if (d && App.data.schoolInfo) {
          if (d.school_name) App.data.schoolInfo.name      = d.school_name;
          if (d.session)     App.data.schoolInfo.session   = d.session;
          if (d.term)        App.data.schoolInfo.term      = d.term;
          if (d.principal)   App.data.schoolInfo.principal = d.principal;
        }
      }).catch(function () {}).then(function () {
        console.info('[api] loadAppData done — classes:' + (App.data.classes  || []).length +
          ' students:' + (App.data.students || []).length +
          ' staff:' + (App.data.teachers || []).length +
          ' subjects:' + (App.data.subjects || []).length);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     persistence_patch.js COMPATIBILITY SHIMS
     These window.apiSave* / window.apiDelete* names are called directly
     by persistence_patch.js.  They all delegate to the named modules above.
  ══════════════════════════════════════════════════════════════════════════ */

  // ── Classes ──────────────────────────────────────────────────────────────

  global.apiSaveClass = function (data, isEdit) {
    var p;
    if (isEdit) {
      var key = encodeURIComponent(data.id || data.name);
      p = put('/classes/' + key, { name: data.name, level: data.level });
      if (Array.isArray(data.arms) && data.arms.length) {
        p = p.then(function () {
          return post('/classes/' + encodeURIComponent(data.name) + '/arms', { arms: data.arms });
        });
      }
    } else {
      p = post('/classes', { name: data.name, level: data.level, arms: data.arms || [] });
    }
    return p.catch(function (err) { uiToast('Failed to save class: ' + err.message); throw err; });
  };

  global.apiDeleteClass = function (id) {
    var App = global.App;
    var cls = App && App.data.classes && App.data.classes.find(function (c) { return c.id === id; });
    var name = (cls && cls.name) || String(id);
    return del('/classes/' + encodeURIComponent(name))
      .catch(function (err) { uiToast('Failed to delete class: ' + err.message); });
  };

  global.apiAddArm = function (classId, letters) {
    var App = global.App;
    var cls = App && App.data.classes && App.data.classes.find(function (c) { return c.id === classId; });
    var name = (cls && cls.name) || String(classId);
    return post('/classes/' + encodeURIComponent(name) + '/arms', { arms: letters })
      .catch(function (err) { uiToast('Failed to add arm: ' + err.message); });
  };

  global.apiDeleteArm = function (classId, arm) {
    var App = global.App;
    var cls = App && App.data.classes && App.data.classes.find(function (c) { return c.id === classId; });
    var name = (cls && cls.name) || String(classId);
    return del('/classes/' + encodeURIComponent(name) + '/arms/' + encodeURIComponent(arm))
      .catch(function (err) { uiToast('Failed to delete arm: ' + err.message); });
  };

  // ── Students ─────────────────────────────────────────────────────────────

  global.apiSaveStudent = function (data, id) {
    var p = id ? put('/students/' + id, data) : post('/students', data);
    return p.then(function (res) {
      return (res && res.student) ? res.student : res;
    }).catch(function (err) { uiToast('Failed to save student: ' + err.message); throw err; });
  };

  global.apiDeleteStudent = function (id) {
    return del('/students/' + id).then(function () {
      var App = global.App;
      if (App) {
        App.data.students = (App.data.students || []).filter(function (s) { return s.id !== id; });
        App.data.results  = (App.data.results  || []).filter(function (r) { return r.studentId !== id; });
      }
    }).catch(function (err) { uiToast('Failed to delete student: ' + err.message); });
  };

  global.apiTransferStudent = function (id, cls, arm) {
    return patch('/students/' + id + '/transfer', { class: cls, arm: arm })
      .then(function () {
        var App = global.App;
        var s = App && App.data.students && App.data.students.find(function (st) { return st.id === id; });
        if (s) { s.class = cls; s.arm = arm; }
      }).catch(function (err) { uiToast('Failed to transfer student: ' + err.message); });
  };

  // ── Staff ────────────────────────────────────────────────────────────────

  global.apiSaveStaff = function (data, id) {
    var p = id ? put('/staff/' + id, data) : post('/staff', data);
    return p.catch(function (err) { uiToast('Failed to save staff: ' + err.message); throw err; });
  };

  global.apiDeleteStaff = function (id) {
    return del('/staff/' + id)
      .catch(function (err) { uiToast('Failed to delete staff: ' + err.message); });
  };

  // ── Subjects ─────────────────────────────────────────────────────────────

  global.apiSaveSubject = function (data, id) {
    var p = id ? put('/subjects/' + id, data) : post('/subjects', data);
    return p.catch(function (err) { uiToast('Failed to save subject: ' + err.message); throw err; });
  };

  global.apiDeleteSubject = function (id) {
    return del('/subjects/' + id)
      .catch(function (err) { uiToast('Failed to delete subject: ' + err.message); });
  };

  // ── Fixtures ─────────────────────────────────────────────────────────────

  global.apiSaveFixture = function (data, id) {
    var p = id ? put('/fixtures/' + id, data) : post('/fixtures', data);
    return p.catch(function (err) { uiToast('Failed to save fixture: ' + err.message); throw err; });
  };

  global.apiDeleteFixture = function (id) {
    return del('/fixtures/' + id)
      .catch(function (err) { uiToast('Failed to delete fixture: ' + err.message); });
  };

  // ── Results ──────────────────────────────────────────────────────────────

  global.apiSaveResult = function (data, id) {
    var p = id ? put('/results/' + id, data) : post('/results', data);
    return p.catch(function (err) { uiToast('Failed to save result: ' + err.message); throw err; });
  };

  // ── Subject Allocations ──────────────────────────────────────────────────

  global.apiSaveSubjectAllocation = function (key, subjects) {
    var p;
    if (typeof key === 'string' && key.indexOf('_') !== -1) {
      var last = key.lastIndexOf('_');
      var cls  = key.slice(0, last);
      var arm  = key.slice(last + 1);
      p = put('/results/allocations/class/' + encodeURIComponent(cls) + '/' + encodeURIComponent(arm), { subjects: subjects });
    } else {
      p = put('/results/allocations/student/' + key, { subjects: subjects });
    }
    return p.catch(function (err) { uiToast('Failed to save allocation: ' + err.message); });
  };

  // ── Attendance domains ────────────────────────────────────────────────────

  global.apiSaveDomainAssessment = function (studentId, term, session, key, value) {
    var body = {};
    body[key] = value;
    return put('/attendance/domains/' + studentId + buildQuery({ term: term, session: session }), body)
      .catch(function (err) { console.warn('[api] domain save failed:', err.message); });
  };

  // ── Notices ──────────────────────────────────────────────────────────────

  global.apiSaveNotice = function (data) {
    return post('/notices', data)
      .catch(function (err) { uiToast('Failed to save notice: ' + err.message); throw err; });
  };

  global.apiDeleteNotice = function (id) {
    return del('/notices/' + id)
      .catch(function (err) { uiToast('Failed to delete notice: ' + err.message); });
  };

  /* ══════════════════════════════════════════════════════════════════════════
     loadAppData global shim (used by persistence_patch.js directly)
  ══════════════════════════════════════════════════════════════════════════ */

  global.loadAppData = loadAppData;

  /* ══════════════════════════════════════════════════════════════════════════
     MAIN EXPORT
     window.API  — structured namespace for all modules
     Also exported individually as window.Auth, window.Classes, etc.
  ══════════════════════════════════════════════════════════════════════════ */

  var API = {
    Auth:       Auth,
    Classes:    Classes,
    Students:   Students,
    Staff:      Staff,
    Teachers:   Teachers,
    Subjects:   Subjects,
    Results:    Results,
    Attendance: Attendance,
    Fixtures:   Fixtures,
    Notices:    Notices,
    Admin:      Admin,
    loadAppData: loadAppData,
    /* low-level helpers (useful for one-off calls in scripts) */
    _get:    get,
    _post:   post,
    _put:    put,
    _patch:  patch,
    _del:    del,
    _upload: upload,
    _query:  buildQuery,
  };

  global.API        = API;
  global.Auth       = Auth;
  global.Classes    = Classes;
  global.Students   = Students;
  global.Staff      = Staff;
  global.Teachers   = Teachers;
  global.Subjects   = Subjects;
  global.Results    = Results;
  global.Attendance = Attendance;
  global.Fixtures   = Fixtures;
  global.Notices    = Notices;
  global.Admin      = Admin;

  console.info('[api] window.API and all sub-namespaces registered.');

}(window));