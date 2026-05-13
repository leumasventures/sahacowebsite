'use strict';

/**
 * api.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Frontend API client — full school management system.
 * ─────────────────────────────────────────────────────────────────────────────
 * Base URL  : https://sacredheartcollegeaba.com/api
 * Auth      : HttpOnly JWT cookie (credentials: 'include') — no localStorage
 * Database  : u156099858_shcaba_db (MySQL via backend PHP/Node)
 *
 * Modules:
 *   Auth · Sessions · Terms · Admissions · Students · Staff · Teachers
 *   Parents · Classes · Subjects · Results · Fees · Attendance
 *   Notices · Reports · Admin
 *
 * Usage:
 *   import API from './api.js';
 *   const students = await API.Students.getAll({ classId: 3 });
 *
 *   or named:
 *   import { Students, Admissions } from './api.js';
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_URL = 'https://sacredheartcollegeaba.com/api';
/**
 * Default request timeout in milliseconds.
 * Long-running exports (bulk Excel, PDF reports) get their own higher limit.
 */
const DEFAULT_TIMEOUT_MS = 15_000;
const EXPORT_TIMEOUT_MS  = 60_000;

// ═══════════════════════════════════════════════════════════════════════════════
//  CORE REQUEST HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * request(method, path, body?, isFormData?, timeoutMs?)
 *
 * Central fetch wrapper:
 * • Attaches credentials (HttpOnly JWT cookie) automatically.
 * • Serialises JSON bodies; passes FormData untouched.
 * • Supports AbortController timeout.
 * • Throws a structured ApiError on non-2xx responses.
 * • Returns null for 204 No Content.
 */
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
      options.body = body; // browser sets Content-Type + boundary
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
      const err     = new Error(data.message ?? `API error ${res.status}`);
      err.status    = res.status;
      err.code      = data.code ?? null;
      err.errors    = data.errors ?? null; // validation error array
      err.data      = data;
      throw err;
    }

    return data;

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const timeout = new Error(`Request timed out: ${method} ${path}`);
      timeout.status = 408;
      throw timeout;
    }
    throw err;
  }
}

// Shorthand verbs
const get    = (path, timeoutMs)         => request('GET',    path, null,  false, timeoutMs);
const post   = (path, body)              => request('POST',   path, body,  false);
const put    = (path, body)              => request('PUT',    path, body,  false);
const patch  = (path, body)              => request('PATCH',  path, body,  false);
const del    = (path)                    => request('DELETE', path, null,  false);
const upload = (path, form, timeoutMs)   => request('POST',   path, form,  true,  timeoutMs ?? DEFAULT_TIMEOUT_MS);

/**
 * buildQuery(params)
 * Converts a plain object to a URLSearchParams string, stripping nulls/undefineds.
 */
function buildQuery(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════════════════

export const Auth = {
  /**
   * POST /auth/login
   * Server sets an HttpOnly JWT cookie on success.
   * @param {string} identifier — email or admission number
   * @param {string} password
   * @param {string} role       — 'admin' | 'teacher' | 'student' | 'parent'
   */
  login: (identifier, password, role) =>
    post('/auth/login', { identifier, password, role }),

  /** POST /auth/logout — server clears the HttpOnly cookie */
  logout: () => post('/auth/logout'),

  /**
   * GET /auth/me
   * Returns { user } when the cookie is valid.
   * Use this on every page load to restore session state.
   */
  me: () => get('/auth/me'),

  /** POST /auth/refresh — rotate the JWT (sliding session) */
  refresh: () => post('/auth/refresh'),

  /** POST /auth/change-password */
  changePassword: (current_password, new_password) =>
    post('/auth/change-password', { current_password, new_password }),

  /** POST /auth/forgot-password */
  forgotPassword: (email) => post('/auth/forgot-password', { email }),

  /** POST /auth/reset-password */
  resetPassword: (token, new_password) =>
    post('/auth/reset-password', { token, new_password }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SESSIONS & TERMS
// ═══════════════════════════════════════════════════════════════════════════════

export const Sessions = {
  /** GET /sessions — list all academic sessions */
  getAll:    ()          => get('/sessions'),
  getById:   (id)        => get(`/sessions/${id}`),
  create:    (data)      => post('/sessions', data),
  update:    (id, data)  => put(`/sessions/${id}`, data),
  /** PATCH /sessions/:id/activate — set as current session */
  setActive: (id)        => patch(`/sessions/${id}/activate`),
  delete:    (id)        => del(`/sessions/${id}`),
};

export const Terms = {
  /** GET /sessions/:sessionId/terms */
  getAll:    (sessionId) => get(`/sessions/${sessionId}/terms`),
  getById:   (id)        => get(`/terms/${id}`),
  create:    (data)      => post('/terms', data),
  update:    (id, data)  => put(`/terms/${id}`, data),
  /** PATCH /terms/:id/activate — set as current term */
  setActive: (id)        => patch(`/terms/${id}/activate`),
  delete:    (id)        => del(`/terms/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMISSIONS
//
//  Full lifecycle:
//    Register → Approve/Reject → Enroll (creates student record)
//
//  Key endpoints:
//    POST /admissions            — new application (regForm.html)
//    GET  /admissions            — list with filters (admissionList.html)
//    PATCH /admissions/:id/approve
//    PATCH /admissions/:id/reject
//    POST  /admissions/:id/enroll — enroll.html calls this; backend creates
//                                   a student record and marks status=Enrolled
//    GET  /admissions/stats      — counts by status for dashboard widgets
// ═══════════════════════════════════════════════════════════════════════════════

export const Admissions = {
  /**
   * GET /admissions
   * params: { status, classApply, session, search, page, limit }
   * status: 'Pending' | 'Approved' | 'Enrolled' | 'Rejected' | 'Draft'
   */
  getAll: (params = {}) => get(`/admissions${buildQuery(params)}`),

  /** GET /admissions/:id — single admission record */
  getById: (id) => get(`/admissions/${id}`),

  /**
   * POST /admissions — submit a new application (regForm.html)
   * Body mirrors the regForm fields:
   * {
   *   first_name, last_name, middle_name, gender, dob,
   *   blood_group, genotype, allergies, med_conditions,
   *   state_origin, lga, address,
   *   class_apply, preferred_arm, acad_session, entry_term,
   *   prev_school, last_class,
   *   guardian_last, guardian_first, relation,
   *   guardian_phone, guardian_email, guardian_addr
   * }
   */
  create: (data) => post('/admissions', data),

  /**
   * PUT /admissions/:id — update an existing application (draft or pending)
   */
  update: (id, data) => put(`/admissions/${id}`, data),

  /**
   * PATCH /admissions/:id/approve
   * Marks status = 'Approved'. Optional body: { notes }
   */
  approve: (id, notes = '') => patch(`/admissions/${id}/approve`, { notes }),

  /**
   * PATCH /admissions/:id/reject
   * Marks status = 'Rejected'. Body: { reason }
   */
  reject: (id, reason = '') => patch(`/admissions/${id}/reject`, { reason }),

  /**
   * POST /admissions/:id/enroll
   * The main action in enroll.html.
   * Backend:
   *   1. Verifies status === 'Approved'
   *   2. Creates a row in `students` table
   *   3. Sets admission status = 'Enrolled'
   *   4. Returns { student_id, adm_no, message }
   *
   * Body: { class_id, arm, session_id }
   * (class_id and arm can override the preferred_arm on the admission)
   */
  enroll: (id, data) => post(`/admissions/${id}/enroll`, data),

  /**
   * POST /admissions/bulk-enroll
   * Enroll multiple approved students at once (enroll.html batch action).
   * Body: { enrollments: [{ admission_id, class_id, arm }] }
   * Returns: { enrolled: [...], skipped: [...], errors: [...] }
   */
  bulkEnroll: (enrollments) => post('/admissions/bulk-enroll', { enrollments }),

  /**
   * DELETE /admissions/:id — hard delete (Admin only)
   */
  delete: (id) => del(`/admissions/${id}`),

  /**
   * GET /admissions/stats
   * Returns { total, pending, approved, enrolled, rejected, draft }
   * Used by the stats cards in admissionList.html and dashboard.
   */
  getStats: (session = '') => get(`/admissions/stats${buildQuery({ session })}`),

  /**
   * GET /admissions/export?format=xlsx&status=&session=
   * Returns a binary Excel file. Caller should handle as a blob download.
   */
  export: (params = {}) =>
    get(`/admissions/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),

  /**
   * POST /admissions/:id/photo — upload passport photograph
   */
  uploadPhoto: (id, formData) => upload(`/admissions/${id}/photo`, formData),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Students = {
  /**
   * GET /students
   * params: { classId, armId, sessionId, search, gender, status, page, limit }
   */
  getAll: (params = {}) => get(`/students${buildQuery(params)}`),

  /** GET /students/:id */
  getById: (id) => get(`/students/${id}`),

  /** GET /students/me — student portal: own profile */
  getProfile: () => get('/students/me'),

  /**
   * POST /students — manually create a student record (Admin only).
   * Normal flow uses Admissions.enroll() instead.
   */
  create: (data) => post('/students', data),

  /** PUT /students/:id */
  update: (id, data) => put(`/students/${id}`, data),

  /**
   * PATCH /students/:id/status
   * status: 'active' | 'suspended' | 'graduated' | 'withdrawn' | 'transferred'
   */
  setStatus: (id, status) => patch(`/students/${id}/status`, { status }),

  /** DELETE /students/:id — soft delete */
  delete: (id) => del(`/students/${id}`),

  /** POST /students/:id/photo */
  uploadPhoto: (id, formData) => upload(`/students/${id}/photo`, formData),

  /**
   * GET /students/:id/results
   * params: { termId, sessionId, subjectId }
   */
  getResults: (id, params = {}) => get(`/students/${id}/results${buildQuery(params)}`),

  /**
   * GET /students/:id/fees
   * params: { termId, sessionId, status }
   */
  getFees: (id, params = {}) => get(`/students/${id}/fees${buildQuery(params)}`),

  /**
   * GET /students/:id/attendance
   * params: { termId, sessionId }
   */
  getAttendance: (id, params = {}) =>
    get(`/students/${id}/attendance${buildQuery(params)}`),

  /**
   * GET /students/:id/report-card?termId=
   */
  getReportCard: (id, termId) =>
    get(`/students/${id}/report-card${buildQuery({ termId })}`),

  /**
   * PATCH /students/:id/transfer
   * Body: { new_class_id, new_arm, reason }
   */
  transfer: (id, data) => patch(`/students/${id}/transfer`, data),

  /**
   * GET /students/export?format=xlsx&classId=&sessionId=
   */
  export: (params = {}) =>
    get(`/students/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STAFF (non-teaching)
// ═══════════════════════════════════════════════════════════════════════════════

export const Staff = {
  /**
   * GET /staff
   * params: { category, department, status, search, page, limit }
   * category: 'Academic' | 'Administrative' | 'Support' | 'Leadership'
   */
  getAll:      (params = {}) => get(`/staff${buildQuery(params)}`),
  getById:     (id)          => get(`/staff/${id}`),
  create:      (data)        => post('/staff', data),
  update:      (id, data)    => put(`/staff/${id}`, data),
  /** status: 'Active' | 'On Leave' | 'Suspended' | 'Resigned' */
  setStatus:   (id, status)  => patch(`/staff/${id}/status`, { status }),
  delete:      (id)          => del(`/staff/${id}`),
  uploadPhoto: (id, formData) => upload(`/staff/${id}/photo`, formData),

  /**
   * POST /staff/:id/credentials — upload a credential document
   * formData must contain: file, type (e.g. 'Certificate', 'NYSC')
   */
  uploadCredential: (id, formData) =>
    upload(`/staff/${id}/credentials`, formData),

  /** DELETE /staff/:id/credentials/:credId */
  deleteCredential: (id, credId) => del(`/staff/${id}/credentials/${credId}`),

  /** GET /staff/export?format=xlsx&category= */
  export: (params = {}) => get(`/staff/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TEACHERS
// ═══════════════════════════════════════════════════════════════════════════════

export const Teachers = {
  /**
   * GET /teachers
   * params: { classId, subjectId, status, search, page, limit }
   */
  getAll:      (params = {}) => get(`/teachers${buildQuery(params)}`),
  getById:     (id)          => get(`/teachers/${id}`),
  /** GET /teachers/me — teacher portal: own profile */
  getProfile:  ()            => get('/teachers/me'),
  create:      (data)        => post('/teachers', data),
  update:      (id, data)    => put(`/teachers/${id}`, data),
  setStatus:   (id, status)  => patch(`/teachers/${id}/status`, { status }),
  delete:      (id)          => del(`/teachers/${id}`),
  uploadPhoto: (id, formData) => upload(`/teachers/${id}/photo`, formData),

  /** GET /teachers/:id/subjects */
  getSubjects:  (id) => get(`/teachers/${id}/subjects`),

  /** GET /teachers/:id/classes */
  getClasses:   (id) => get(`/teachers/${id}/classes`),

  /**
   * PATCH /teachers/:id/assign-class
   * Body: { class_id, arm }
   */
  assignClass:  (id, data) => patch(`/teachers/${id}/assign-class`, data),

  /**
   * PATCH /teachers/:id/assign-subject
   * Body: { subject_id, class_id }
   */
  assignSubject: (id, data) => patch(`/teachers/${id}/assign-subject`, data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PARENTS / GUARDIANS
// ═══════════════════════════════════════════════════════════════════════════════

export const Parents = {
  /**
   * GET /parents
   * params: { search, page, limit }
   */
  getAll:       (params = {}) => get(`/parents${buildQuery(params)}`),
  getById:      (id)          => get(`/parents/${id}`),
  /** GET /parents/me — parent portal: own profile */
  getProfile:   ()            => get('/parents/me'),
  create:       (data)        => post('/parents', data),
  update:       (id, data)    => put(`/parents/${id}`, data),
  delete:       (id)          => del(`/parents/${id}`),

  /** GET /parents/:id/children */
  getChildren:  (id)          => get(`/parents/${id}/children`),

  /** POST /parents/:id/link-child — Body: { student_id } */
  linkChild:    (id, studentId) =>
    post(`/parents/${id}/link-child`, { student_id: studentId }),

  /** POST /parents/:id/unlink-child — Body: { student_id } */
  unlinkChild:  (id, studentId) =>
    post(`/parents/${id}/unlink-child`, { student_id: studentId }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CLASSES & ARMS
// ═══════════════════════════════════════════════════════════════════════════════

export const Classes = {
  /**
   * GET /classes
   * params: { level, sessionId, search }
   * level: 'Junior' | 'Senior' | 'Primary' | 'Nursery' | 'Day Care'
   */
  getAll:    (params = {}) => get(`/classes${buildQuery(params)}`),
  getById:   (id)          => get(`/classes/${id}`),

  /**
   * POST /classes
   * Body: { name, level, arms: ['A','B','C'], session_id }
   */
  create:    (data)        => post('/classes', data),
  update:    (id, data)    => put(`/classes/${id}`, data),
  delete:    (id)          => del(`/classes/${id}`),

  /** GET /classes/:id/students — params: { sessionId } */
  getStudents:   (id, params = {}) =>
    get(`/classes/${id}/students${buildQuery(params)}`),

  /** GET /classes/:id/subjects */
  getSubjects:   (id)      => get(`/classes/${id}/subjects`),

  /**
   * PATCH /classes/:id/assign-teacher
   * Body: { teacher_id, arm? }
   */
  assignTeacher: (id, data) => patch(`/classes/${id}/assign-teacher`, data),

  // ── Arms ────────────────────────────────────────────────────────────────────

  /**
   * GET /classes/:id/arms
   * Returns array of arm names for this class.
   */
  getArms:   (id)          => get(`/classes/${id}/arms`),

  /**
   * POST /classes/:id/arms — Body: { arm: 'D' } or { arms: ['D','E'] }
   */
  addArm:    (id, data)    => post(`/classes/${id}/arms`, data),

  /**
   * PATCH /classes/:id/arms/:arm — rename an arm
   * Body: { new_name: 'D' }
   */
  renameArm: (id, arm, data) => patch(`/classes/${id}/arms/${arm}`, data),

  /** DELETE /classes/:id/arms/:arm */
  deleteArm: (id, arm)     => del(`/classes/${id}/arms/${arm}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Subjects = {
  /**
   * GET /subjects
   * params: { level, type, search, page, limit }
   */
  getAll:        (params = {}) => get(`/subjects${buildQuery(params)}`),
  getById:       (id)          => get(`/subjects/${id}`),
  create:        (data)        => post('/subjects', data),
  update:        (id, data)    => put(`/subjects/${id}`, data),
  delete:        (id)          => del(`/subjects/${id}`),

  /**
   * POST /subjects/:id/assign-teacher
   * Body: { teacher_id, class_id }
   */
  assignTeacher: (id, data)    => post(`/subjects/${id}/assign-teacher`, data),

  /**
   * POST /subjects/:id/assign-class
   * Body: { class_id, arm? }
   */
  assignClass:   (id, data)    => post(`/subjects/${id}/assign-class`, data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RESULTS / GRADES
// ═══════════════════════════════════════════════════════════════════════════════

export const Results = {
  /**
   * GET /results
   * params: { studentId, classId, subjectId, termId, sessionId, page, limit }
   */
  getAll: (params = {}) => get(`/results${buildQuery(params)}`),
  getById: (id)          => get(`/results/${id}`),

  /** POST /results — enter a single result */
  create: (data) => post('/results', data),

  /** PUT /results/:id */
  update: (id, data) => put(`/results/${id}`, data),

  /** DELETE /results/:id */
  delete: (id) => del(`/results/${id}`),

  /**
   * POST /results/bulk
   * Body: { term_id, class_id, subject_id, results: [{ student_id, ca, exam }] }
   * Returns: { saved, errors }
   */
  bulkCreate: (data) => post('/results/bulk', data),

  /**
   * PUT /results/bulk
   * Body: { results: [{ id, ca, exam }] }
   */
  bulkUpdate: (data) => put('/results/bulk', data),

  /**
   * GET /results/report-card?studentId=&termId=
   */
  getReportCard: (studentId, termId) =>
    get(`/results/report-card${buildQuery({ studentId, termId })}`),

  /**
   * GET /results/class-sheet?classId=&subjectId=&termId=
   */
  getClassSheet: (classId, subjectId, termId) =>
    get(`/results/class-sheet${buildQuery({ classId, subjectId, termId })}`),

  /**
   * GET /results/term-summary?classId=&termId=
   * Returns per-student average, position, total score.
   */
  getTermSummary: (classId, termId) =>
    get(`/results/term-summary${buildQuery({ classId, termId })}`),

  /**
   * POST /results/publish
   * Body: { term_id, class_id } — makes results visible to students/parents
   */
  publish: (termId, classId) =>
    post('/results/publish', { term_id: termId, class_id: classId }),

  /**
   * GET /results/export?format=xlsx&classId=&termId=
   */
  export: (params = {}) =>
    get(`/results/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FEES & PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Fees = {
  // ── Structures ─────────────────────────────────────────────────────────────

  /**
   * GET /fees/structures
   * params: { sessionId, termId, classId, level }
   */
  getStructures:    (params = {}) => get(`/fees/structures${buildQuery(params)}`),
  createStructure:  (data)        => post('/fees/structures', data),
  updateStructure:  (id, data)    => put(`/fees/structures/${id}`, data),
  deleteStructure:  (id)          => del(`/fees/structures/${id}`),

  // ── Invoices ────────────────────────────────────────────────────────────────

  /**
   * GET /fees/invoices
   * params: { studentId, sessionId, termId, status, page, limit }
   * status: 'unpaid' | 'partial' | 'paid' | 'overdue'
   */
  getInvoices:      (params = {}) => get(`/fees/invoices${buildQuery(params)}`),
  getInvoice:       (id)          => get(`/fees/invoices/${id}`),

  /**
   * POST /fees/invoices/generate
   * Body: { class_id?, session_id, term_id, fee_structure_id }
   * Generates invoices for all students in a class (or all classes).
   */
  generateInvoices: (data)        => post('/fees/invoices/generate', data),

  // ── Payments ────────────────────────────────────────────────────────────────

  /**
   * GET /fees/payments
   * params: { studentId, sessionId, termId, method, page, limit }
   */
  getPayments:      (params = {}) => get(`/fees/payments${buildQuery(params)}`),
  getPayment:       (id)          => get(`/fees/payments/${id}`),

  /**
   * POST /fees/payments — record a manual/cash payment
   * Body: { invoice_id, amount, method, reference, date, note }
   * method: 'cash' | 'bank_transfer' | 'online' | 'cheque'
   */
  recordPayment:    (data)        => post('/fees/payments', data),

  /** PATCH /fees/payments/:id/verify — mark as bank-confirmed */
  verifyPayment:    (id)          => patch(`/fees/payments/${id}/verify`),

  /** DELETE /fees/payments/:id — reverse an erroneous payment */
  reversePayment:   (id)          => del(`/fees/payments/${id}`),

  // ── Reports ─────────────────────────────────────────────────────────────────

  /**
   * GET /fees/outstanding
   * params: { classId, termId, sessionId }
   */
  getOutstanding: (params = {}) => get(`/fees/outstanding${buildQuery(params)}`),

  /**
   * GET /fees/summary?sessionId=
   * Returns { total_billed, total_collected, total_outstanding }
   */
  getSummary: (sessionId) => get(`/fees/summary${buildQuery({ sessionId })}`),

  /**
   * GET /fees/export?format=xlsx&sessionId=&termId=
   */
  export: (params = {}) => get(`/fees/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const Attendance = {
  /**
   * GET /attendance
   * params: { classId, studentId, date, termId, sessionId, page, limit }
   */
  getAll: (params = {}) => get(`/attendance${buildQuery(params)}`),

  /**
   * POST /attendance/mark
   * Body: {
   *   class_id, date, term_id,
   *   records: [{ student_id, status }]
   * }
   * status: 'present' | 'absent' | 'late' | 'excused'
   */
  mark: (data) => post('/attendance/mark', data),

  /** PUT /attendance/:id — correct a single attendance record */
  update: (id, data) => put(`/attendance/${id}`, data),

  /**
   * GET /attendance/summary?classId=&termId=
   * Returns per-student attendance percentage.
   */
  getSummary: (classId, termId) =>
    get(`/attendance/summary${buildQuery({ classId, termId })}`),

  /**
   * GET /attendance/student?studentId=&termId=
   * Full daily attendance history for one student.
   */
  getForStudent: (studentId, termId) =>
    get(`/attendance/student${buildQuery({ studentId, termId })}`),

  /**
   * GET /attendance/export?format=xlsx&classId=&termId=
   */
  export: (params = {}) =>
    get(`/attendance/export${buildQuery(params)}`, EXPORT_TIMEOUT_MS),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTICES / ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const Notices = {
  /**
   * GET /notices
   * params: { audience, pinned, page, limit }
   * audience: 'all' | 'admin' | 'teacher' | 'student' | 'parent'
   */
  getAll:  (params = {}) => get(`/notices${buildQuery(params)}`),
  getById: (id)           => get(`/notices/${id}`),

  /**
   * POST /notices
   * Body: { title, body, audience, pinned }
   */
  create:  (data)         => post('/notices', data),

  /** PUT /notices/:id */
  update:  (id, data)     => put(`/notices/${id}`, data),

  /** DELETE /notices/:id */
  delete:  (id)           => del(`/notices/${id}`),

  /** PATCH /notices/:id/pin */
  pin:     (id)           => patch(`/notices/${id}/pin`),

  /** PATCH /notices/:id/unpin */
  unpin:   (id)           => patch(`/notices/${id}/unpin`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS (admin)
// ═══════════════════════════════════════════════════════════════════════════════

export const Reports = {
  /**
   * GET /reports/enrolment?sessionId=
   * Class-by-class enrollment count for a session.
   */
  enrolment: (sessionId) =>
    get(`/reports/enrolment${buildQuery({ sessionId })}`),

  /**
   * GET /reports/admissions?sessionId=&status=
   * Admission funnel stats.
   */
  admissions: (params = {}) =>
    get(`/reports/admissions${buildQuery(params)}`),

  /**
   * GET /reports/results-summary?termId=
   */
  resultsSummary: (termId) =>
    get(`/reports/results-summary${buildQuery({ termId })}`),

  /**
   * GET /reports/fee-collection?termId=
   */
  feeCollection: (termId) =>
    get(`/reports/fee-collection${buildQuery({ termId })}`),

  /**
   * GET /reports/attendance-summary?termId=
   */
  attendanceSummary: (termId) =>
    get(`/reports/attendance-summary${buildQuery({ termId })}`),

  /**
   * GET /reports/top-students?termId=&limit=10
   */
  topStudents: (termId, limit = 10) =>
    get(`/reports/top-students${buildQuery({ termId, limit })}`),

  /**
   * GET /reports/dashboard — aggregated counts for the admin dashboard
   * Returns: { students, teachers, staff, pending_admissions,
   *            approved_admissions, enrolled_this_term, avg_attendance,
   *            fee_collection_rate }
   */
  dashboard: () => get('/reports/dashboard'),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — USER MANAGEMENT & SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const Admin = {
  /**
   * GET /admin/users
   * params: { role, status, search, page, limit }
   */
  getUsers:         (params = {}) => get(`/admin/users${buildQuery(params)}`),

  /**
   * POST /admin/users — create any user type
   * Body: { name, email, role, password, ... role-specific fields }
   */
  createUser:       (data)        => post('/admin/users', data),

  /**
   * PATCH /admin/users/:id/role
   * Body: { role }
   */
  changeRole:       (id, role)    => patch(`/admin/users/${id}/role`, { role }),

  /**
   * PATCH /admin/users/:id/reset-password — force password reset
   */
  resetUserPassword:(id)          => patch(`/admin/users/${id}/reset-password`),

  /**
   * PATCH /admin/users/:id/status
   * Body: { status } — 'active' | 'suspended' | 'disabled'
   */
  setUserStatus:    (id, status)  =>
    patch(`/admin/users/${id}/status`, { status }),

  /**
   * GET /admin/audit-log
   * params: { userId, action, from, to, page, limit }
   */
  getAuditLog:      (params = {}) =>
    get(`/admin/audit-log${buildQuery(params)}`),

  /**
   * GET /admin/settings — all system settings as key-value object
   */
  getSettings:      ()            => get('/admin/settings'),

  /**
   * PUT /admin/settings
   * Body: { [key]: value, ... }
   */
  updateSettings:   (data)        => put('/admin/settings', data),

  /**
   * GET /admin/backup — trigger a database backup
   * Returns a signed URL to download the backup file.
   */
  requestBackup:    ()            => get('/admin/backup', EXPORT_TIMEOUT_MS),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CONVENIENCE — default export bundles everything
// ═══════════════════════════════════════════════════════════════════════════════

const API = {
  Auth,
  Sessions,
  Terms,
  Admissions,
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