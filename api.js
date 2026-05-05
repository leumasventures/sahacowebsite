'use strict';

/**
 * api.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Frontend API client — full school management.
 * ─────────────────────────────────────────────────────
 * • NO localStorage / sessionStorage.
 * • All requests use credentials: 'include' so the
 *   server's HttpOnly JWT cookie is sent automatically.
 * • Covers: Auth, Students, Staff, Teachers, Parents,
 *   Classes, Subjects, Results, Fees, Attendance,
 *   Notices, Sessions/Terms, Reports.
 */

// ── Base config ───────────────────────────────────────────────────────────────

const BASE_URL = window.__ENV__?.API_URL ?? 'https://sacredheartcollegeaba.com/api';

// ── Core request helper ───────────────────────────────────────────────────────

/**
 * Central fetch wrapper.
 * Automatically attaches credentials (HttpOnly cookie),
 * serialises JSON bodies, and throws on non-2xx responses.
 */
async function request(method, path, body = null, isFormData = false) {
  const options = {
    method,
    credentials: 'include',      // HttpOnly cookie goes here — no localStorage
    headers: {},
  };

  if (body !== null) {
    if (isFormData) {
      // Let the browser set multipart/form-data boundary automatically
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, options);

  // Handle 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    const err = new Error(data.message ?? `API error ${res.status}`);
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  return data;
}

const get    = (path)         => request('GET',    path);
const post   = (path, body)   => request('POST',   path, body);
const put    = (path, body)   => request('PUT',    path, body);
const patch  = (path, body)   => request('PATCH',  path, body);
const del    = (path)         => request('DELETE', path);
const upload = (path, form)   => request('POST',   path, form, true);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════════════════

export const Auth = {
  /** POST /auth/login — server sets HttpOnly cookie on success */
  login:          (identifier, password, role) =>
                    post('/auth/login', { identifier, password, role }),

  /** POST /auth/logout — server clears the HttpOnly cookie */
  logout:         ()          => post('/auth/logout'),

  /** GET  /auth/me — returns { user } if the cookie is valid */
  me:             ()          => get('/auth/me'),

  /** POST /auth/refresh — rotate the JWT (if using refresh tokens) */
  refresh:        ()          => post('/auth/refresh'),

  /** POST /auth/change-password */
  changePassword: (current_password, new_password) =>
                    post('/auth/change-password', { current_password, new_password }),

  /** POST /auth/forgot-password */
  forgotPassword: (email)     => post('/auth/forgot-password', { email }),

  /** POST /auth/reset-password */
  resetPassword:  (token, new_password) =>
                    post('/auth/reset-password', { token, new_password }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SESSIONS & TERMS
// ═══════════════════════════════════════════════════════════════════════════════

export const Sessions = {
  getAll:       ()           => get('/sessions'),
  getById:      (id)         => get(`/sessions/${id}`),
  create:       (data)       => post('/sessions', data),
  update:       (id, data)   => put(`/sessions/${id}`, data),
  setActive:    (id)         => patch(`/sessions/${id}/activate`),
  delete:       (id)         => del(`/sessions/${id}`),
};

export const Terms = {
  getAll:       (sessionId)  => get(`/sessions/${sessionId}/terms`),
  getById:      (id)         => get(`/terms/${id}`),
  create:       (data)       => post('/terms', data),
  update:       (id, data)   => put(`/terms/${id}`, data),
  setActive:    (id)         => patch(`/terms/${id}/activate`),
  delete:       (id)         => del(`/terms/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Students = {
  /**
   * GET /students
   * Query params: { classId, sessionId, search, page, limit }
   */
  getAll:       (params = {}) => get(`/students?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/students/${id}`),
  getProfile:   ()            => get('/students/me'),           // for student portal

  /** POST /students — admin only */
  create:       (data)        => post('/students', data),

  /** PUT /students/:id */
  update:       (id, data)    => put(`/students/${id}`, data),

  /** PATCH /students/:id/status — activate | suspend | graduate | withdraw */
  setStatus:    (id, status)  => patch(`/students/${id}/status`, { status }),

  /** DELETE /students/:id — soft delete */
  delete:       (id)          => del(`/students/${id}`),

  /** POST /students/:id/photo */
  uploadPhoto:  (id, formData) => upload(`/students/${id}/photo`, formData),

  /** GET /students/:id/results */
  getResults:   (id, params = {}) =>
                  get(`/students/${id}/results?${new URLSearchParams(params)}`),

  /** GET /students/:id/fees */
  getFees:      (id, params = {}) =>
                  get(`/students/${id}/fees?${new URLSearchParams(params)}`),

  /** GET /students/:id/attendance */
  getAttendance:(id, params = {}) =>
                  get(`/students/${id}/attendance?${new URLSearchParams(params)}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STAFF (non-teaching)
// ═══════════════════════════════════════════════════════════════════════════════

export const Staff = {
  getAll:       (params = {}) => get(`/staff?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/staff/${id}`),
  create:       (data)        => post('/staff', data),
  update:       (id, data)    => put(`/staff/${id}`, data),
  setStatus:    (id, status)  => patch(`/staff/${id}/status`, { status }),
  delete:       (id)          => del(`/staff/${id}`),
  uploadPhoto:  (id, formData) => upload(`/staff/${id}/photo`, formData),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TEACHERS
// ═══════════════════════════════════════════════════════════════════════════════

export const Teachers = {
  getAll:       (params = {}) => get(`/teachers?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/teachers/${id}`),
  getProfile:   ()            => get('/teachers/me'),
  create:       (data)        => post('/teachers', data),
  update:       (id, data)    => put(`/teachers/${id}`, data),
  setStatus:    (id, status)  => patch(`/teachers/${id}/status`, { status }),
  delete:       (id)          => del(`/teachers/${id}`),
  uploadPhoto:  (id, formData) => upload(`/teachers/${id}/photo`, formData),

  /** GET /teachers/:id/subjects — subjects assigned to a teacher */
  getSubjects:  (id)          => get(`/teachers/${id}/subjects`),

  /** GET /teachers/:id/classes — classes a teacher handles */
  getClasses:   (id)          => get(`/teachers/${id}/classes`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PARENTS / GUARDIANS
// ═══════════════════════════════════════════════════════════════════════════════

export const Parents = {
  getAll:       (params = {}) => get(`/parents?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/parents/${id}`),
  getProfile:   ()            => get('/parents/me'),
  create:       (data)        => post('/parents', data),
  update:       (id, data)    => put(`/parents/${id}`, data),
  delete:       (id)          => del(`/parents/${id}`),

  /** GET /parents/:id/children — list of linked students */
  getChildren:  (id)          => get(`/parents/${id}/children`),

  /** POST /parents/:id/link-child */
  linkChild:    (id, studentId) =>
                  post(`/parents/${id}/link-child`, { student_id: studentId }),

  unlinkChild:  (id, studentId) =>
                  post(`/parents/${id}/unlink-child`, { student_id: studentId }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export const Classes = {
  getAll:       (params = {}) => get(`/classes?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/classes/${id}`),
  create:       (data)        => post('/classes', data),
  update:       (id, data)    => put(`/classes/${id}`, data),
  delete:       (id)          => del(`/classes/${id}`),

  /** GET /classes/:id/students */
  getStudents:  (id)          => get(`/classes/${id}/students`),

  /** GET /classes/:id/subjects */
  getSubjects:  (id)          => get(`/classes/${id}/subjects`),

  /** PATCH /classes/:id/assign-teacher — assign form teacher */
  assignTeacher:(id, teacherId) =>
                  patch(`/classes/${id}/assign-teacher`, { teacher_id: teacherId }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Subjects = {
  getAll:       (params = {}) => get(`/subjects?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/subjects/${id}`),
  create:       (data)        => post('/subjects', data),
  update:       (id, data)    => put(`/subjects/${id}`, data),
  delete:       (id)          => del(`/subjects/${id}`),

  /** POST /subjects/:id/assign-teacher */
  assignTeacher:(id, data)    => post(`/subjects/${id}/assign-teacher`, data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RESULTS / GRADES
// ═══════════════════════════════════════════════════════════════════════════════

export const Results = {
  /**
   * GET /results
   * params: { studentId, classId, subjectId, termId, sessionId }
   */
  getAll:       (params = {}) => get(`/results?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/results/${id}`),

  /** POST /results — enter a single result */
  create:       (data)        => post('/results', data),

  /** PUT /results/:id */
  update:       (id, data)    => put(`/results/${id}`, data),

  /** DELETE /results/:id */
  delete:       (id)          => del(`/results/${id}`),

  /**
   * POST /results/bulk — batch result entry.
   * Body: { term_id, class_id, subject_id, results: [{ student_id, ca, exam }] }
   */
  bulkCreate:   (data)        => post('/results/bulk', data),

  /**
   * PUT /results/bulk — batch update.
   * Body: { results: [{ id, ca, exam }] }
   */
  bulkUpdate:   (data)        => put('/results/bulk', data),

  /**
   * GET /results/report-card?studentId=&termId=
   * Returns the full formatted report card data.
   */
  getReportCard:(studentId, termId) =>
                  get(`/results/report-card?studentId=${studentId}&termId=${termId}`),

  /**
   * GET /results/class-sheet?classId=&subjectId=&termId=
   * Returns the full mark-sheet for a class/subject.
   */
  getClassSheet:(classId, subjectId, termId) =>
                  get(`/results/class-sheet?classId=${classId}&subjectId=${subjectId}&termId=${termId}`),

  /** GET /results/term-summary?classId=&termId= */
  getTermSummary:(classId, termId) =>
                  get(`/results/term-summary?classId=${classId}&termId=${termId}`),

  /** POST /results/publish — make results visible to students/parents */
  publish:      (termId, classId) =>
                  post('/results/publish', { term_id: termId, class_id: classId }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FEES & PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Fees = {
  /** GET /fees/structures — list all fee structures */
  getStructures:(params = {}) => get(`/fees/structures?${new URLSearchParams(params)}`),
  createStructure:(data)      => post('/fees/structures', data),
  updateStructure:(id, data)  => put(`/fees/structures/${id}`, data),
  deleteStructure:(id)        => del(`/fees/structures/${id}`),

  /**
   * GET /fees/invoices
   * params: { studentId, sessionId, termId, status }
   */
  getInvoices:  (params = {}) => get(`/fees/invoices?${new URLSearchParams(params)}`),
  getInvoice:   (id)          => get(`/fees/invoices/${id}`),

  /** POST /fees/invoices/generate — generate invoices for a class/term */
  generateInvoices:(data)     => post('/fees/invoices/generate', data),

  /**
   * GET /fees/payments
   * params: { studentId, sessionId, termId }
   */
  getPayments:  (params = {}) => get(`/fees/payments?${new URLSearchParams(params)}`),
  getPayment:   (id)          => get(`/fees/payments/${id}`),

  /** POST /fees/payments — record a manual payment */
  recordPayment:(data)        => post('/fees/payments', data),

  /** PATCH /fees/payments/:id/verify — mark as verified */
  verifyPayment:(id)          => patch(`/fees/payments/${id}/verify`),

  /** DELETE /fees/payments/:id — reverse an erroneous payment */
  reversePayment:(id)         => del(`/fees/payments/${id}`),

  /** GET /fees/outstanding?classId=&termId= */
  getOutstanding:(params = {}) =>
                  get(`/fees/outstanding?${new URLSearchParams(params)}`),

  /** GET /fees/summary?sessionId= */
  getSummary:   (sessionId)   => get(`/fees/summary?sessionId=${sessionId}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const Attendance = {
  /**
   * GET /attendance
   * params: { classId, studentId, date, termId }
   */
  getAll:       (params = {}) => get(`/attendance?${new URLSearchParams(params)}`),

  /**
   * POST /attendance/mark — mark attendance for a full class.
   * Body: { class_id, date, records: [{ student_id, status }] }
   * status: 'present' | 'absent' | 'late' | 'excused'
   */
  mark:         (data)        => post('/attendance/mark', data),

  /** PUT /attendance/:id — correct a single attendance record */
  update:       (id, data)    => put(`/attendance/${id}`, data),

  /**
   * GET /attendance/summary?classId=&termId=
   * Returns attendance percentage per student.
   */
  getSummary:   (classId, termId) =>
                  get(`/attendance/summary?classId=${classId}&termId=${termId}`),

  /** GET /attendance/student?studentId=&termId= */
  getForStudent:(studentId, termId) =>
                  get(`/attendance/student?studentId=${studentId}&termId=${termId}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTICES / ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Notices = {
  /**
   * GET /notices
   * params: { audience, page, limit }
   * audience: 'all' | 'admin' | 'teacher' | 'student' | 'parent'
   */
  getAll:       (params = {}) => get(`/notices?${new URLSearchParams(params)}`),
  getById:      (id)          => get(`/notices/${id}`),

  /** POST /notices */
  create:       (data)        => post('/notices', data),

  /** PUT /notices/:id */
  update:       (id, data)    => put(`/notices/${id}`, data),

  /** DELETE /notices/:id */
  delete:       (id)          => del(`/notices/${id}`),

  /** PATCH /notices/:id/pin */
  pin:          (id)          => patch(`/notices/${id}/pin`),
  unpin:        (id)          => patch(`/notices/${id}/unpin`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS (admin)
// ═══════════════════════════════════════════════════════════════════════════════

export const Reports = {
  /** GET /reports/enrolment?sessionId= */
  enrolment:    (sessionId)   => get(`/reports/enrolment?sessionId=${sessionId}`),

  /** GET /reports/results-summary?termId= */
  resultsSummary:(termId)     => get(`/reports/results-summary?termId=${termId}`),

  /** GET /reports/fee-collection?termId= */
  feeCollection:(termId)      => get(`/reports/fee-collection?termId=${termId}`),

  /** GET /reports/attendance-summary?termId= */
  attendanceSummary:(termId)  => get(`/reports/attendance-summary?termId=${termId}`),

  /** GET /reports/top-students?termId=&limit= */
  topStudents:  (termId, limit = 10) =>
                  get(`/reports/top-students?termId=${termId}&limit=${limit}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const Admin = {
  /** GET /admin/users */
  getUsers:     (params = {}) => get(`/admin/users?${new URLSearchParams(params)}`),

  /** POST /admin/users — create any user type */
  createUser:   (data)        => post('/admin/users', data),

  /** PATCH /admin/users/:id/role */
  changeRole:   (id, role)    => patch(`/admin/users/${id}/role`, { role }),

  /** PATCH /admin/users/:id/reset-password — admin force-reset */
  resetUserPassword:(id)      => patch(`/admin/users/${id}/reset-password`),

  /** PATCH /admin/users/:id/status */
  setUserStatus:(id, status)  => patch(`/admin/users/${id}/status`, { status }),

  /** GET /admin/audit-log */
  getAuditLog:  (params = {}) => get(`/admin/audit-log?${new URLSearchParams(params)}`),

  /** GET /admin/settings */
  getSettings:  ()            => get('/admin/settings'),

  /** PUT /admin/settings */
  updateSettings:(data)       => put('/admin/settings', data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CONVENIENCE — default export bundles everything
// ═══════════════════════════════════════════════════════════════════════════════

const API = {
  Auth,
  Sessions,
  Terms,
  Students,
  Staff,
  Teachers,
  Parents,
  Classes,
  Subjects,
  Results,
  Fees,
  Attendance,
  Notices,
  Reports,
  Admin,
};

export default API;