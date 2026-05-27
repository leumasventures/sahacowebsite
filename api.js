/**
 * api.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Single unified API client. Plain <script> tag — NO type="module".
 * Exposes window.API and individual window.Auth, window.Classes, etc.
 */
(function (global) {
  'use strict';

  var BASE_URL        = (global.__ENV__ && global.__ENV__.API_URL) ? global.__ENV__.API_URL : 'https://rms-bckend.onrender.com/api';
  var DEFAULT_TIMEOUT = 15000;
  var EXPORT_TIMEOUT  = 60000;

  function request(method, path, body, isFormData, timeoutMs) {
    var timeout    = timeoutMs || DEFAULT_TIMEOUT;
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer      = controller ? setTimeout(function () { controller.abort(); }, timeout) : null;
    var options    = { method: method, credentials: 'include', headers: {} };
    if (controller) options.signal = controller.signal;
    var token = sessionStorage.getItem('shc_token');
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    if (body !== null && body !== undefined) {
      if (isFormData) { options.body = body; }
      else { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    }
    return fetch(BASE_URL + path, options).then(function (res) {
      if (timer) clearTimeout(timer);
      if (res.status === 204) return null;
      return res.json().catch(function () { return { message: res.statusText }; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.message || ('API error ' + res.status));
          err.status = res.status; err.code = data.code || null; err.errors = data.errors || null; err.data = data;
          throw err;
        }
        return data;
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err.name === 'AbortError') { var t = new Error('Request timed out: ' + method + ' ' + path); t.status = 408; throw t; }
      throw err;
    });
  }

  var get    = function (path, ms)       { return request('GET',    path, null, false, ms); };
  var post   = function (path, body)     { return request('POST',   path, body, false); };
  var put    = function (path, body)     { return request('PUT',    path, body, false); };
  var patch  = function (path, body)     { return request('PATCH',  path, body, false); };
  var del    = function (path)           { return request('DELETE', path, null, false); };
  var upload = function (path, form, ms) { return request('POST',   path, form, true,  ms || DEFAULT_TIMEOUT); };

  function buildQuery(params) {
    var pairs = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v !== null && v !== undefined && v !== '') pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
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
    if (typeof global.toast === 'function') global.toast(msg, type || 'error');
    else console.warn('[api]', type || 'error', msg);
  }

  /* ── AUTH ── */
  var Auth = {
    login:          function (email, password, role) { return post('/auth/login', { email: email, password: password, role: role }); },
    logout:         function () { return post('/auth/logout'); },
    me:             function () { return get('/auth/me'); },
    refresh:        function () { return post('/auth/refresh'); },
    changePassword: function (cur, nw) { return post('/auth/change-password', { currentPassword: cur, newPassword: nw }); },
    forgotPassword: function (email) { return post('/auth/forgot-password', { email: email }); },
    resetPassword:  function (token, nw) { return post('/auth/reset-password', { token: token, newPassword: nw }); },
    signupRequest:  function (type, data) { return post('/auth/signup-request', { type: type, data: data }); },
  };

  /* ── CLASSES ── */
  var Classes = {
    getAll:        function (p) { return get('/classes' + buildQuery(p)); },
    getByName:     function (n) { return get('/classes/' + encodeURIComponent(n)); },
    getById:       function (n) { return get('/classes/' + encodeURIComponent(n)); },
    create:        function (d) { return post('/classes', d); },
    update:        function (n, d) { return put('/classes/' + encodeURIComponent(n), d); },
    delete:        function (n) { return del('/classes/' + encodeURIComponent(n)); },
    getStudents:   function (n, p) { return get('/classes/' + encodeURIComponent(n) + '/students' + buildQuery(p)); },
    getSummary:    function (n, p) { return get('/classes/' + encodeURIComponent(n) + '/summary' + buildQuery(p)); },
    assignTeacher: function (n, d) { return patch('/classes/' + encodeURIComponent(n) + '/assign-teacher', d); },
    getArms:       function (n) { return get('/classes/' + encodeURIComponent(n) + '/arms'); },
    addArm:        function (n, d) { return post('/classes/' + encodeURIComponent(n) + '/arms', d); },
    renameArm:     function (n, a, d) { return patch('/classes/' + encodeURIComponent(n) + '/arms/' + encodeURIComponent(a), d); },
    deleteArm:     function (n, a) { return del('/classes/' + encodeURIComponent(n) + '/arms/' + encodeURIComponent(a)); },
  };

  /* ── STUDENTS ── */
  var Students = {
    getAll:           function (p) { return get('/students' + buildQuery(p)); },
    getById:          function (id) { return get('/students/' + id); },
    create:           function (d) { return post('/students', d); },
    bulkCreate:       function (d) { return post('/students/bulk', d); },
    update:           function (id, d) { return put('/students/' + id, d); },
    setStatus:        function (id, s) { return patch('/students/' + id + '/status', { status: s }); },
    delete:           function (id) { return del('/students/' + id); },
    getResults:       function (id, p) { return get('/students/' + id + '/results' + buildQuery(p)); },
    getAttendance:    function (id, p) { return get('/students/' + id + '/attendance' + buildQuery(p)); },
    getReportCard:    function (id, p) { return get('/students/' + id + '/report-card' + buildQuery(p)); },
    getSummary:       function (id, p) { return get('/students/' + id + '/summary' + buildQuery(p)); },
    transfer:         function (id, d) { return patch('/students/' + id + '/transfer', d); },
    updateAttendance: function (id, v) { return patch('/students/' + id + '/attendance', { attendance: v }); },
    export:           function (p) { return get('/students/export' + buildQuery(p), EXPORT_TIMEOUT); },
  };

  /* ── STAFF / TEACHERS ── */
  var Staff = {
    getAll:            function (p) { return get('/staff' + buildQuery(p)); },
    getById:           function (id) { return get('/staff/' + id); },
    create:            function (d) { return post('/staff', d); },
    update:            function (id, d) { return put('/staff/' + id, d); },
    setStatus:         function (id, s) { return patch('/staff/' + id + '/status', { status: s }); },
    assignClass:       function (id, d) { return patch('/staff/' + id + '/assign-class', d); },
    assignSubject:     function (id, d) { return patch('/staff/' + id + '/assign-subject', d); },
    getStudents:       function (id) { return get('/staff/' + id + '/students'); },
    uploadCredential:  function (id, d) { return post('/staff/' + id + '/credentials', d); },
    deleteCredential:  function (id, i) { return del('/staff/' + id + '/credentials/' + i); },
    delete:            function (id) { return del('/staff/' + id); },
    export:            function (p) { return get('/staff/export' + buildQuery(p), EXPORT_TIMEOUT); },
  };
  var Teachers = Staff;

  /* ── SUBJECTS ── */
  var Subjects = {
    getAll:  function (p) { return get('/subjects' + buildQuery(p)); },
    getById: function (id) { return get('/subjects/' + id); },
    create:  function (d) { return post('/subjects', d); },
    update:  function (id, d) { return put('/subjects/' + id, d); },
    delete:  function (id) { return del('/subjects/' + id); },
  };

  /* ── RESULTS ── */
  var Results = {
    getAll:                  function (p) { return get('/results' + buildQuery(p)); },
    getById:                 function (id) { return get('/results/' + id); },
    create:                  function (d) { return post('/results', d); },
    update:                  function (id, d) { return put('/results/' + id, d); },
    delete:                  function (id) { return del('/results/' + id); },
    bulkCreate:              function (d) { return post('/results/bulk', d); },
    getStats:                function (p) { return get('/results/stats' + buildQuery(p)); },
    getReportCard:           function (id, t, s) { return get('/results/report-card/' + id + buildQuery({ term: t, session: s })); },
    getClassAllocation:      function (c, a) { return get('/results/allocations/class/' + encodeURIComponent(c) + '/' + encodeURIComponent(a)); },
    setClassAllocation:      function (c, a, subs) { return put('/results/allocations/class/' + encodeURIComponent(c) + '/' + encodeURIComponent(a), { subjects: subs }); },
    clearClassAllocation:    function (c, a) { return del('/results/allocations/class/' + encodeURIComponent(c) + '/' + encodeURIComponent(a)); },
    getStudentAllocation:    function (id) { return get('/results/allocations/student/' + id); },
    setStudentAllocation:    function (id, subs) { return put('/results/allocations/student/' + id, { subjects: subs }); },
    bulkSetStudentAllocations: function (d) { return post('/results/allocations/bulk-student', d); },
  };

  /* ── ATTENDANCE ── */
  var Attendance = {
    getAll:           function (p) { return get('/attendance' + buildQuery(p)); },
    mark:             function (d) { return post('/attendance', d); },
    bulkMark:         function (d) { return post('/attendance/bulk', d); },
    update:           function (id, d) { return put('/attendance/' + id, d); },
    getSummary:       function (id, t, s) { return get('/attendance/summary/' + id + buildQuery({ term: t, session: s })); },
    getClassSummary:  function (p) { return get('/attendance/class-summary' + buildQuery(p)); },
    getClassDomains:  function (p) { return get('/attendance/domains' + buildQuery(p)); },
    setStudentDomains:function (id, t, s, d) { return put('/attendance/domains/' + id + buildQuery({ term: t, session: s }), d); },
    getSchoolDays:    function (t) { return get('/attendance/school-days/' + encodeURIComponent(t)); },
    export:           function (p) { return get('/attendance/export' + buildQuery(p), EXPORT_TIMEOUT); },
  };

  /* ── FIXTURES ── */
  var Fixtures = {
    getAll:  function (p) { return get('/fixtures' + buildQuery(p)); },
    getById: function (id) { return get('/fixtures/' + id); },
    create:  function (d) { return post('/fixtures', d); },
    update:  function (id, d) { return put('/fixtures/' + id, d); },
    delete:  function (id) { return del('/fixtures/' + id); },
    remove:  function (id) { return del('/fixtures/' + id); },
  };

  /* ── NOTICES ── */
  var Notices = {
    getAll:  function (p) { return get('/notices' + buildQuery(p)); },
    create:  function (d) { return post('/notices', d); },
    delete:  function (id) { return del('/notices/' + id); },
  };

  /* ── FEES ── */
  var Fees = {
    getAll:              function (p) { return get('/fees' + buildQuery(p)); },
    getOne:              function (id) { return get('/fees/' + id); },
    create:              function (d) { return post('/fees', d); },
    update:              function (id, d) { return put('/fees/' + id, d); },
    updateStatus:        function (id, s) { return patch('/fees/' + id + '/status', { status: s }); },
    remove:              function (id) { return del('/fees/' + id); },
    bulkCharge:          function (d) { return post('/fees/bulk-charge', d); },
    getSummary:          function (p) { return get('/fees/summary' + buildQuery(p)); },
    getByStudent:        function (id, p) { return get('/fees/student/' + id + buildQuery(p)); },
    getStructure:        function (p) { return get('/fees/structure' + buildQuery(p)); },
    getStructureForClass:function (p) { return get('/fees/structure/for-class' + buildQuery(p)); },
    addStructureItem:    function (d) { return post('/fees/structure', d); },
    assignFeeToClass:    function (d) { return post('/fees/structure/assign-class', d); },
    assignFeeToLevel:    function (d) { return post('/fees/structure/assign-level', d); },
    updateStructureItem: function (id, d) { return put('/fees/structure/' + id, d); },
    deleteStructureItem: function (id) { return del('/fees/structure/' + id); },
    getLedger:           function (id, p) { return get('/fees/ledger/' + id + buildQuery(p)); },
    getLedgerSummary:    function (p) { return get('/fees/ledger-summary' + buildQuery(p)); },
    addAdjustment:       function (d) { return post('/fees/ledger/adjustment', d); },
  };

  /* ── LEVIES ── */
  var Levies = {
    getAll:           function (p) { return get('/levies' + buildQuery(p)); },
    getOne:           function (id) { return get('/levies/' + id); },
    create:           function (d) { return post('/levies', d); },
    update:           function (id, d) { return put('/levies/' + id, d); },
    remove:           function (id) { return del('/levies/' + id); },
    charge:           function (id) { return post('/levies/' + id + '/charge', {}); },
    getPayments:      function (id) { return get('/levies/' + id + '/payments'); },
    updatePayment:    function (pmtId, d) { return patch('/levies/payments/' + pmtId, d); },
    getStudentLevies: function (id) { return get('/levies/student/' + id); },
  };

  /* ── TIMETABLE ── */
  var Timetable = {
    get:        function (c, a) { return get('/timetable' + buildQuery({ class: c, arm: a })); },
    save:       function (d) { return put('/timetable', d); },
    updateCell: function (d) { return patch('/timetable/cell', d); },
    clear:      function (c, a) { return del('/timetable' + buildQuery({ class: c, arm: a })); },
    getAll:     function () { return get('/timetable/all'); },
  };

  /* ── ACCESS TOKENS ── */
  var AccessTokens = {
    getAll:       function (p) { return get('/access-tokens' + buildQuery(p)); },
    getByStudent: function (id) { return get('/access-tokens/student/' + id); },
    getClassList: function (p) { return get('/access-tokens/class-list' + buildQuery(p)); },
    generate:     function (d) { return post('/access-tokens', d); },
    bulkGenerate: function (d) { return post('/access-tokens/bulk', d); },
    revoke:       function (code) { return patch('/access-tokens/' + encodeURIComponent(code) + '/revoke', {}); },
    remove:       function (code) { return del('/access-tokens/' + encodeURIComponent(code)); },
    exportCSV:    function (p) { return get('/access-tokens/export/csv' + buildQuery(p)); },
  };

  /* ── ARCHIVE ── */
  var Archive = {
    getStats:       function () { return get('/archive/stats'); },
    getStudents:    function (p) { return get('/archive/students' + buildQuery(p)); },
    getOneStudent:  function (id) { return get('/archive/students/' + id); },
    archiveStudent: function (id, d) { return post('/archive/students/' + id, d); },
    restoreStudent: function (id) { return del('/archive/students/' + id + '/restore'); },
    getStaff:       function (p) { return get('/archive/staff' + buildQuery(p)); },
    getOneStaff:    function (id) { return get('/archive/staff/' + id); },
    archiveStaff:   function (id, d) { return post('/archive/staff/' + id, d); },
    restoreStaff:   function (id) { return del('/archive/staff/' + id + '/restore'); },
  };

  /* ── ADMIN / SETTINGS ── */
  var Admin = {
    getSettings:    function () { return get('/admin'); },
    updateSettings: function (d) { return post('/admin', d); },
  };

  /* ── LOAD APP DATA ── */
  function loadAppData() {
    var App = global.App;
    if (!App) { console.error('[api] window.App not found'); return Promise.resolve(); }
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
      if (staff.length)    { App.data.teachers = staff; App.data.staff = staff; }
      if (subjects.length) App.data.subjects = subjects;
      if (fixtures.length) App.data.fixtures = fixtures;
      if (notices.length)  App.data.notices  = notices;
      return Admin.getSettings().then(function (res) {
        var d = res && res.data;
        if (d && App.data.schoolInfo) {
          if (d.school_name)     App.data.schoolInfo.name      = d.school_name;
          if (d.current_session) App.data.schoolInfo.session   = d.current_session;
          if (d.current_term)    App.data.schoolInfo.term      = d.current_term;
          if (d.principal_name)  App.data.schoolInfo.principal = d.principal_name;
          if (d.school_address)  App.data.schoolInfo.address   = d.school_address;
          if (d.school_phone)    App.data.schoolInfo.phone     = d.school_phone;
          if (d.school_email)    App.data.schoolInfo.email     = d.school_email;
          if (d.school_logo)     App.data.schoolInfo.logo      = d.school_logo;
          if (d.school_motto)    App.data.schoolInfo.motto     = d.school_motto;
          if (d.school_website)  App.data.schoolInfo.website   = d.school_website;
          if (d.resumption_date) App.data.schoolInfo.resumptionDate = d.resumption_date;
          if (d.announcements)   App.data.schoolInfo.announcements  = d.announcements;
        }
        // Hydrate all structured settings from flat key-value store
        if (typeof window.loadSettingsFromBackend === 'function' && d) {
          window.loadSettingsFromBackend(d);
        }
        // Also use pre-parsed structured objects if backend returned them
        if (d._gradingScale   && Array.isArray(d._gradingScale))   App.data.gradingScale   = d._gradingScale;
        if (d._scoreBreakdown && typeof d._scoreBreakdown==='object') App.data.scoreBreakdown = d._scoreBreakdown;
        if (d._domainLabels   && typeof d._domainLabels==='object')   App.data.domainLabels   = d._domainLabels;
      }).catch(function () {}).then(function () {
        console.info('[api] loadAppData done — classes:' + (App.data.classes||[]).length +
          ' students:' + (App.data.students||[]).length +
          ' staff:' + (App.data.teachers||[]).length +
          ' subjects:' + (App.data.subjects||[]).length);
      });
    });
  }

  /* ── persistence_patch.js SHIMS ── */
  global.apiSaveClass    = function (d, isEdit) {
    var p = isEdit ? put('/classes/' + encodeURIComponent(d.name||d.id), { name: d.name, level: d.level }) : post('/classes', { name: d.name, level: d.level, arms: d.arms||[] });
    if (isEdit && Array.isArray(d.arms) && d.arms.length) p = p.then(function () { return post('/classes/' + encodeURIComponent(d.name) + '/arms', { arms: d.arms }); });
    return p.catch(function (e) { uiToast('Failed to save class: ' + e.message); throw e; });
  };
  global.apiDeleteClass   = function (id) { var App=global.App; var cls=App&&App.data.classes&&App.data.classes.find(function(c){return c.id===id;}); return del('/classes/' + encodeURIComponent((cls&&cls.name)||String(id))).catch(function(e){uiToast('Failed to delete class: '+e.message);}); };
  global.apiAddArm        = function (classId, letters) { var App=global.App; var cls=App&&App.data.classes&&App.data.classes.find(function(c){return c.id===classId;}); return post('/classes/'+encodeURIComponent((cls&&cls.name)||String(classId))+'/arms',{arms:letters}).catch(function(e){uiToast('Failed to add arm: '+e.message);}); };
  global.apiDeleteArm     = function (classId, arm) { var App=global.App; var cls=App&&App.data.classes&&App.data.classes.find(function(c){return c.id===classId;}); return del('/classes/'+encodeURIComponent((cls&&cls.name)||String(classId))+'/arms/'+encodeURIComponent(arm)).catch(function(e){uiToast('Failed to delete arm: '+e.message);}); };
  global.apiSaveStudent   = function (d, id) { return (id?put('/students/'+id,d):post('/students',d)).then(function(r){return(r&&r.student)?r.student:r;}).catch(function(e){uiToast('Failed to save student: '+e.message);throw e;}); };
  global.apiDeleteStudent = function (id) { return del('/students/'+id).then(function(){var App=global.App;if(App){App.data.students=(App.data.students||[]).filter(function(s){return s.id!==id;});App.data.results=(App.data.results||[]).filter(function(r){return r.studentId!==id;});}}).catch(function(e){uiToast('Failed to delete student: '+e.message);}); };
  global.apiTransferStudent = function (id, cls, arm) { return patch('/students/'+id+'/transfer',{class:cls,arm:arm}).then(function(){var App=global.App;var s=App&&App.data.students&&App.data.students.find(function(st){return st.id===id;});if(s){s.class=cls;s.arm=arm;}}).catch(function(e){uiToast('Failed to transfer student: '+e.message);}); };
  global.apiSaveStaff     = function (d, id) { return (id?put('/staff/'+id,d):post('/staff',d)).catch(function(e){uiToast('Failed to save staff: '+e.message);throw e;}); };
  global.apiDeleteStaff   = function (id) { return del('/staff/'+id).catch(function(e){uiToast('Failed to delete staff: '+e.message);}); };
  global.apiSaveSubject   = function (d, id) { return (id?put('/subjects/'+id,d):post('/subjects',d)).catch(function(e){uiToast('Failed to save subject: '+e.message);throw e;}); };
  global.apiDeleteSubject = function (id) { return del('/subjects/'+id).catch(function(e){uiToast('Failed to delete subject: '+e.message);}); };
  global.apiSaveFixture   = function (d, id) { return (id?put('/fixtures/'+id,d):post('/fixtures',d)).catch(function(e){uiToast('Failed to save fixture: '+e.message);throw e;}); };
  global.apiDeleteFixture = function (id) { return del('/fixtures/'+id).catch(function(e){uiToast('Failed to delete fixture: '+e.message);}); };
  global.apiSaveResult    = function (d, id) { return (id?put('/results/'+id,d):post('/results',d)).catch(function(e){uiToast('Failed to save result: '+e.message);throw e;}); };
  global.apiSaveSubjectAllocation = function (key, subjects) {
    var p;
    if (typeof key==='string'&&key.indexOf('_')!==-1) { var last=key.lastIndexOf('_'); var c=key.slice(0,last); var a=key.slice(last+1); p=put('/results/allocations/class/'+encodeURIComponent(c)+'/'+encodeURIComponent(a),{subjects:subjects}); }
    else { p=put('/results/allocations/student/'+key,{subjects:subjects}); }
    return p.catch(function(e){uiToast('Failed to save allocation: '+e.message);});
  };
  global.apiSaveDomainAssessment = function (studentId, term, session, key, value) { var body={}; body[key]=value; return put('/attendance/domains/'+studentId+buildQuery({term:term,session:session}),body).catch(function(e){console.warn('[api] domain save failed:',e.message);}); };
  global.apiSaveNotice   = function (d) { return post('/notices',d).catch(function(e){uiToast('Failed to save notice: '+e.message);throw e;}); };
  global.apiDeleteNotice = function (id) { return del('/notices/'+id).catch(function(e){uiToast('Failed to delete notice: '+e.message);}); };
  global.loadAppData     = loadAppData;

  /* ── EXPORTS ── */
  var API = { Auth:Auth, Classes:Classes, Students:Students, Staff:Staff, Teachers:Teachers, Subjects:Subjects, Results:Results, Attendance:Attendance, Fixtures:Fixtures, Notices:Notices, Admin:Admin, loadAppData:loadAppData, _get:get, _post:post, _put:put, _patch:patch, _del:del, _upload:upload, _query:buildQuery };

  global.API          = API;
  global.Auth         = Auth;
  global.Classes      = Classes;
  global.Students     = Students;
  global.Staff        = Staff;
  global.Teachers     = Teachers;
  global.Subjects     = Subjects;
  global.Results      = Results;
  global.Attendance   = Attendance;
  global.Fixtures     = Fixtures;
  global.Notices      = Notices;
  global.Admin        = Admin;
  global.Fees         = Fees;
  global.Timetable    = Timetable;
  global.AccessTokens = AccessTokens;
  global.Levies       = Levies;
  global.Archive      = Archive;

  console.info('[api] window.API and all sub-namespaces registered.');
}(window));