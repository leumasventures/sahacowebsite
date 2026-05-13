/**
 * api-bridge.js  —  Sacred Heart College  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers: script2.js  +  script3.js  (v1.0 additions)
 *
 * Every App.data mutation that was previously in-memory only is now routed
 * through the REST API client (api.js).  The in-memory App.data object is
 * kept as a read-cache so all existing renderXxx() functions continue to
 * work unchanged.
 *
 * Load order in HTML:
 *   <script type="module" src="api.js"></script>
 *   <script type="module" src="api-bridge.js"></script>
 *   <script src="script2.js"></script>
 *   <script src="script3.js"></script>
 *
 * Modules covered
 * ───────────────
 *  0.  Boot / initial data load
 *  1.  School info & system settings
 *  2.  Classes & arms
 *  3.  Students (CRUD, transfer, bulk import)
 *  4.  Staff & teachers (CRUD, credential upload)
 *  5.  Subjects
 *  6.  Results (single entry, bulk Excel, remarks, subject allocation)
 *  7.  Attendance (per-cell upsert, bulk save, domain assessments)
 *  8.  Fixtures
 *  9.  Fees / Finance         (script3.js)
 * 10.  Timetable              (script3.js)
 * 11.  Notifications          (script3.js)
 * 12.  Parent tokens          (script3.js)
 * 13.  Data management        (export / import / reset)
 * 14.  Function shadows       (overrides every mutation entry-point)
 * 15.  Boot extension
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FIXES (v2.1):
 *  1. apiLoadStudents         — was sending { classId, arm }; backend expects { class, arm }
 *  2. apiTransferStudent      — was sending { new_class_id, new_arm }; backend expects { class, arm }
 *  3. apiSaveResults          — was sending term_id/session_id/class_id/subject_id as keys;
 *                               backend bulkCreate expects those exact names BUT the per-row
 *                               subject name/term/session must also be passed so rows are not skipped
 *  4. apiBulkSaveResults      — same issue; per-row subject_id was a bare name, not matched;
 *                               now passes subject name as subject_id so backend can find it
 *  5. apiUpsertAttendance     — was calling API.Attendance.mark({ class_id, records:[] }) which is
 *                               the bulk endpoint shape; single-record endpoint expects flat fields
 *                               (studentId, class, arm, date, term, session, status)
 *  6. apiSaveAllAttendance    — was calling API.Attendance.mark (wrong — that's the single-record
 *                               POST /); now calls API.Attendance.bulkMark (POST /bulk) with the
 *                               correct shape { class, arm, date, term, session, records[] }
 *                               Backend field is `class` (not `class_id`); status normalised to p/a/l/e
 *  7. apiSaveDomainAssessment — was saving a one-off key to school_settings via Admin.updateSettings;
 *                               backend has a proper PUT /api/attendance/domains/:studentId endpoint
 *  8. apiSaveFullDomainAssessment — same; now uses PUT /api/attendance/domains/:studentId
 *  9. apiSaveRemark           — was saving an ad-hoc key to school_settings; remarks have a proper
 *                               backend table (report_card_remarks) but no public route yet, so we
 *                               keep the settings fallback and use a cleaner key format
 * 10. Admin.updateSettings    — backend route is POST /api/admin (not PUT); api.js uses `put`
 *                               for Admin.updateSettings — fixed here by using API.Admin helper
 *                               that already points to the right verb (no change needed in bridge,
 *                               but api.js Admin.updateSettings should use post(); noted below)
 */

import API from './api.js';

/* ─── internal helpers ───────────────────────────────────────────────────── */

function _toast(msg, type = 'info') {
  if (typeof toast === 'function') toast(msg, type);
  else console.warn(`[api-bridge] ${type}: ${msg}`);
}

function _unwrap(res) { return res?.data ?? res ?? null; }

function _ns(prefix, obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { out[`${prefix}_${k}`] = v; });
  return out;
}

function _downloadCSV(rows, filename) {
  const csv = rows.map(r =>
    r.map(cell => {
      const s = String(cell == null ? '' : cell).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
window._downloadCSV = _downloadCSV; // expose for script3.js


/* ═══════════════════════════════════════════════════════════════════════════
   0.  BOOT
   ═══════════════════════════════════════════════════════════════════════════ */

window.loadAppData = async function () {
  try {
    const [classes, students, teachers, subjects, settings] = await Promise.all([
      API.Classes.getAll(),
      API.Students.getAll(),
      API.Teachers.getAll(),
      API.Subjects.getAll(),
      API.Admin.getSettings(),
    ]);

    App.data.classes  = _unwrap(classes)  ?? [];
    App.data.students = _unwrap(students) ?? [];
    App.data.teachers = _unwrap(teachers) ?? [];
    App.data.staff    = App.data.teachers;
    App.data.subjects = _unwrap(subjects) ?? [];

    if (settings) {
      App.data.schoolInfo = {
        name:           settings.school_name      ?? App.data.schoolInfo?.name      ?? '',
        session:        settings.current_session  ?? App.data.schoolInfo?.session   ?? '2025/2026',
        term:           settings.current_term     ?? App.data.schoolInfo?.term      ?? 'Second Term',
        principal:      settings.principal_name   ?? App.data.schoolInfo?.principal ?? '',
        address:        settings.school_address   ?? '',
        phone:          settings.school_phone     ?? '',
        email:          settings.school_email     ?? '',
        logo:           settings.school_logo      ?? '',
        resumptionDate: settings.resumption_date  ?? '',
        announcements:  settings.announcements    ?? '',
        motto:          settings.school_motto     ?? '',
        website:        settings.school_website   ?? '',
      };

      try { if (settings.grading_scale)   App.data.gradingScale   = JSON.parse(settings.grading_scale);   } catch {}
      try { if (settings.domain_labels)   App.data.domainLabels   = JSON.parse(settings.domain_labels);   } catch {}
      try { if (settings.score_breakdown) App.data.scoreBreakdown = JSON.parse(settings.score_breakdown); } catch {}
      try { if (settings.fixtures)        App.data.fixtures       = JSON.parse(settings.fixtures);        } catch {}
      try { if (settings.timetable)       App.data.timetable      = JSON.parse(settings.timetable);       } catch {}
      try { if (settings.parent_tokens)   App.data.parentTokens   = JSON.parse(settings.parent_tokens);   } catch {}
      try {
        if (settings.att_specialDays) {
          App.data.attendanceSettings = App.data.attendanceSettings ?? {};
          App.data.attendanceSettings.specialDays = JSON.parse(settings.att_specialDays);
        }
      } catch {}
    }

    App.data.results           = App.data.results           ?? [];
    App.data.attendanceRecords = App.data.attendanceRecords ?? [];
    App.data.attendance        = App.data.attendanceRecords;
    App.data.remarks           = App.data.remarks           ?? [];
    App.data.domainAssessments = App.data.domainAssessments ?? [];
    App.data.fees              = App.data.fees              ?? [];
    App.data.notifications     = App.data.notifications     ?? [];
    App.data.parentTokens      = App.data.parentTokens      ?? [];
    App.data.timetable         = App.data.timetable         ?? {};
    App.data.fixtures          = App.data.fixtures          ?? [];

    console.info('[api-bridge] App.data hydrated from server.');
  } catch (err) {
    console.error('[api-bridge] loadAppData failed:', err);
    _toast('Could not load school data. Some features may be limited.', 'warning');
  }
};

window.saveAppData = function () { /* no-op — data lives in DB */ };


/* ═══════════════════════════════════════════════════════════════════════════
   1.  SCHOOL SETTINGS
   ═══════════════════════════════════════════════════════════════════════════ */

window.saveSchoolSettingsToAPI = async function (info) {
  try {
    await API.Admin.updateSettings({
      school_name: info.name, school_address: info.address, school_logo: info.logo,
      current_session: info.session, current_term: info.term, principal_name: info.principal,
      school_email: info.email, school_phone: info.phone, school_website: info.website,
      resumption_date: info.resumptionDate, announcements: info.announcements,
      school_motto: info.motto,
    });
    Object.assign(App.data.schoolInfo, info);
    _toast('School settings saved.', 'success');
  } catch (err) { _toast('Failed to save school settings: ' + err.message, 'error'); }
};

window.saveGeneralSettingsToAPI = async function (settings) {
  try {
    await API.Admin.updateSettings(_ns('gen', settings));
    App.data.generalSettings = { ...App.data.generalSettings, ...settings };
    _toast('General settings saved.', 'success');
  } catch (err) { _toast('Failed to save general settings: ' + err.message, 'error'); }
};

window.saveAttendanceSettingsToAPI = async function (settings) {
  try {
    const payload = _ns('att', { ...settings, specialDays: undefined });
    if (settings.specialDays !== undefined)
      payload.att_specialDays = JSON.stringify(settings.specialDays);
    await API.Admin.updateSettings(payload);
    App.data.attendanceSettings = { ...App.data.attendanceSettings, ...settings };
    _toast('Attendance & calendar settings saved.', 'success');
  } catch (err) { _toast('Failed to save attendance settings: ' + err.message, 'error'); }
};

window.saveGradingAndDomainsToAPI = async function (gradingScale, domainLabels, scoreBreakdown) {
  try {
    await API.Admin.updateSettings({
      grading_scale: JSON.stringify(gradingScale),
      domain_labels: JSON.stringify(domainLabels),
      score_breakdown: JSON.stringify(scoreBreakdown),
    });
    App.data.gradingScale = gradingScale;
    App.data.domainLabels = domainLabels;
    App.data.scoreBreakdown = scoreBreakdown;
    _toast('Grading & domain settings saved.', 'success');
  } catch (err) { _toast('Failed to save grading settings: ' + err.message, 'error'); }
};


/* ═══════════════════════════════════════════════════════════════════════════
   2.  CLASSES & ARMS
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiSaveClass = async function ({ id, name, level, arms }, isEdit) {
  try {
    if (isEdit) {
      // FIX: backend routes use class name as the URL param, not numeric id
      // Find the existing name from the in-memory cache to build the URL
      const existing = App.data.classes.find(c => c.id === id);
      const urlName  = existing?.name ?? name;
      await API.Classes.update(urlName, { name, level, arms });
      if (existing) Object.assign(existing, { name, level, arms });
    } else {
      const result = await API.Classes.create({ name, level, arms });
      App.data.classes.push(_unwrap(result) ?? { id: Date.now(), name, level, arms });
    }
    return true;
  } catch (err) { _toast('Could not save class: ' + err.message, 'error'); return false; }
};

window.apiDeleteClass = async function (id) {
  try {
    const cls = App.data.classes.find(c => c.id === id);
    if (!cls) { _toast('Class not found in local data.', 'error'); return false; }
    // FIX: backend route is /classes/:name
    await API.Classes.delete(cls.name);
    App.data.classes = App.data.classes.filter(c => c.id !== id);
    return true;
  } catch (err) { _toast('Could not delete class: ' + err.message, 'error'); return false; }
};

window.apiAddArm = async function (classId, newArms) {
  try {
    const c = App.data.classes.find(c => c.id === classId);
    if (!c) { _toast('Class not found.', 'error'); return false; }
    // FIX: pass class name to URL
    await API.Classes.addArm(c.name, { arms: newArms });
    newArms.forEach(a => { if (!c.arms.includes(a)) c.arms.push(a); });
    return true;
  } catch (err) { _toast('Could not add arm: ' + err.message, 'error'); return false; }
};

window.apiRenameArm = async function (classId, oldArm, newName) {
  try {
    const c = App.data.classes.find(c => c.id === classId);
    if (!c) { _toast('Class not found.', 'error'); return false; }
    // FIX: pass class name to URL
    await API.Classes.renameArm(c.name, oldArm, { new_name: newName });
    const i = c.arms.indexOf(oldArm);
    if (i >= 0) c.arms[i] = newName;
    App.data.students.forEach(s => { if (s.class === c.name && s.arm === oldArm) s.arm = newName; });
    App.data.teachers.forEach(t => { if (t.assignedClass === c.name && t.assignedArm === oldArm) t.assignedArm = newName; });
    return true;
  } catch (err) { _toast('Could not rename arm: ' + err.message, 'error'); return false; }
};

window.apiDeleteArm = async function (classId, arm) {
  try {
    const c = App.data.classes.find(c => c.id === classId);
    if (!c) { _toast('Class not found.', 'error'); return false; }
    // FIX: pass class name to URL
    await API.Classes.deleteArm(c.name, arm);
    c.arms = c.arms.filter(a => a !== arm);
    App.data.teachers.forEach(t => {
      if (t.assignedClass === c.name && t.assignedArm === arm) t.assignedArm = '';
    });
    return true;
  } catch (err) { _toast('Could not delete arm: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   3.  STUDENTS
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiSaveStudent = async function (data, existingId) {
  try {
    if (existingId) {
      await API.Students.update(existingId, data);
      const s = App.data.students.find(s => s.id === existingId);
      if (s) Object.assign(s, data);
      return data;
    } else {
      const result = await API.Students.create(data);
      const ns = _unwrap(result) ?? { ...data, id: `SHC/${String(App.data.students.length + 1).padStart(3, '0')}` };
      App.data.students.push(ns);
      return ns;
    }
  } catch (err) { _toast('Could not save student: ' + err.message, 'error'); return null; }
};

window.apiDeleteStudent = async function (id) {
  try {
    await API.Students.delete(id);
    App.data.students = App.data.students.filter(s => s.id !== id);
    App.data.results  = App.data.results.filter(r => r.studentId !== id);
    return true;
  } catch (err) { _toast('Could not delete student: ' + err.message, 'error'); return false; }
};

/* FIX #2: backend transfer expects { class, arm } not { new_class_id, new_arm } */
window.apiTransferStudent = async function (id, newClass, newArm) {
  try {
    await API.Students.transfer(id, { class: newClass, arm: newArm });
    const s = App.data.students.find(s => s.id === id);
    if (s) { s.class = newClass; s.arm = newArm; }
    return true;
  } catch (err) { _toast('Could not transfer student: ' + err.message, 'error'); return false; }
};

/* FIX #1: backend getAll expects `class` (the class name), not `classId` */
window.apiLoadStudents = async function (className, arm) {
  try {
    const list = _unwrap(await API.Students.getAll({ class: className, arm })) ?? [];
    list.forEach(s => {
      const i = App.data.students.findIndex(x => x.id === s.id);
      if (i >= 0) App.data.students[i] = s; else App.data.students.push(s);
    });
    return list;
  } catch (err) { _toast('Could not load students: ' + err.message, 'error'); return []; }
};

window.apiBulkAddStudents = async function (rows, cls, arm) {
  let saved = 0, failed = 0;
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(rows.slice(i, i + 10).map(row =>
      API.Students.create({ ...row, class: cls, arm })
        .then(r => { App.data.students.push(_unwrap(r) ?? row); saved++; })
        .catch(() => { failed++; })
    ));
  }
  if (failed) _toast(`${failed} row(s) could not be imported.`, 'warning');
  return saved;
};


/* ═══════════════════════════════════════════════════════════════════════════
   4.  STAFF & TEACHERS
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiSaveStaff = async function (data, existingId) {
  try {
    if (existingId) {
      await API.Staff.update(existingId, data);
      const s = (App.data.staff || []).find(x => x.id === existingId);
      if (s) Object.assign(s, data);
    } else {
      const result = await API.Staff.create(data);
      const ns = _unwrap(result) ?? { ...data, id: `S${String((App.data.staff || []).length + 1).padStart(3, '0')}` };
      App.data.staff = App.data.staff ?? [];
      App.data.staff.push(ns);
      if (!App.data.teachers) App.data.teachers = [];
      if (['Academic', 'Leadership'].includes(data.category)) App.data.teachers.push(ns);
    }
    return true;
  } catch (err) { _toast('Could not save staff member: ' + err.message, 'error'); return false; }
};

window.apiDeleteStaff = async function (id) {
  try {
    await API.Staff.delete(id);
    App.data.staff    = (App.data.staff    || []).filter(s => s.id !== id);
    App.data.teachers = (App.data.teachers || []).filter(t => t.id !== id);
    return true;
  } catch (err) { _toast('Could not delete staff: ' + err.message, 'error'); return false; }
};

window.apiUploadStaffCredential = async function (staffId, file, type) {
  try {
    const fd = new FormData();
    fd.append('file', file); fd.append('type', type);
    const result = await API.Staff.uploadCredential(staffId, fd);
    const s = (App.data.staff || []).find(x => x.id === staffId);
    if (s) {
      s.credentials = s.credentials ?? [];
      s.credentials.push(_unwrap(result)?.credential ?? { name: file.name, size: file.size, type });
    }
    return true;
  } catch (err) { _toast('Credential upload failed: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   5.  SUBJECTS
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiSaveSubject = async function (data, existingId) {
  try {
    if (existingId) {
      await API.Subjects.update(existingId, data);
      const i = App.data.subjects.findIndex(s => s.id === existingId);
      if (i >= 0) Object.assign(App.data.subjects[i], data);
    } else {
      const result = await API.Subjects.create(data);
      App.data.subjects.push(_unwrap(result) ?? { id: Date.now(), ...data });
    }
    return true;
  } catch (err) { _toast('Could not save subject: ' + err.message, 'error'); return false; }
};

window.apiDeleteSubject = async function (id) {
  try {
    await API.Subjects.delete(id);
    App.data.subjects = App.data.subjects.filter(s => s.id !== id);
    return true;
  } catch (err) { _toast('Could not delete subject: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   6.  RESULTS
   ═══════════════════════════════════════════════════════════════════════════ */

/*
 * FIX #3: apiSaveResults
 * The backend bulkCreate reads class_id/subject_id/term_id/session_id from the
 * top-level body AND falls back to per-row fields. However subject_id at the
 * top level must be the subject NAME (not a numeric id) because the controller
 * does: subjectName = subject || r.subject_id || r.subject
 * and then looks it up: db.subjects.find(s => s.name === subjectName || s.code === subjectName)
 * So passing the subject name as subject_id is correct.
 * term_id / session_id at top level become the term/session strings — also correct.
 * class_id is unused by bulkCreate (it derives class from the student row), so
 * sending the class name there is harmless.
 */
window.apiSaveResults = async function (cls, arm, subject, term, session, rows) {
  try {
    const result = await API.Results.bulkCreate({
      class_id:   cls,
      subject_id: subject,   // subject name — controller matches by name/code
      term_id:    term,
      session_id: session,
      results: rows.map(r => ({ student_id: r.studentId, ca: r.ca, exam: r.exam })),
    });
    rows.forEach(r => {
      const entry = { studentId: r.studentId, class: cls, arm, subject, term, session, ca: r.ca, exam: r.exam, total: r.total };
      const idx   = App.data.results.findIndex(x =>
        x.studentId === r.studentId && x.subject === subject && x.term === term && x.session === session);
      if (idx >= 0) App.data.results[idx] = entry; else App.data.results.push(entry);
    });
    return _unwrap(result)?.saved ?? rows.length;
  } catch (err) { _toast('Could not save results: ' + err.message, 'error'); return 0; }
};

/*
 * FIX #4: apiBulkSaveResults
 * Per-row subject_id was the raw subject name, which is fine — controller
 * handles it. But without a top-level session_id fallback some rows were
 * being skipped when r.session was missing. Now passes defaultSession both
 * at top level and per-row as the fallback.
 */
window.apiBulkSaveResults = async function (rows, cls, arm, defaultSession) {
  try {
    const result = await API.Results.bulkCreate({
      class_id:   cls,
      session_id: defaultSession,          // top-level fallback for rows without session
      results: rows.map(r => ({
        student_id: r.sid,
        subject_id: r.subject,             // subject name — controller matches by name/code
        term_id:    r.term,
        session_id: r.session || defaultSession,
        ca:         r.ca,
        exam:       r.exam,
      })),
    });
    rows.forEach(r => {
      const sess  = r.session || defaultSession;
      const total = Math.min(r.ca + r.exam, 100);
      const entry = { studentId: r.sid, class: cls, arm, subject: r.subject, term: r.term, session: sess, ca: r.ca, exam: r.exam, total };
      const idx   = App.data.results.findIndex(x =>
        x.studentId === r.sid && x.subject === r.subject && x.term === r.term && x.session === sess);
      if (idx >= 0) App.data.results[idx] = entry; else App.data.results.push(entry);
    });
    const res = _unwrap(result);
    return { saved: res?.saved ?? rows.length, skipped: res?.skipped ?? 0 };
  } catch (err) { _toast('Could not import results: ' + err.message, 'error'); return { saved: 0, skipped: rows.length }; }
};

window.apiLoadStudentResults = async function (studentId, termId) {
  try {
    const list = _unwrap(await API.Results.getAll({ studentId, termId })) ?? [];
    list.forEach(r => {
      const mapped = { studentId: r.student_id ?? r.studentId, subject: r.subject,
                       term: r.term_id ?? r.term, session: r.session_id ?? r.session,
                       ca: r.ca, exam: r.exam, total: r.total, class: r.class, arm: r.arm };
      const idx = App.data.results.findIndex(x => x.studentId === mapped.studentId && x.subject === mapped.subject && x.term === mapped.term);
      if (idx >= 0) App.data.results[idx] = mapped; else App.data.results.push(mapped);
    });
    return list;
  } catch (err) { console.warn('[api-bridge] apiLoadStudentResults:', err.message); return []; }
};

/*
 * FIX #9: apiSaveRemark
 * Remarks belong in the report_card_remarks table. There is no public REST
 * route for it yet, so we keep the settings-fallback but use a structured key
 * so it can be queried back: remark::{studentId}::{term}::{session}::{type}
 */
window.apiSaveRemark = async function (studentId, term, session, type, value) {
  try {
    const key = `remark::${studentId}::${term}::${session}::${type}`;
    await API.Admin.updateSettings({ [key]: value });
    App.data.remarks = App.data.remarks ?? [];
    let entry = App.data.remarks.find(r => r.studentId === studentId && r.term === term && r.session === session);
    if (!entry) { entry = { studentId, term, session, teacherRemark: '', principalRemark: '' }; App.data.remarks.push(entry); }
    if (type === 'teacher')   entry.teacherRemark   = value;
    if (type === 'principal') entry.principalRemark = value;
    return true;
  } catch (err) { _toast('Could not save remark: ' + err.message, 'error'); return false; }
};

window.apiSaveSubjectAllocation = async function (key, subjects) {
  try {
    await API.Admin.updateSettings({ [`subj_alloc_${key}`]: JSON.stringify(subjects) });
    App.data.subjectAllocations = App.data.subjectAllocations ?? {};
    App.data.subjectAllocations[key] = subjects;
    return true;
  } catch (err) { _toast('Could not save allocation: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   7.  ATTENDANCE & DOMAIN ASSESSMENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/*
 * FIX #5: apiUpsertAttendance
 * The old code sent { class_id, records: [{ student_id, status }] } which is
 * the shape for the BULK endpoint (POST /api/attendance/bulk).
 * The single-record endpoint (POST /api/attendance) expects flat fields:
 * { studentId, class, arm, date, term, session, status }
 * Also normalises status to short codes (p/a/l/e) that the DB ENUM accepts.
 */
window.apiUpsertAttendance = async function (studentId, date, status, cls, arm, session) {
  try {
    const term = App.data.schoolInfo?.term ?? '';
    // Normalise long-form status to DB codes
    const statusMap = { present: 'p', absent: 'a', late: 'l', excused: 'e' };
    const normStatus = statusMap[status?.toLowerCase()] ?? status;
    await API.Attendance.mark({
      studentId,
      class:   cls,
      arm:     arm,
      date,
      term,
      session,
      status:  normStatus,
    });
    return true;
  } catch (err) { console.warn('[api-bridge] apiUpsertAttendance (soft-fail):', err.message); return false; }
};

/*
 * FIX #6: apiSaveAllAttendance
 * Was calling API.Attendance.mark() (single-record POST /) in a loop via
 * Promise.all — this would call mark() once per date, passing an array as
 * `records` which the single-record endpoint does not understand.
 * The correct endpoint is POST /api/attendance/bulk via API.Attendance.bulkMark
 * (added to api.js — see note at bottom of file).
 * Backend bulk endpoint expects: { class, arm, date, term, session, records[] }
 * where each record is { student_id, status }.
 * Status values normalised to p/a/l/e.
 */
window.apiSaveAllAttendance = async function (cls, arm, session, records) {
  try {
    const term      = App.data.schoolInfo?.term ?? '';
    const statusMap = { present: 'p', absent: 'a', late: 'l', excused: 'e' };

    // Group records by date so we can call bulkMark once per date
    const byDate = {};
    records.forEach(r => {
      if (!r.date) return;
      (byDate[r.date] = byDate[r.date] ?? []).push({
        student_id: r.studentId,
        status:     statusMap[r.status?.toLowerCase()] ?? r.status ?? 'p',
      });
    });

    await Promise.all(
      Object.entries(byDate).map(([date, recs]) =>
        API.Attendance.bulkMark({
          class:   cls,
          arm,
          date,
          term,
          session,
          records: recs,
        })
      )
    );
    return true;
  } catch (err) { _toast('Could not save attendance: ' + err.message, 'error'); return false; }
};

/*
 * FIX #7 & #8: domain assessments
 * Old code persisted to school_settings with ad-hoc keys.
 * Backend has PUT /api/attendance/domains/:studentId which expects:
 * { cognitive, affective, psychomotor } in the body with term & session as
 * query params. Using the proper endpoint now.
 */
window.apiSaveDomainAssessment = async function (studentId, term, session, key, value) {
  try {
    // Single-field update — fetch current, patch, then save
    const current = (App.data.domainAssessments ?? []).find(
      d => d.studentId === studentId && d.term === term && d.session === session
    ) ?? {};
    const payload = {
      cognitive:   current.cognitive   ?? null,
      affective:   current.affective   ?? null,
      psychomotor: current.psychomotor ?? null,
      [key]:       value,
    };
    await fetch(
      `/api/attendance/domains/${encodeURIComponent(studentId)}?term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    return true;
  } catch (err) { console.warn('[api-bridge] apiSaveDomainAssessment (soft-fail):', err.message); return false; }
};

window.apiSaveFullDomainAssessment = async function (studentId, term, session, cognitive, affective, psychomotor) {
  try {
    await fetch(
      `/api/attendance/domains/${encodeURIComponent(studentId)}?term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cognitive, affective, psychomotor }),
      }
    );
    return true;
  } catch (err) { _toast('Could not save domain assessment: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   8.  FIXTURES
   ═══════════════════════════════════════════════════════════════════════════ */

async function _persistFixtures() {
  return API.Admin.updateSettings({ fixtures: JSON.stringify(App.data.fixtures ?? []) });
}

window.apiSaveFixture = async function (data, existingId) {
  try {
    if (existingId) {
      App.data.fixtures = (App.data.fixtures ?? []).map(f => f.id === existingId ? { ...f, ...data } : f);
    } else {
      App.data.fixtures = App.data.fixtures ?? [];
      App.data.fixtures.push({ id: Date.now(), ...data });
    }
    await _persistFixtures();
    return true;
  } catch (err) { _toast('Could not save fixture: ' + err.message, 'error'); return false; }
};

window.apiDeleteFixture = async function (id) {
  try {
    App.data.fixtures = (App.data.fixtures ?? []).filter(f => f.id !== id);
    await _persistFixtures();
    return true;
  } catch (err) { _toast('Could not delete fixture: ' + err.message, 'error'); return false; }
};

window.apiRecordFixtureResult = async function (id, scoreA, scoreB) {
  try {
    App.data.fixtures = (App.data.fixtures ?? []).map(f =>
      f.id === id ? { ...f, scoreA, scoreB, status: 'Completed' } : f);
    await _persistFixtures();
    return true;
  } catch (err) { _toast('Could not record result: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   9.  FEES / FINANCE  (script3.js)
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiRecordFeePayment = async function (paymentData) {
  try {
    let saved;
    try {
      saved = _unwrap(await API.Fees.recordPayment(paymentData));
    } catch {
      // Fallback: persist locally in settings when Fees API isn't live yet
      const entry = { id: `FEE${Date.now()}`, ...paymentData };
      App.data.fees = App.data.fees ?? [];
      App.data.fees.push(entry);
      await API.Admin.updateSettings({ fees_records: JSON.stringify(App.data.fees) });
      return entry;
    }
    App.data.fees = App.data.fees ?? [];
    App.data.fees.push(saved ?? { id: `FEE${Date.now()}`, ...paymentData });
    return saved;
  } catch (err) { _toast('Could not record payment: ' + err.message, 'error'); return null; }
};

window.apiDeleteFeeRecord = async function (id) {
  try {
    try { await API.Fees.reversePayment(id); }
    catch {
      App.data.fees = (App.data.fees ?? []).filter(f => f.id !== id);
      await API.Admin.updateSettings({ fees_records: JSON.stringify(App.data.fees) });
      return true;
    }
    App.data.fees = (App.data.fees ?? []).filter(f => f.id !== id);
    return true;
  } catch (err) { _toast('Could not delete payment: ' + err.message, 'error'); return false; }
};

window.apiLoadFees = async function (sessionId) {
  try {
    const list = _unwrap(await API.Fees.getPayments({ sessionId })) ?? [];
    App.data.fees = list;
    return list;
  } catch (err) { console.warn('[api-bridge] apiLoadFees:', err.message); return App.data.fees ?? []; }
};

window.exportFeesCSV = function () {
  const rows = [['Student', 'Class', 'Arm', 'Fee Type', 'Amount', 'Date', 'Term', 'Status']];
  (App.data.fees ?? []).forEach(f => {
    const s = (App.data.students ?? []).find(st => st.id === f.studentId);
    rows.push([s?.name ?? f.studentId, s?.class ?? '', s?.arm ?? '', f.feeType, f.amount, f.date, f.term, f.status]);
  });
  _downloadCSV(rows, 'fees_records.csv');
  _toast('Fees exported!', 'success');
};


/* ═══════════════════════════════════════════════════════════════════════════
   10.  TIMETABLE  (script3.js)
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiSaveTimetable = async function () {
  try {
    await API.Admin.updateSettings({ timetable: JSON.stringify(App.data.timetable ?? {}) });
    return true;
  } catch (err) { _toast('Could not save timetable: ' + err.message, 'error'); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   11.  NOTIFICATIONS  (script3.js)
   ═══════════════════════════════════════════════════════════════════════════ */

window.apiPushNotification = async function (message, type = 'info', audience = 'admin') {
  try {
    if (['all', 'teacher', 'student', 'parent'].includes(audience))
      await API.Notices.create({ title: type.toUpperCase(), body: message, audience, pinned: false });
    return true;
  } catch (err) { console.warn('[api-bridge] apiPushNotification (soft-fail):', err.message); return false; }
};

window.apiClearNotifications = function () { App.data.notifications = []; };


/* ═══════════════════════════════════════════════════════════════════════════
   12.  PARENT TOKENS  (script3.js)
   ═══════════════════════════════════════════════════════════════════════════ */

async function _persistParentTokens() {
  return API.Admin.updateSettings({ parent_tokens: JSON.stringify(App.data.parentTokens ?? []) });
}

window.apiGenerateParentToken = async function (studentId) {
  try {
    const token   = 'SHC-PRC-' + new Date().getFullYear() + '-' +
                    Math.random().toString(36).substr(2, 6).toUpperCase();
    const expires = new Date(); expires.setDate(expires.getDate() + 30);
    App.data.parentTokens = (App.data.parentTokens ?? []).filter(t => t.studentId !== studentId);
    App.data.parentTokens.push({ token, studentId, created: new Date().toISOString(), expires: expires.toISOString(), used: false });
    await _persistParentTokens();
    return token;
  } catch (err) { _toast('Could not generate token: ' + err.message, 'error'); return null; }
};

window.apiMarkTokenUsed = async function (token) {
  try {
    const t = (App.data.parentTokens ?? []).find(t => t.token === token);
    if (t) { t.used = true; t.lastAccessed = new Date().toISOString(); }
    await _persistParentTokens();
    return true;
  } catch (err) { console.warn('[api-bridge] apiMarkTokenUsed (soft-fail):', err.message); return false; }
};


/* ═══════════════════════════════════════════════════════════════════════════
   13.  DATA MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

window.exportData = function () {
  const ts   = new Date().toISOString().split('T')[0];
  const blob = new Blob([JSON.stringify(App.data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `SHC_backup_${ts}.json` });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  _toast('Backup downloaded!', 'success');
};

window.exportStudentsCSV = function () {
  const rows = [['Student ID', 'Name', 'Class', 'Arm', 'Gender', 'DOB', 'Parent', 'Phone', 'Attendance %']];
  (App.data.students ?? []).forEach(s =>
    rows.push([s.id, s.name, s.class, s.arm, s.gender, s.dob ?? '', s.parent ?? '', s.phone ?? '', s.attendance ?? 0]));
  _downloadCSV(rows, 'students_export.csv');
  _toast('Students exported!', 'success');
};

window.exportResultsCSV = function () {
  const rows = [['Student ID', 'Name', 'Class', 'Arm', 'Subject', 'CA', 'Exam', 'Total', 'Grade', 'Term', 'Session']];
  (App.data.results ?? []).forEach(r => {
    const s = (App.data.students ?? []).find(st => st.id === r.studentId);
    const g = typeof grade === 'function' ? grade(r.total) : { letter: '' };
    rows.push([r.studentId, s?.name ?? '', r.class ?? '', r.arm ?? '',
               r.subject, r.ca, r.exam, r.total, g.letter, r.term, r.session]);
  });
  _downloadCSV(rows, 'results_export.csv');
  _toast('Results exported!', 'success');
};

window.clearResults = async function () {
  if (!confirm('Delete ALL academic results? This cannot be undone.')) return;
  try {
    await API.Admin.updateSettings({ clear_results: '1' });
    App.data.results = []; App.data.remarks = [];
    _toast('All results cleared.', 'warning');
  } catch (err) { _toast('Could not clear results: ' + err.message, 'error'); }
};

window.clearAttendance = async function () {
  if (!confirm('Delete ALL attendance records? This cannot be undone.')) return;
  try {
    await API.Admin.updateSettings({ clear_attendance: '1' });
    App.data.attendanceRecords = []; App.data.attendance = [];
    App.data.domainAssessments = [];
    (App.data.students ?? []).forEach(s => { s.attendance = 0; });
    _toast('Attendance records cleared.', 'warning');
  } catch (err) { _toast('Could not clear attendance: ' + err.message, 'error'); }
};


/* ═══════════════════════════════════════════════════════════════════════════
   14.  FUNCTION SHADOWS
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Classes ───────────────────────────────────────────────────────────────────

window.confirmDeleteClass = async function (id) {
  const cls = (App.data.classes ?? []).find(c => c.id === id);
  if (!await apiDeleteClass(id)) return;
  if (typeof closeModal === 'function') closeModal();
  if (typeof renderClasses === 'function') renderClasses();
  _toast(`"${cls?.name ?? 'Class'}" deleted.`, 'warning');
};

// ── Students ──────────────────────────────────────────────────────────────────

window.confirmDeleteStudent = async function (id) {
  const name = (App.data.students ?? []).find(s => s.id === id)?.name ?? 'Student';
  if (!await apiDeleteStudent(id)) return;
  if (typeof closeModal === 'function') closeModal();
  if (typeof renderStudents === 'function') renderStudents(window._currentFilter, window._currentFilters);
  _toast(`${name} deleted.`, 'warning');
};

window.confirmTransfer = async function (id) {
  const newCls = document.getElementById('transfer-class')?.value;
  const newArm = document.getElementById('transfer-arm')?.value;
  if (!newCls || !newArm) return;
  const s   = (App.data.students ?? []).find(st => st.id === id);
  const old = `${s?.class} ${s?.arm}`;
  if (!await apiTransferStudent(id, newCls, newArm)) return;
  if (typeof closeModal === 'function') closeModal();
  if (typeof renderStudents === 'function') renderStudents(window._currentFilter, window._currentFilters);
  _toast(`${s?.name} transferred from ${old} → ${newCls} ${newArm}.`, 'success');
};

// ── Staff ─────────────────────────────────────────────────────────────────────

window.smDeleteStaff = async function (id) {
  if (typeof priv !== 'undefined' && !priv.canManage() && typeof denyAccess === 'function' && denyAccess()) return;
  if (!confirm('Delete this staff member? This cannot be undone.')) return;
  if (!await apiDeleteStaff(id)) return;
  if (typeof renderStaff === 'function') renderStaff();
  _toast('Staff member deleted.', 'warning');
};

// ── Subjects ──────────────────────────────────────────────────────────────────

window.deleteSubject = async function (id) {
  if (typeof priv !== 'undefined' && !priv.canManage() && typeof denyAccess === 'function' && denyAccess()) return;
  if (!confirm('Remove this subject?')) return;
  if (!await apiDeleteSubject(id)) return;
  if (typeof renderSubjects === 'function') renderSubjects();
  _toast('Subject removed.', 'warning');
};

// ── Results ───────────────────────────────────────────────────────────────────

window.saveAllResults = async function (cls, arm, subject, term, session) {
  if (typeof priv !== 'undefined') {
    if (!priv.canEnterResults())       { if (typeof denyAccess === 'function') denyAccess('No permission.'); return; }
    if (!priv.canActOnClass(cls, arm)) { if (typeof denyAccess === 'function') denyAccess('Restricted.'); return; }
  }

  const SS_CAP = ['SS 2', 'SS 3'];
  const rows   = [];

  document.querySelectorAll('#result-rows tr').forEach(row => {
    const sid  = row.dataset.sid;
    const ca   = parseFloat(row.querySelector('.ca-input')?.value);
    const exam = parseFloat(row.querySelector('.exam-input')?.value);
    if (isNaN(ca) || isNaN(exam)) return;

    if (SS_CAP.includes(cls)) {
      const existing = new Set((App.data.results ?? [])
        .filter(r => r.studentId === sid && r.term === term && r.session === session)
        .map(r => r.subject));
      if (!existing.has(subject) && existing.size >= 9) {
        _toast(`${sid} already has 9 subjects — ${subject} skipped.`, 'warning');
        return;
      }
    }
    rows.push({ studentId: sid, ca, exam, total: Math.min(ca + exam, 100) });
  });

  if (!rows.length) return _toast('No valid scores to save.', 'warning');
  const saved = await apiSaveResults(cls, arm, subject, term, session, rows);
  _toast(`${saved} result(s) saved!`, 'success');
};

window.saveBulkExcelResults = async function () {
  const cls = document.getElementById('bulk-res-class')?.value;
  const arm = document.getElementById('bulk-res-arm')?.value;
  if (typeof priv !== 'undefined') {
    if (!priv.canEnterResults())       { if (typeof denyAccess === 'function') denyAccess('No permission.'); return; }
    if (!priv.canActOnClass(cls, arm)) { if (typeof denyAccess === 'function') denyAccess('Restricted.'); return; }
  }

  const rows = (window._parsedExcelRows ?? []).filter(r => r.ok);
  if (!rows.length) return _toast('No valid rows to import.', 'warning');

  const SS_CAP = ['SS 2', 'SS 3'];
  if (SS_CAP.includes(cls)) {
    const byStudent = {};
    rows.forEach(r => { (byStudent[r.sid] = byStudent[r.sid] ?? new Set()).add(r.subject); });
    for (const sid in byStudent) {
      const termForSid = rows.find(r => r.sid === sid)?.term ?? App.data.schoolInfo?.term;
      const existing   = new Set((App.data.results ?? [])
        .filter(x => x.studentId === sid && x.term === termForSid && x.session === App.data.schoolInfo?.session)
        .map(x => x.subject)).size;
      if (existing + byStudent[sid].size > 9)
        return _toast(`Student ${sid}: would exceed 9-subject limit for ${cls}. Import blocked.`, 'error');
    }
  }

  const { saved, skipped } = await apiBulkSaveResults(rows, cls, arm, App.data.schoolInfo?.session);
  _toast(`${saved} result(s) imported!${skipped ? ` ${skipped} skipped.` : ''}`, saved > 0 ? 'success' : 'warning');
  if (saved > 0 && typeof clearExcelImport === 'function') clearExcelImport();
};

// ── Attendance ────────────────────────────────────────────────────────────────

window.attSaveAll = async function () {
  const { cls, arm, session } = window._attCtx ?? {};
  if (!cls) return _toast('Load a register first.', 'warning');
  if (typeof priv !== 'undefined') {
    if (!priv.canTakeAttendance()) { if (typeof denyAccess === 'function') denyAccess('No permission.'); return; }
    if (!priv.canActOnClass(cls, arm)) { if (typeof denyAccess === 'function') denyAccess('Restricted.'); return; }
  }
  const records = (App.data.attendanceRecords ?? []).filter(r => r.class === cls && r.arm === arm && r.session === session);
  if (await apiSaveAllAttendance(cls, arm, session, records)) _toast('Attendance saved!', 'success');
};

// ── Remarks ───────────────────────────────────────────────────────────────────

window.saveRemark = async function (studentId, term, session, type) {
  if (typeof priv !== 'undefined') {
    if (type === 'principal' && !priv.isAdmin()) { if (typeof denyAccess === 'function') denyAccess('Only Admin can save principal remark.'); return; }
    if (type === 'teacher' && !priv.canEnterResults()) { if (typeof denyAccess === 'function') denyAccess('No permission.'); return; }
  }
  const elId  = type === 'teacher' ? `t-rem-${studentId}` : `p-rem-${studentId}`;
  const value = document.getElementById(elId)?.value ?? '';
  await apiSaveRemark(studentId, term, session, type, value);
};

// ── Domain assessment (script3.js) ────────────────────────────────────────────

window.saveDomainAssessment = async function (studentId, term, session) {
  const cognitive   = parseFloat(document.getElementById('da-cognitive')?.value)   || null;
  const affective   = parseFloat(document.getElementById('da-affective')?.value)   || null;
  const psychomotor = parseFloat(document.getElementById('da-psychomotor')?.value) || null;

  App.data.domainAssessments = App.data.domainAssessments ?? [];
  const idx = App.data.domainAssessments.findIndex(d =>
    d.studentId === studentId && d.term === term && d.session === session);
  const record = { studentId, term, session, cognitive, affective, psychomotor };
  if (idx >= 0) App.data.domainAssessments[idx] = record; else App.data.domainAssessments.push(record);

  await apiSaveFullDomainAssessment(studentId, term, session, cognitive, affective, psychomotor);
  if (typeof closeModal === 'function') closeModal();
  _toast('Domain assessment saved!', 'success');
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

window.deleteFixture = async function (id) {
  if (typeof priv !== 'undefined' && !priv.isAdmin() && typeof denyAccess === 'function' && denyAccess()) return;
  if (!confirm('Delete this fixture?')) return;
  if (!await apiDeleteFixture(id)) return;
  if (typeof renderFixtures === 'function') renderFixtures();
  _toast('Fixture deleted.', 'warning');
};

window.recordResult = function (id) {
  if (typeof priv !== 'undefined' && !priv.isAdmin() && typeof denyAccess === 'function' && denyAccess()) return;
  const f = (App.data.fixtures ?? []).find(x => x.id === id);
  if (!f || typeof showModal !== 'function') return;
  showModal(`
    <h3 style="margin:0 0 1.5rem;">Record Result</h3>
    <div style="text-align:center;margin-bottom:1.5rem;font-size:1.2rem;font-weight:700;">${f.teamA} vs ${f.teamB}</div>
    <form id="result-fix-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div><label style="display:block;font-size:.875rem;font-weight:500;margin-bottom:.3rem;">${f.teamA} Score</label>
          <input type="number" id="scoreA" min="0" style="width:100%;padding:.6rem .85rem;border:1px solid #d1d5db;border-radius:8px;" required></div>
        <div><label style="display:block;font-size:.875rem;font-weight:500;margin-bottom:.3rem;">${f.teamB} Score</label>
          <input type="number" id="scoreB" min="0" style="width:100%;padding:.6rem .85rem;border:1px solid #d1d5db;border-radius:8px;" required></div>
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
        <button type="button" onclick="closeModal()" style="padding:.55rem 1.1rem;background:#e5e7eb;color:#374151;border:none;border-radius:8px;cursor:pointer;">Cancel</button>
        <button type="submit" style="padding:.55rem 1.1rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Save</button>
      </div>
    </form>`);
  document.getElementById('result-fix-form').onsubmit = async (e) => {
    e.preventDefault();
    const sA = parseInt(document.getElementById('scoreA').value);
    const sB = parseInt(document.getElementById('scoreB').value);
    if (!await apiRecordFixtureResult(id, sA, sB)) return;
    if (typeof closeModal === 'function') closeModal();
    if (typeof renderFixtures === 'function') renderFixtures();
    _toast('Result recorded!', 'success');
  };
};

// ── Fees ──────────────────────────────────────────────────────────────────────

const _origOpenFeePaymentModal = window.openFeePaymentModal;
window.openFeePaymentModal = function () {
  if (typeof _origOpenFeePaymentModal === 'function') _origOpenFeePaymentModal();
  setTimeout(() => {
    const form = document.getElementById('fee-form');
    if (!form || form.dataset.bridged) return;
    form.dataset.bridged = '1';
    form.onsubmit = async function (e) {
      e.preventDefault();
      const studentId = document.getElementById('fee-student')?.value;
      const feeType   = document.getElementById('fee-type')?.value;
      const amount    = parseFloat(document.getElementById('fee-amount')?.value);
      if (!studentId || !feeType || isNaN(amount)) return;
      const data = {
        studentId, feeType, amount,
        date:   document.getElementById('fee-date')?.value,
        term:   document.getElementById('fee-term')?.value,
        status: document.getElementById('fee-status')?.value,
      };
      const result = await apiRecordFeePayment(data);
      if (!result) return;
      if (typeof closeModal === 'function') closeModal();
      if (typeof renderFees === 'function') renderFees();
      _toast('Payment recorded!', 'success');
    };
  }, 50);
};

window.deleteFeeRecord = async function (id) {
  if (!confirm('Delete this payment record?')) return;
  if (!await apiDeleteFeeRecord(id)) return;
  if (typeof renderFees === 'function') renderFees();
  _toast('Record deleted.', 'warning');
};

// ── Timetable ─────────────────────────────────────────────────────────────────

const _origSaveTimetable = window.saveTimetable;
window.saveTimetable = async function (cls, arm) {
  // script3.js writes to App.data.timetable synchronously first
  if (typeof _origSaveTimetable === 'function') _origSaveTimetable(cls, arm);
  if (!await apiSaveTimetable()) return;
  _toast('Timetable saved!', 'success');
};

// ── Parent token generation ───────────────────────────────────────────────────

window.generateParentToken = async function (studentId) {
  if (typeof priv !== 'undefined' && !priv.isAdmin()) { _toast('Only Admins can generate tokens.', 'error'); return; }
  const token = await apiGenerateParentToken(studentId);
  if (!token) return;
  const student = (App.data.students ?? []).find(s => s.id === studentId);
  const record  = (App.data.parentTokens ?? []).find(t => t.token === token);
  const expires = record ? new Date(record.expires).toLocaleDateString() : '';
  if (typeof showModal === 'function') {
    showModal(`
      <div style="text-align:center;padding:.5rem 0 1rem;">
        <div style="font-size:2rem;margin-bottom:.75rem;">🔑</div>
        <h3 style="margin:0 0 .5rem;">Parent Token Generated</h3>
        ${student ? `<p style="color:#6b7280;margin:0 0 1rem;">${student.name}</p>` : ''}
        <div style="font-family:monospace;font-size:1.4rem;letter-spacing:2px;background:#f1f5f9;padding:1.1rem;border-radius:10px;margin:1rem 0;">${token}</div>
        <p style="font-size:.85rem;color:#6b7280;">Valid 30 days · Expires ${expires}</p>
        <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.25rem;">
          <button onclick="navigator.clipboard.writeText('${token}').then(()=>{if(typeof toast==='function')toast('Copied!','success');})"
            style="padding:.55rem 1.2rem;background:#e5e7eb;color:#374151;border:none;border-radius:8px;cursor:pointer;font-weight:500;">📋 Copy</button>
          <button onclick="closeModal()" style="padding:.55rem 1.2rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Close</button>
        </div>
      </div>`);
  }
  navigator.clipboard.writeText(token).catch(() => {});
};

// ── validateParentToken — mark used on server after script3.js validates ──────

const _origValidateParentToken = window.validateParentToken;
window.validateParentToken = async function () {
  if (typeof _origValidateParentToken === 'function') _origValidateParentToken();
  const raw = (document.getElementById('pp-token-input')?.value || '').trim().toUpperCase();
  if (!raw) return;
  const t = (App.data.parentTokens ?? []).find(x => x.token === raw);
  if (!t || (t.expires && new Date(t.expires) < new Date())) return;
  await apiMarkTokenUsed(raw);
};

// ── Settings saves ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('submit', function (e) {
    if (e.target.id === 'school-form')
      setTimeout(() => saveSchoolSettingsToAPI(App.data.schoolInfo ?? {}), 0);
  }, true);
});

const _origSaveGeneralSettings = window.saveGeneralSettings;
window.saveGeneralSettings = async function () {
  if (typeof _origSaveGeneralSettings === 'function') _origSaveGeneralSettings();
  await saveGeneralSettingsToAPI(App.data.generalSettings ?? {});
};

const _origSaveAttendanceSettings = window.saveAttendanceSettings;
window.saveAttendanceSettings = async function () {
  if (typeof _origSaveAttendanceSettings === 'function') _origSaveAttendanceSettings();
  await saveAttendanceSettingsToAPI(App.data.attendanceSettings ?? {});
};

const _origSaveGradingAndDomains = window.saveGradingAndDomains;
window.saveGradingAndDomains = async function () {
  if (typeof _origSaveGradingAndDomains === 'function') _origSaveGradingAndDomains();
  await saveGradingAndDomainsToAPI(
    App.data.gradingScale   ?? [],
    App.data.domainLabels   ?? {},
    App.data.scoreBreakdown ?? {}
  );
};


/* ═══════════════════════════════════════════════════════════════════════════
   15.  BOOT
   ═══════════════════════════════════════════════════════════════════════════ */

const _origInit = window.init;
window.init = async function () {
  if (typeof _origInit === 'function') _origInit();
  await loadAppData();
  if (typeof renderSection === 'function') renderSection(App.currentSection ?? 'dashboard');
};

/*
 * NOTE FOR api.js:
 * ─────────────────
 * Two changes are also needed in api.js (not in this file):
 *
 * 1. Auth.login — change `identifier` to `email`:
 *      login: (identifier, password, role) =>
 *        post('/auth/login', { email: identifier, password, role }),
 *
 * 2. Admin.updateSettings — backend route is POST /api/admin, not PUT:
 *      updateSettings: (data) => post('/admin/settings', data),
 *      (check your backend route: router.post('/', adminController.updateSettings))
 *
 * 3. Attendance.bulkMark is missing from api.js — add it:
 *      bulkMark: (data) => post('/attendance/bulk', data),
 */

console.info('[api-bridge v2.1] loaded — all mutations from script2.js + script3.js route to the REST API.');