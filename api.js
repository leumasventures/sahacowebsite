'use strict';

/**
 * api.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Frontend API client — full school management system.
 *
 * FIXES applied (vs repo version):
 *
 *  1. Auth.changePassword — was sending snake_case {current_password, new_password};
 *     backend expects camelCase {currentPassword, newPassword}
 *
 *  2. Auth.resetPassword — was sending {token, new_password};
 *     backend expects {token, newPassword}
 *
 *  3. Admin.updateSettings — was using put(); backend route is POST /api/admin;
 *     changed to post()
 *
 *  4. Classes.getById / update / delete / getStudents / getArms / addArm /
 *     renameArm / deleteArm / assignTeacher
 *     — were all using numeric :id in the URL (e.g. /classes/3);
 *     backend routes use :name (e.g. /classes/SS%202). Changed all class
 *     sub-routes to accept the class name instead of a numeric id.
 *
 *  5. Attendance.mark — was POSTing to /attendance/mark (non-existent route);
 *     backend route is POST /api/attendance (flat, no /mark suffix).
 *     Also added Attendance.bulkMark for POST /attendance/bulk.
 *
 *  6. Attendance.getSummary — was sending {classId, termId}; backend summary
 *     route is GET /attendance/summary/:studentId?term=&session= (student-level).
 *     Added Attendance.getClassSummary for GET /attendance/class-summary.
 *
 *  7. Attendance.getForStudent — was hitting /attendance/student?studentId=&termId=
 *     (non-existent); backend has GET /attendance?studentId=&term=&session=.
 *     Removed the broken helper; use Attendance.getAll({studentId, term, session}).
 *
 *  8. Middleware JWT env var mismatch — noted: middleware/auth.js reads JWT_SECRET
 *     but authController.js reads JWT_ACCESS_SECRET. Both env vars must be set to
 *     the same value in .env (documented below).
 */

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL           = 'https://sacredheartcollegeaba.com/api';
const DEFAULT_TIMEOUT_MS = 15_000;
const EXPORT_TIMEOUT_MS  = 60_000;

// ─────────────────────────────────────────────────────────────────────────────
//  CORE REQUEST HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function request(method, path, body = null, isFormData = false, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  const options = {
    method,
    credentials: 'include',
    signal:      controller.signal,
    headers:     {},
  };

  if (body !== null) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    clearTimeout(timer);

    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({ message: res.statusText }));

    if (!res.ok) {
      const err  = new Error(data.message ?? `API error ${res.status}`);
      err.status = res.status;
      err.code   = data.code   ?? null;
      err.errors = data.errors ?? null;
      err.data   = data;
      throw err;
    }

    return data;

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const timeout  = new Error(`Request timed out: ${method} ${path}`);
      timeout.status = 408;
      throw timeout;
    }
    throw err;
  }
}

const get    = (path, timeoutMs)       => request('GET',    path, null, false, timeoutMs);
const post   = (path, body)            => request('POST',   path, body, false);
const put    = (path, body)            => request('PUT',    path, body, false);
const patch  = (path, body)            => request('PATCH',  path, body, false);
const del    = (path)                  => request('DELETE', path, null, false);
const upload = (path, form, timeoutMs) => request('POST',   path, form, true,  timeoutMs ?? DEFAULT_TIMEOUT_MS);

function buildQuery(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const Auth = {
  /** POST /auth/login  body: { email, password, role? } */
  login: (email, password, role) =>
    post('/auth/login', { email, password, role }),

  /** POST /auth/logout */
  logout: () => post('/auth/logout'),

  /** GET /auth/me */
  me: () => get('/auth/me'),

  /** POST /auth/refresh */
  refresh: () => post('/auth/refresh'),

  /**
   * POST /auth/change-password
   * FIX #1: backend expects camelCase {currentPassword, newPassword}
   */
  changePassword: (currentPassword, newPassword) =>
    post('/auth/change-password', { currentPassword, newPassword }),

  /** POST /auth/forgot-password */
  forgotPassword: (email) => post('/auth/forgot-password', { email }),

  /**
   * POST /auth/reset-password
   * FIX #2: backend expects {token, newPassword} not {token, new_password}
   */
  resetPassword: (token, newPassword) =>
    post('/auth/reset-password', { token, newPassword }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  CLASSES  (FIX #4 — all sub-routes use class name, not numeric id)
// ─────────────────────────────────────────────────────────────────────────────

export const Classes = {
  /** GET /classes?level=&search= */
  getAll: (params = {}) => get(`/classes${buildQuery(params)}`),

  /**
   * GET /classes/:name
   * Backend route param is :name (the class name string, e.g. "SS 2")
   */
  getByName: (name)        => get(`/classes/${encodeURIComponent(name)}`),
  // Alias kept for backward compat — callers that pass a name string work fine
  getById:   (name)        => get(`/classes/${encodeURIComponent(name)}`),

  /** POST /classes  body: { name, level, arms[] } */
  create: (data) => post('/classes', data),

  /** PUT /classes/:name  body: { name?, level? } */
  update: (name, data) => put(`/classes/${encodeURIComponent(name)}`, data),

  /** DELETE /classes/:name */
  delete: (name) => del(`/classes/${encodeURIComponent(name)}`),

  /** GET /classes/:name/students?arm= */
  getStudents: (name, params = {}) =>
    get(`/classes/${encodeURIComponent(name)}/students${buildQuery(params)}`),

  /** GET /classes/:name/summary?arm=&term=&session= */
  getSummary: (name, params = {}) =>
    get(`/classes/${encodeURIComponent(name)}/summary${buildQuery(params)}`),

  /** PATCH /classes/:name/assign-teacher  body: { teacher_id, arm? } */
  assignTeacher: (name, data) =>
    patch(`/classes/${encodeURIComponent(name)}/assign-teacher`, data),

  // ── Arms ────────────────────────────────────────────────────────────────

  /** GET /classes/:name/arms */
  getArms: (name) =>
    get(`/classes/${encodeURIComponent(name)}/arms`),

  /** POST /classes/:name/arms  body: { arm } or { arms: [] } */
  addArm: (name, data) =>
    post(`/classes/${encodeURIComponent(name)}/arms`, data),

  /** PATCH /classes/:name/arms/:arm  body: { new_name } */
  renameArm: (name, arm, data) =>
    patch(`/classes/${encodeURIComponent(name)}/arms/${encodeURIComponent(arm)}`, data),

  /** DELETE /classes/:name/arms/:arm */
  deleteArm: (name, arm) =>
    del(`/classes/${encodeURIComponent(name)}/arms/${encodeURIComponent(arm)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
//  STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

export const Students = {
  /** GET /students?class=&arm=&gender=&search=&sortBy=&sortDir=&page=&limit= */
  getAll: (params = {}) => get(`/students${buildQuery(params)}`),

  /** GET /students/:id */
  getById: (id) => get(`/students/${id}`),

  /** POST /students  body: { name, class, arm, gender, … } */
  create: (data) => post('/students', data),

  /** PUT /students/:id */
  update: (id, data) => put(`/students/${id}`, data),

  /** PATCH /students/:id/status  body: { status } */
  setStatus: (id, status) => patch(`/students/${id}/status`, { status }),

  /** DELETE /students/:id */
  delete: (id) => del(`/students/${id}`),

  /** GET /students/:id/results?term=&session= */
  getResults: (id, params = {}) => get(`/students/${id}/results${buildQuery(params)}`),

  /** GET /students/:id/attendance?term=&session= */
  getAttendance: (id, params = {}) => get(`/students/${id}/attendance${buildQuery(params)}`),

  /** GET /students/:id/report-card?term=&session= */
  getReportCard: (id, params = {}) => get(`/students/${id}/report-card${buildQuery(params)}`),

  /** GET /students/:id/summary?term=&session= */
  getSummary: (id, params = {}) => get(`/students/${id}/summary${buildQuery(params)}`),

  /** PATCH /students/:id/transfer  body: { class, arm } */
  transfer: (id, data) => patch(`/students/${id}/transfer`, data),

  /** PATCH /students/:id/attendance  body: { attendance: 0-100 } */
  updateAttendance: (id, val) => patch(`/students/${id}/attendance`, { attendance: val }),

  /** GET /students/export?class=&arm= */
  export: (params = {}) => get(`/students/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),

  /** POST /students/bulk  body: { class, arm, students: [] } */
  bulkCreate: (data) => post('/students/bulk', data),
};

// ─────────────────────────────────────────────────────────────────────────────
//  STAFF
// ─────────────────────────────────────────────────────────────────────────────

export const Staff = {
  /** GET /staff?category=&status=&department=&subject=&search= */
  getAll:   (params = {}) => get(`/staff${buildQuery(params)}`),
  getById:  (id)          => get(`/staff/${id}`),

  /** POST /staff  body: { name, category, position, … } */
  create:   (data)        => post('/staff', data),
  update:   (id, data)    => put(`/staff/${id}`, data),

  /** PATCH /staff/:id/status  body: { status } */
  setStatus: (id, status) => patch(`/staff/${id}/status`, { status }),

  /** PATCH /staff/:id/assign-class  body: { classUnit, arm } */
  assignClass: (id, data) => patch(`/staff/${id}/assign-class`, data),

  /** PATCH /staff/:id/assign-subject  body: { subject_id } */
  assignSubject: (id, data) => patch(`/staff/${id}/assign-subject`, data),

  /** GET /staff/:id/students */
  getStudents: (id) => get(`/staff/${id}/students`),

  /**
   * POST /staff/:id/credentials  body: { credentials: [{name,size,type}] }
   * Note: backend expects JSON credentials array, not FormData.
   */
  uploadCredential: (id, data) => post(`/staff/${id}/credentials`, data),

  /** DELETE /staff/:id/credentials/:credIndex */
  deleteCredential: (id, credIndex) => del(`/staff/${id}/credentials/${credIndex}`),

  delete: (id) => del(`/staff/${id}`),

  /** GET /staff/export */
  export: (params = {}) => get(`/staff/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// Teachers are served by the same /api/staff routes (aliased in server.js)
export const Teachers = Staff;

// ─────────────────────────────────────────────────────────────────────────────
//  SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────

export const Subjects = {
  /** GET /subjects?level=&type=&code=&search= */
  getAll:  (params = {}) => get(`/subjects${buildQuery(params)}`),
  getById: (id)          => get(`/subjects/${id}`),

  /** POST /subjects  body: { name, code, level?, type? } */
  create:  (data)        => post('/subjects', data),
  update:  (id, data)    => put(`/subjects/${id}`, data),
  delete:  (id)          => del(`/subjects/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
//  RESULTS
// ─────────────────────────────────────────────────────────────────────────────

export const Results = {
  /** GET /results?studentId=&class=&arm=&subject=&term=&session= */
  getAll:  (params = {}) => get(`/results${buildQuery(params)}`),
  getById: (id)          => get(`/results/${id}`),

  /**
   * POST /results  body: { studentId, subject, term, session, ca, exam }
   */
  create: (data) => post('/results', data),

  /** PUT /results/:id  body: { ca?, exam? } */
  update: (id, data) => put(`/results/${id}`, data),

  delete: (id) => del(`/results/${id}`),

  /**
   * POST /results/bulk
   * body: { class_id, subject_id, term_id, session_id, results: [{student_id, ca, exam}] }
   */
  bulkCreate: (data) => post('/results/bulk', data),

  /** GET /results/stats?class=&arm=&term=&session= */
  getStats: (params = {}) => get(`/results/stats${buildQuery(params)}`),

  /** GET /results/report-card/:studentId?term=&session= */
  getReportCard: (studentId, term, session) =>
    get(`/results/report-card/${studentId}${buildQuery({ term, session })}`),

  // ── Subject allocations ────────────────────────────────────────────────

  /** GET /results/allocations/class/:class/:arm */
  getClassAllocation: (cls, arm) =>
    get(`/results/allocations/class/${encodeURIComponent(cls)}/${encodeURIComponent(arm)}`),

  /** PUT /results/allocations/class/:class/:arm  body: { subjects[] } */
  setClassAllocation: (cls, arm, subjects) =>
    put(`/results/allocations/class/${encodeURIComponent(cls)}/${encodeURIComponent(arm)}`, { subjects }),

  /** DELETE /results/allocations/class/:class/:arm */
  clearClassAllocation: (cls, arm) =>
    del(`/results/allocations/class/${encodeURIComponent(cls)}/${encodeURIComponent(arm)}`),

  /** GET /results/allocations/student/:studentId */
  getStudentAllocation: (studentId) =>
    get(`/results/allocations/student/${studentId}`),

  /** PUT /results/allocations/student/:studentId  body: { subjects[] } */
  setStudentAllocation: (studentId, subjects) =>
    put(`/results/allocations/student/${studentId}`, { subjects }),

  /** POST /results/allocations/bulk-student  body: { class, arm, subjects[] } */
  bulkSetStudentAllocations: (data) =>
    post('/results/allocations/bulk-student', data),
};

// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE  (FIX #5, #6, #7)
// ─────────────────────────────────────────────────────────────────────────────

export const Attendance = {
  /**
   * GET /attendance?studentId=&class=&arm=&date=&term=&session=&status=
   */
  getAll: (params = {}) => get(`/attendance${buildQuery(params)}`),

  /**
   * POST /attendance  body: { studentId, class, arm, date, term, session, status }
   * FIX #5: endpoint is POST /attendance (not /attendance/mark)
   * Status values: 'p' | 'a' | 'l' | 'e'  (or long form: present/absent/late/excused)
   */
  mark: (data) => post('/attendance', data),

  /**
   * POST /attendance/bulk
   * body: { class, arm, date, term, session, records: [{student_id, status}] }
   * FIX #5: added missing bulk endpoint
   */
  bulkMark: (data) => post('/attendance/bulk', data),

  /** PUT /attendance/:id  body: { status?, remarks? } */
  update: (id, data) => put(`/attendance/${id}`, data),

  /**
   * GET /attendance/summary/:studentId?term=&session=
   * FIX #6: per-student summary (was incorrectly using class-level params)
   */
  getSummary: (studentId, term, session) =>
    get(`/attendance/summary/${studentId}${buildQuery({ term, session })}`),

  /**
   * GET /attendance/class-summary?class=&arm=&term=&session=
   * FIX #6: class-level summary moved to its own method
   */
  getClassSummary: (params = {}) =>
    get(`/attendance/class-summary${buildQuery(params)}`),

  /**
   * GET /attendance/domains?class=&arm=&term=&session=
   * Returns domain assessments for a whole class.
   */
  getClassDomains: (params = {}) =>
    get(`/attendance/domains${buildQuery(params)}`),

  /**
   * PUT /attendance/domains/:studentId?term=&session=
   * body: { cognitive?, affective?, psychomotor?, behavior_0?…behavior_7? }
   */
  setStudentDomains: (studentId, term, session, data) =>
    put(`/attendance/domains/${studentId}${buildQuery({ term, session })}`, data),

  /** GET /attendance/school-days/:term */
  getSchoolDays: (term) => get(`/attendance/school-days/${encodeURIComponent(term)}`),

  /** GET /attendance/export?class=&arm=&term=&session= */
  export: (params = {}) => get(`/attendance/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// ─────────────────────────────────────────────────────────────────────────────
//  NOTICES
// ─────────────────────────────────────────────────────────────────────────────

export const Notices = {
  /** GET /notices?audience= */
  getAll:  (params = {}) => get(`/notices${buildQuery(params)}`),

  /** POST /notices  body: { title, body, audience, pinned } */
  create:  (data)        => post('/notices', data),

  delete:  (id)          => del(`/notices/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export const Admin = {
  /** GET /admin  → returns { data: { key: value, … } } */
  getSettings: () => get('/admin'),

  /**
   * POST /admin  body: { key: value, … }
   * FIX #3: backend route is POST /api/admin (not PUT /api/admin/settings)
   */
  updateSettings: (data) => post('/admin', data),
};

// ─────────────────────────────────────────────────────────────────────────────
//  DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

const API = {
  Auth,
  Classes,
  Students,
  Staff,
  Teachers,
  Subjects,
  Results,
  Attendance,
  Notices,
  Admin,
};

export default API;