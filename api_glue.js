/**
 * api-glue.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * ─────────────────────────────────────────────────────────────────────────────
 * PLAIN SCRIPT (no type="module", no import statements).
 *
 * Why this file exists:
 *   api.js is type="module" — its exports never reach window.*.
 *   persistence_patch.js calls window.apiSaveClass, window.apiSaveStudent, etc.
 *   Those functions were NEVER defined → every typeof check returned false →
 *   all mutations stayed in-memory → wiped on every refresh.
 *   loadAppData was also never defined → App.data was never loaded from the DB.
 *
 * Load order in dashboard.html (load BEFORE script.js and persistence_patch.js):
 *   <script src="auth-bridge.js"></script>
 *   <script src="api-glue.js"></script>        ← this file (plain, no module attr)
 *   <script src="script.js"></script>
 *   <script src="persistence_patch.js"></script>
 *   <script src="script2.js"></script>
 *   <script src="script3.js"></script>
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var BASE = (window.__ENV__ && window.__ENV__.API_URL)
    ? window.__ENV__.API_URL
    : 'https://rms-bckend.onrender.com/api';

  // ── Core fetch helpers ────────────────────────────────────────────────────

  function req(method, path, body) {
    var opts = {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.message || ('HTTP ' + r.status));
        return data;
      });
    });
  }

  var get  = function (p)    { return req('GET',    p); };
  var post = function (p, b) { return req('POST',   p, b); };
  var put  = function (p, b) { return req('PUT',    p, b); };
  var del  = function (p)    { return req('DELETE', p); };

  function qs(params) {
    var pairs = [];
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    });
    return pairs.length ? '?' + pairs.join('&') : '';
  }

  function normalizeList(res) {
    if (Array.isArray(res)) return res;
    var keys = ['data','students','staff','classes','subjects','results','fixtures','notices'];
    for (var i = 0; i < keys.length; i++) {
      if (res && Array.isArray(res[keys[i]])) return res[keys[i]];
    }
    return [];
  }

  function uiToast(msg, type) {
    if (typeof window.toast === 'function') window.toast(msg, type || 'error');
    else console.warn('[api-glue]', type || 'error', msg);
  }

  // ── loadAppData ───────────────────────────────────────────────────────────

  window.loadAppData = function loadAppData() {
    var App = window.App;
    if (!App) {
      console.error('[api-glue] window.App not found — ensure script.js loads before api-glue.js');
      return Promise.resolve();
    }

    return Promise.all([
      get('/classes').catch(function () { return []; }),
      get('/students' + qs({ limit: 2000 })).catch(function () { return []; }),
      get('/staff').catch(function () { return []; }),
      get('/subjects').catch(function () { return []; }),
      get('/fixtures').catch(function () { return []; }),
      get('/notices').catch(function () { return []; }),
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

      return get('/admin').then(function (res) {
        var d = res && res.data;
        if (d && App.data.schoolInfo) {
          if (d.school_name) App.data.schoolInfo.name      = d.school_name;
          if (d.session)     App.data.schoolInfo.session   = d.session;
          if (d.term)        App.data.schoolInfo.term      = d.term;
          if (d.principal)   App.data.schoolInfo.principal = d.principal;
        }
      }).catch(function () {}).then(function () {
        console.info('[api-glue] loadAppData done — classes:' + (App.data.classes||[]).length +
          ' students:' + (App.data.students||[]).length +
          ' staff:' + (App.data.teachers||[]).length +
          ' subjects:' + (App.data.subjects||[]).length);
      });
    });
  };

  // ── CLASSES ───────────────────────────────────────────────────────────────

  window.apiSaveClass = function (data, isEdit) {
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

  window.apiDeleteClass = function (id) {
    var App = window.App;
    var cls = App && App.data.classes && App.data.classes.find(function (c) { return c.id === id; });
    var name = (cls && cls.name) || String(id);
    return del('/classes/' + encodeURIComponent(name))
      .catch(function (err) { uiToast('Failed to delete class: ' + err.message); });
  };

  window.apiAddArm = function (classId, letters) {
    var App = window.App;
    var cls = App && App.data.classes && App.data.classes.find(function (c) { return c.id === classId; });
    var name = (cls && cls.name) || String(classId);
    return post('/classes/' + encodeURIComponent(name) + '/arms', { arms: letters })
      .catch(function (err) { uiToast('Failed to add arm: ' + err.message); });
  };

  window.apiDeleteArm = function (classId, arm) {
    var App = window.App;
    var cls = App && App.data.classes && App.data.classes.find(function (c) { return c.id === classId; });
    var name = (cls && cls.name) || String(classId);
    return del('/classes/' + encodeURIComponent(name) + '/arms/' + encodeURIComponent(arm))
      .catch(function (err) { uiToast('Failed to delete arm: ' + err.message); });
  };

  // ── STUDENTS ──────────────────────────────────────────────────────────────

  window.apiSaveStudent = function (data, id) {
    var p = id ? put('/students/' + id, data) : post('/students', data);
    return p.then(function (res) {
      return (res && res.student) ? res.student : res;
    }).catch(function (err) { uiToast('Failed to save student: ' + err.message); throw err; });
  };

  window.apiDeleteStudent = function (id) {
    return del('/students/' + id).then(function () {
      var App = window.App;
      if (App) {
        App.data.students = (App.data.students || []).filter(function (s) { return s.id !== id; });
        App.data.results  = (App.data.results  || []).filter(function (r) { return r.studentId !== id; });
      }
    }).catch(function (err) { uiToast('Failed to delete student: ' + err.message); });
  };

  window.apiTransferStudent = function (id, cls, arm) {
    return req('PATCH', '/students/' + id + '/transfer', { class: cls, arm: arm })
      .then(function () {
        var App = window.App;
        var s = App && App.data.students && App.data.students.find(function (st) { return st.id === id; });
        if (s) { s.class = cls; s.arm = arm; }
      }).catch(function (err) { uiToast('Failed to transfer student: ' + err.message); });
  };

  // ── STAFF ─────────────────────────────────────────────────────────────────

  window.apiSaveStaff = function (data, id) {
    var p = id ? put('/staff/' + id, data) : post('/staff', data);
    return p.catch(function (err) { uiToast('Failed to save staff: ' + err.message); throw err; });
  };

  window.apiDeleteStaff = function (id) {
    return del('/staff/' + id)
      .catch(function (err) { uiToast('Failed to delete staff: ' + err.message); });
  };

  // ── SUBJECTS ──────────────────────────────────────────────────────────────

  window.apiSaveSubject = function (data, id) {
    var p = id ? put('/subjects/' + id, data) : post('/subjects', data);
    return p.catch(function (err) { uiToast('Failed to save subject: ' + err.message); throw err; });
  };

  window.apiDeleteSubject = function (id) {
    return del('/subjects/' + id)
      .catch(function (err) { uiToast('Failed to delete subject: ' + err.message); });
  };

  // ── FIXTURES ──────────────────────────────────────────────────────────────

  window.apiSaveFixture = function (data, id) {
    var p = id ? put('/fixtures/' + id, data) : post('/fixtures', data);
    return p.catch(function (err) { uiToast('Failed to save fixture: ' + err.message); throw err; });
  };

  window.apiDeleteFixture = function (id) {
    return del('/fixtures/' + id)
      .catch(function (err) { uiToast('Failed to delete fixture: ' + err.message); });
  };

  // ── RESULTS ───────────────────────────────────────────────────────────────

  window.apiSaveResult = function (data, id) {
    var p = id ? put('/results/' + id, data) : post('/results', data);
    return p.catch(function (err) { uiToast('Failed to save result: ' + err.message); throw err; });
  };

  // ── SUBJECT ALLOCATIONS ───────────────────────────────────────────────────

  window.apiSaveSubjectAllocation = function (key, subjects) {
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

  // ── ATTENDANCE DOMAINS ────────────────────────────────────────────────────

  window.apiSaveDomainAssessment = function (studentId, term, session, key, value) {
    var body = {};
    body[key] = value;
    return req('PUT', '/attendance/domains/' + studentId + qs({ term: term, session: session }), body)
      .catch(function (err) { console.warn('[api-glue] domain save failed:', err.message); });
  };

  // ── NOTICES ───────────────────────────────────────────────────────────────

  window.apiSaveNotice = function (data) {
    return post('/notices', data)
      .catch(function (err) { uiToast('Failed to save notice: ' + err.message); throw err; });
  };

  window.apiDeleteNotice = function (id) {
    return del('/notices/' + id)
      .catch(function (err) { uiToast('Failed to delete notice: ' + err.message); });
  };

  console.info('[api-glue] All window.apiSave*/apiDelete*/loadAppData helpers registered.');

}());