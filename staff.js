'use strict';
/**
 * staff.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Staff & Teachers
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
function renderStaff(filter = '') {
  if (!priv.canManage()) { accessDeniedPage('staff'); return; }

  // Support both App.data.staff and legacy App.data.teachers
  if (!App.data.staff) App.data.staff = App.data.teachers || [];

  const section = document.getElementById('staff') || document.getElementById('teachers');
  if (!section) return;

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
      <h2 style="margin:0;">👥 Staff (${App.data.staff.length})</h2>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <button onclick="smExport()" style="${btnStyle('secondary','sm')}">⬇ Export</button>
        <button onclick="openStaffModal()" style="${btnStyle('primary')}">+ Add Staff</button>
      </div>
    </div>
    <div id="sm-stats-bar" class="sm-stats"></div>
    <div id="sm-category-tabs" class="sm-tabs"></div>
    <div class="sm-filters">
      <div class="sm-search-wrap">
        <span class="sm-search-icon">🔍</span>
        <input type="text" id="sm-search" placeholder="Search by name, position, subject…" value="${filter}" oninput="smApplyFilters()">
      </div>
      <select class="sm-filter-sel" id="sm-filter-status" onchange="smApplyFilters()">
        <option value="">All Status</option>
        <option>Active</option><option>On Leave</option><option>Suspended</option><option>Resigned</option>
      </select>
      <select class="sm-filter-sel" id="sm-filter-dept" onchange="smApplyFilters()">
        <option value="">All Departments</option>
        ${STAFF_DEPARTMENTS.map(d => `<option>${d}</option>`).join('')}
      </select>
    </div>
    <div class="sm-table-wrap">
      <table class="sm-table">
        <thead><tr>
          <th>ID</th><th>Name</th><th>Position</th><th>Category</th>
          <th>Department</th><th>Class/Unit</th><th>Credentials</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody id="sm-tbody"></tbody>
      </table>
    </div>
  `;

  smRenderTabs();
  smRenderStats();
  smRenderTable();
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function smRenderStats() {
  const s = App.data.staff;
  const bar = document.getElementById('sm-stats-bar');
  if (!bar) return;
  bar.innerHTML = [
    { num: s.length, label: 'Total Staff', color: '#4f8ef7' },
    { num: s.filter(x => x.status === 'Active').length, label: 'Active', color: '#10b981' },
    { num: s.filter(x => x.category === 'Academic').length, label: 'Academic', color: '#7c3aed' },
    { num: s.filter(x => x.category === 'Administrative').length, label: 'Admin', color: '#f59e0b' },
    { num: s.filter(x => x.category === 'Support').length, label: 'Support', color: '#06b6d4' },
  ].map(item => `
    <div class="sm-stat">
      <div class="sm-stat-num" style="color:${item.color}">${item.num}</div>
      <div class="sm-stat-label">${item.label}</div>
    </div>`).join('');
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
function smRenderTabs() {
  const el = document.getElementById('sm-category-tabs');
  if (!el) return;
  el.innerHTML = STAFF_CATEGORIES.map(c => `
    <button class="sm-tab ${_activeStaffCategory === c ? 'active' : ''}" onclick="smSetCategory('${c}')">${c}</button>
  `).join('');
}

function smSetCategory(c) {
  _activeStaffCategory = c;
  smRenderTabs();
  smRenderTable();
}

// ── Filters ────────────────────────────────────────────────────────────────────
function smApplyFilters() { smRenderTable(); }

function smGetFiltered() {
  const q = (document.getElementById('sm-search')?.value || '').toLowerCase();
  const status = document.getElementById('sm-filter-status')?.value || '';
  const dept = document.getElementById('sm-filter-dept')?.value || '';
  return (App.data.staff || []).filter(s => {
    const catOk = _activeStaffCategory === 'All' || s.category === _activeStaffCategory;
    const statusOk = !status || s.status === status;
    const deptOk = !dept || s.department === dept;
    const qOk = !q || [s.name, s.position, s.subject, s.id, s.department].some(f => (f || '').toLowerCase().includes(q));
    return catOk && statusOk && deptOk && qOk;
  });
}

// ── Table ──────────────────────────────────────────────────────────────────────
function smRenderTable() {
  const tbody = document.getElementById('sm-tbody');
  if (!tbody) return;
  const list = smGetFiltered();
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="sm-empty"><div class="sm-empty-icon">🔍</div>No staff found</div></td></tr>`;
    return;
  }
  const catColors = { Academic: 'blue', Administrative: 'purple', Support: 'gray', Leadership: 'success' };
  tbody.innerHTML = list.map(s => {
    const badgeClass = `sm-badge-${STAFF_STATUS_COLORS[s.status] || 'gray'}`;
    const credCount = (s.credentials || []).length;
    const color = smAvatarColor(s.id);
    return `
      <tr>
        <td style="font-family:monospace;font-size:.75rem;color:#4f8ef7">${s.id}</td>
        <td>
          <div class="sm-name-cell">
            <div class="sm-avatar" style="background:linear-gradient(135deg,${color},${color}88)">${smGetInitials(s.name)}</div>
            <div>
              <div style="font-weight:600;font-size:.83rem">${s.name}</div>
              <div style="font-size:.7rem;color:#8892a4">${s.subject || s.department || ''}</div>
            </div>
          </div>
        </td>
        <td style="font-size:.82rem;font-weight:500">${s.position || '-'}</td>
        <td><span class="sm-badge sm-badge-${catColors[s.category] || 'gray'}">${s.category || '-'}</span></td>
        <td style="font-size:.8rem;color:#8892a4">${s.department || '-'}</td>
        <td style="font-size:.8rem">
          ${(() => {
            const assignments = Array.isArray(s.assignments) && s.assignments.length
              ? s.assignments
              : (s.classUnit || s.class) ? [{ cls: s.classUnit || s.class, arm: s.arm || '', subject: s.subject || '' }] : [];
            if (!assignments.length) return '<span style="color:#4a5568">—</span>';
            return assignments.slice(0,2).map(a =>
              `<div style="font-size:.73rem;background:rgba(79,142,247,.1);border-radius:4px;padding:.1rem .4rem;margin-bottom:.2rem;display:inline-block;margin-right:.2rem;">${a.subject||''} ${a.cls||''} ${a.arm && a.arm!=='N/A' ? a.arm : ''}</div>`
            ).join('') + (assignments.length > 2 ? `<div style="font-size:.7rem;color:#8892a4">+${assignments.length-2} more</div>` : '');
          })()}
          ${(() => {
            const tasks = Array.isArray(s.tasks) && s.tasks.length ? s.tasks : [];
            return tasks.length ? `<div style="font-size:.7rem;color:#10b981;margin-top:.2rem">🗒 ${tasks.length} task${tasks.length>1?'s':''}</div>` : '';
          })()}
        </td>
        <td>
          ${credCount > 0
            ? `<span class="sm-cred-badge" onclick="smViewCredentials('${s.id}')">📎 ${credCount} file${credCount > 1 ? 's' : ''}</span>`
            : `<span style="color:#4a5568;font-size:.75rem">None</span>`}
        </td>
        <td><span class="sm-badge ${badgeClass}">${s.status}</span></td>
        <td>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            <button onclick="smViewProfile('${s.id}')" style="${btnStyle('secondary', 'sm')}">View</button>
            <button onclick="openStaffModal('${s.id}')" style="${btnStyle('secondary', 'sm')}">Edit</button>
            <button onclick="smDeleteStaff('${s.id}')" style="${btnStyle('danger', 'sm')}">Del</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ── View Profile ───────────────────────────────────────────────────────────────
window.smViewProfile = function(id) {
  const s = App.data.staff.find(x => x.id === id);
  if (!s) return;
  const credHTML = (s.credentials || []).map(c => `
    <div class="sm-cred-item">
      <span>${smFileIcon(c.name)}</span>
      <span class="ci-name">${c.name}</span>
      <span class="ci-size">${c.size}</span>
      <span style="color:#8892a4;font-size:.7rem">${c.type || ''}</span>
    </div>`).join('');

  // Build assignments HTML
  const assignments = Array.isArray(s.assignments) && s.assignments.length
    ? s.assignments
    : (s.classUnit || s.class || s.subject)
      ? [{ subject: s.subject || '—', cls: s.classUnit || s.class || '—', arm: s.arm || '' }]
      : [];

  const assignHTML = assignments.length
    ? assignments.map(a => `
        <div style="display:flex;align-items:center;gap:.5rem;background:rgba(79,142,247,.1);border-radius:6px;padding:.4rem .7rem;margin-bottom:.35rem;">
          <span style="font-size:.8rem;font-weight:600;color:#4f8ef7">📖 ${a.subject || 'N/A'}</span>
          <span style="color:#4a5568;font-size:.75rem">→</span>
          <span style="font-size:.8rem;font-weight:600;color:#10b981">${a.cls || a.class || 'N/A'} ${a.arm && a.arm !== 'N/A' ? a.arm : ''}</span>
        </div>`).join('')
    : '<span style="color:#4a5568;font-size:.78rem">No class assignments</span>';

  // Build tasks HTML
  const tasks = Array.isArray(s.tasks) ? s.tasks : (s.task ? [s.task] : []);
  const tasksHTML = tasks.length
    ? tasks.map(t => `
        <div style="display:flex;align-items:center;gap:.4rem;background:rgba(16,185,129,.1);border-radius:5px;padding:.3rem .6rem;margin-bottom:.3rem;">
          <span style="font-size:.78rem;font-weight:500;color:#10b981;">🗒 ${t}</span>
        </div>`).join('')
    : '<span style="color:#4a5568;font-size:.78rem">No tasks assigned</span>';

  showModal(`
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div class="sm-avatar" style="width:56px;height:56px;font-size:1.1rem;background:linear-gradient(135deg,${smAvatarColor(s.id)},${smAvatarColor(s.id)}88)">${smGetInitials(s.name)}</div>
      <div>
        <h3 style="margin:0">${s.name}</h3>
        <div style="color:#8892a4;font-size:.82rem;margin-top:.2rem">${s.position || ''} · ${s.department || ''}</div>
        <span class="sm-badge sm-badge-${STAFF_STATUS_COLORS[s.status] || 'gray'}" style="margin-top:.4rem;display:inline-block">${s.status}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:.83rem;">
      ${[
        ['Staff ID', s.id], ['Category', s.category],
        ['Phone', s.phone || '-'], ['Email', s.email || '-'],
        ['Gender', s.gender || '-'], ['Qualification', s.qualification || '-'],
        ['Experience', s.experience || '-'], ['Date Joined', s.dateJoined || '-'],
      ].map(([k, v]) => `
        <div style="background:rgba(0,0,0,.2);border-radius:7px;padding:.65rem .85rem;">
          <div style="color:#4a5568;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem">${k}</div>
          <div style="font-weight:500">${v}</div>
        </div>`).join('')}
    </div>

    <div style="margin-top:1.1rem;">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#4f8ef7;margin-bottom:.5rem">📚 Subject & Class Assignments (${assignments.length})</div>
      <div>${assignHTML}</div>
    </div>

    <div style="margin-top:1rem;">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#10b981;margin-bottom:.5rem">🗒 Tasks & Duties (${tasks.length})</div>
      <div>${tasksHTML}</div>
    </div>

    ${s.notes ? `<div style="margin-top:1rem;padding:.75rem;border-radius:7px;background:rgba(0,0,0,.2);font-size:.82rem;color:#8892a4"><strong style="color:#e2e8f0">Notes:</strong> ${s.notes}</div>` : ''}
    ${credHTML ? `<div style="margin-top:1rem;"><div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#4f8ef7;margin-bottom:.6rem">📎 Credentials</div><div class="sm-cred-list">${credHTML}</div></div>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.5rem;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Close</button>
      <button onclick="closeModal();openStaffModal('${s.id}')" style="${btnStyle('primary')}">Edit Profile</button>
    </div>
  `);
};

// ── View Credentials ───────────────────────────────────────────────────────────
window.smViewCredentials = function(id) {
  const s = App.data.staff.find(x => x.id === id);
  if (!s) return;
  showModal(`
    <h3 style="margin:0 0 1.2rem">📎 Credentials — ${s.name}</h3>
    ${(s.credentials || []).length
      ? `<div class="sm-cred-list">${s.credentials.map(c => `
          <div class="sm-cred-item">
            <span>${smFileIcon(c.name)}</span>
            <span class="ci-name">${c.name}</span>
            <span class="ci-size">${c.size}</span>
            <span style="color:#8892a4;font-size:.7rem">${c.type || ''}</span>
          </div>`).join('')}</div>`
      : `<div class="sm-empty"><div class="sm-empty-icon">📂</div>No credentials uploaded</div>`}
    <div style="display:flex;justify-content:flex-end;margin-top:1.2rem;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Close</button>
    </div>
  `);
};

// ── Add / Edit Modal ───────────────────────────────────────────────────────────
window.openStaffModal = function(id = null) {
  if (!priv.canManage() && denyAccess()) return;
  _currentEditStaffId = id;
  _pendingStaffFiles = [];
  const s = id ? App.data.staff.find(x => x.id === id) : null;
  const isEdit = !!s;

  const posOpts = Object.entries(STAFF_POSITIONS)
    .map(([grp, pos]) => `<optgroup label="${grp}">${pos.map(p => `<option ${s?.position === p ? 'selected' : ''}>${p}</option>`).join('')}</optgroup>`)
    .join('');
  const deptOpts = STAFF_DEPARTMENTS.map(d => `<option ${s?.department === d ? 'selected' : ''}>${d}</option>`).join('');
  // Build subject options from App.data.subjects (live DB list)
  const liveSubjects = (App?.data?.subjects || []).map(s => s.name || s).filter(Boolean);
  const subjectList  = liveSubjects.length ? liveSubjects : STAFF_SUBJECTS;
  const subjOpts = ['N/A', ...subjectList].map(x =>
    `<option ${(s?.subject || 'N/A') === x ? 'selected' : ''}>${x}</option>`
  ).join('');

  // Build class options from App.data.classes (live DB list)
  const liveClasses = (App?.data?.classes || []).map(c => c.name || c).filter(Boolean);
  const classList   = liveClasses.length ? liveClasses : STAFF_CLASSES;
  const classOpts = ['N/A', ...classList].map(c =>
    `<option ${(s?.classUnit || s?.class || 'N/A') === c ? 'selected' : ''}>${c}</option>`
  ).join('');
  const catOpts = ['Academic', 'Administrative', 'Support', 'Leadership'].map(c => `<option ${s?.category === c ? 'selected' : ''}>${c}</option>`).join('');
  const qualOpts = ['SSCE/WAEC', 'OND', 'HND', 'B.Sc/B.Ed/B.A', 'PGDE', 'M.Sc/M.Ed/M.A', 'MBA', 'Ph.D', 'Other'].map(q => `<option ${s?.qualification === q ? 'selected' : ''}>${q}</option>`).join('');
  const credTypeOpts = ['Certificate', 'Degree', 'NYSC', 'NIS Letter', 'ID Card', 'Appointment Letter', 'Reference Letter', 'Medical Certificate', 'TRCN Certificate', 'Other'].map(t => `<option>${t}</option>`).join('');

  const existingCredsHTML = (s?.credentials || []).map((c, i) => `
    <div class="sm-cred-item" id="sm-existing-cred-${i}">
      <span>${smFileIcon(c.name)}</span>
      <span class="ci-name">${c.name}</span>
      <span class="ci-size">${c.size}</span>
      <span style="color:#8892a4;font-size:.7rem">${c.type || ''}</span>
      <button class="ci-del" onclick="smRemoveExistingCred(${i},'${id}')">✕</button>
    </div>`).join('');

  showModal(`
    <h3 style="margin:0 0 1.5rem">${isEdit ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}</h3>
    <div class="sm-form-grid">

      <div class="sm-form-section sm-span2"><span>Personal Information</span></div>

      <div class="sm-form-group">
        <label>Full Name *</label>
        <input id="sf-name" value="${s?.name || ''}" placeholder="e.g. Mrs. Adaeze Okonkwo" required>
      </div>
      <div class="sm-form-group">
        <label>Gender</label>
        <select id="sf-gender">
          <option ${s?.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option ${s?.gender === 'Female' ? 'selected' : ''}>Female</option>
          <option ${s?.gender === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="sm-form-group">
        <label>Phone</label>
        <input id="sf-phone" value="${s?.phone || ''}" placeholder="080XXXXXXXX">
      </div>
      <div class="sm-form-group">
        <label>Email</label>
        <input id="sf-email" type="email" value="${s?.email || ''}" placeholder="staff@school.edu.ng">
      </div>
      <div class="sm-form-group">
        <label>Date Joined</label>
        <input id="sf-joined" type="date" value="${s?.dateJoined || ''}">
      </div>
      <div class="sm-form-group">
        <label>Status</label>
        <select id="sf-status">
          ${['Active', 'On Leave', 'Suspended', 'Resigned'].map(x => `<option ${s?.status === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </div>

      <div class="sm-form-section sm-span2"><span>Role & Assignment</span></div>

      <div class="sm-form-group">
        <label>Category *</label>
        <select id="sf-category">${catOpts}</select>
      </div>
      <div class="sm-form-group">
        <label>Position *</label>
        <select id="sf-position">${posOpts}</select>
      </div>
      <div class="sm-form-group">
        <label>Department</label>
        <select id="sf-department"><option value="">-- Select --</option>${deptOpts}</select>
      </div>

      <div class="sm-form-section sm-span2"><span>📚 Subject & Class Assignments (can assign multiple)</span></div>

      <!-- Multi-assignment builder -->
      <div class="sm-span2">
        <div id="sm-assignments-list" style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:.75rem;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:.5rem;align-items:end;background:rgba(79,142,247,.06);border:1px dashed rgba(79,142,247,.3);border-radius:8px;padding:.75rem;">
          <div>
            <label style="font-size:.7rem;color:#8892a4;display:block;margin-bottom:.25rem;">Subject</label>
            <select id="sf-new-subject" style="width:100%;padding:.4rem .6rem;background:var(--bg,#0f1117);border:1px solid var(--border,#2a2f42);border-radius:6px;color:var(--text,#e2e8f0);font-size:.8rem;">${subjOpts}</select>
          </div>
          <div>
            <label style="font-size:.7rem;color:#8892a4;display:block;margin-bottom:.25rem;">Class</label>
            <select id="sf-new-class" style="width:100%;padding:.4rem .6rem;background:var(--bg,#0f1117);border:1px solid var(--border,#2a2f42);border-radius:6px;color:var(--text,#e2e8f0);font-size:.8rem;">${classOpts}</select>
          </div>
          <div>
            <label style="font-size:.7rem;color:#8892a4;display:block;margin-bottom:.25rem;">Arm</label>
            <select id="sf-new-arm" style="width:100%;padding:.4rem .6rem;background:var(--bg,#0f1117);border:1px solid var(--border,#2a2f42);border-radius:6px;color:var(--text,#e2e8f0);font-size:.8rem;">
              ${['N/A','A','B','C','D','E'].map(a=>`<option>${a}</option>`).join('')}
            </select>
          </div>
          <button type="button" onclick="smAddAssignment()" style="padding:.4rem .8rem;background:#4f8ef7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:600;white-space:nowrap;height:32px;align-self:end;">+ Add</button>
        </div>
        <div style="margin-top:.5rem;">
          <label style="font-size:.7rem;color:#8892a4;display:block;margin-bottom:.25rem;">🗒 Task / Duty (optional — add multiple)</label>
          <div id="sm-tasks-list" style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.4rem;"></div>
          <div style="display:flex;gap:.5rem;">
            <input id="sf-new-task" placeholder="e.g. Form Teacher JS2A, Sports Coordinator, Labour Prefect Master…" style="flex:1;padding:.4rem .7rem;background:var(--bg,#0f1117);border:1px solid var(--border,#2a2f42);border-radius:6px;color:var(--text,#e2e8f0);font-size:.8rem;">
            <button type="button" onclick="smAddTask()" style="padding:.4rem .8rem;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:600;">+ Add</button>
          </div>
        </div>
      </div>

      <div class="sm-form-section sm-span2"><span>Qualifications & Experience</span></div>

      <div class="sm-form-group">
        <label>Highest Qualification</label>
        <select id="sf-qual">${qualOpts}</select>
      </div>
      <div class="sm-form-group">
        <label>Years of Experience</label>
        <input id="sf-exp" value="${s?.experience || ''}" placeholder="e.g. 5 years">
      </div>
      <div class="sm-form-group sm-span2">
        <label>Notes / Remarks</label>
        <textarea id="sf-notes">${s?.notes || ''}</textarea>
      </div>

      <div class="sm-form-section sm-span2"><span>Credential Uploads</span></div>

      <div class="sm-span2">
        <div style="margin-bottom:.6rem">
          <select id="sf-cred-type" style="padding:.45rem .75rem;background:var(--bg,#0f1117);border:1px solid var(--border,#2a2f42);border-radius:7px;color:var(--text,#e2e8f0);font-size:.8rem;font-family:inherit;outline:none;">
            ${credTypeOpts}
          </select>
        </div>
        <div class="sm-upload-zone" id="sm-upload-zone">
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="smHandleFileSelect(event)">
          <div style="font-size:1.6rem;margin-bottom:.4rem">📎</div>
          <div style="font-size:.8rem;color:#8892a4">Drop files or click to upload</div>
          <div style="font-size:.7rem;color:#4a5568;margin-top:.2rem">PDF, JPG, PNG, DOC — max 5MB each</div>
        </div>
        <div id="sm-pending-files" class="sm-cred-list"></div>
        ${existingCredsHTML ? `
          <div style="margin-top:.6rem">
            <div style="font-size:.7rem;color:#8892a4;margin-bottom:.4rem">Existing credentials:</div>
            <div class="sm-cred-list">${existingCredsHTML}</div>
          </div>` : ''}
      </div>

      <div class="sm-span2" style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="smSubmitForm()" style="${btnStyle('primary')}">${isEdit ? '💾 Save Changes' : '✅ Add Staff'}</button>
      </div>
    </div>
  `);

  // Drag-and-drop
  const zone = document.getElementById('sm-upload-zone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); smHandleFileDrop(e); });
  }

  // Init multi-assignment state
  smInitAssignments(s);
};

// ── File Handling ──────────────────────────────────────────────────────────────
window.smHandleFileSelect = function(e) { smProcessFiles(Array.from(e.target.files)); };
window.smHandleFileDrop = function(e) { smProcessFiles(Array.from(e.dataTransfer.files)); };

function smProcessFiles(files) {
  const type = document.getElementById('sf-cred-type')?.value || 'Document';
  files.forEach(f => {
    if (f.size > 5 * 1024 * 1024) { toast(`${f.name} exceeds 5MB limit`, 'error'); return; }
    _pendingStaffFiles.push({ name: f.name, size: smFormatSize(f.size), type, file: f });
  });
  smRenderPendingFiles();
}

function smRenderPendingFiles() {
  const container = document.getElementById('sm-pending-files');
  if (!container) return;
  container.innerHTML = _pendingStaffFiles.map((f, i) => `
    <div class="sm-cred-item">
      <span>${smFileIcon(f.name)}</span>
      <span class="ci-name">${f.name}</span>
      <span class="ci-size">${f.size}</span>
      <span style="color:#8892a4;font-size:.7rem">${f.type}</span>
      <button class="ci-del" onclick="smRemovePendingFile(${i})">✕</button>
    </div>`).join('');
}

window.smRemovePendingFile = function(i) { _pendingStaffFiles.splice(i, 1); smRenderPendingFiles(); };

window.smRemoveExistingCred = function(i, staffId) {
  const s = App.data.staff.find(x => x.id === staffId);
  if (!s) return;
  s.credentials.splice(i, 1);
  document.getElementById(`sm-existing-cred-${i}`)?.remove();
  toast('Credential removed', 'warning');
};

// ── Multi-assignment & task state ─────────────────────────────────────────────
let _staffAssignments = [];  // [{subject, class, arm}]
let _staffTasks       = [];  // ['Form Teacher JS2A', 'Sports Coordinator', ...]

function smInitAssignments(s) {
  // Load existing assignments from staff object
  _staffAssignments = [];
  _staffTasks       = [];

  if (s) {
    // Support both new format (assignments array) and legacy single fields
    if (Array.isArray(s.assignments) && s.assignments.length) {
      _staffAssignments = s.assignments.map(a => ({ subject: a.subject || '', cls: a.class || a.cls || '', arm: a.arm || 'N/A' }));
    } else if (s.classUnit || s.class || s.subject) {
      // Migrate legacy single assignment
      _staffAssignments = [{ subject: s.subject || 'N/A', cls: s.classUnit || s.class || 'N/A', arm: s.arm || 'N/A' }];
    }
    // Load tasks
    if (Array.isArray(s.tasks)) _staffTasks = [...s.tasks];
    else if (s.task) _staffTasks = [s.task];
  }

  smRenderAssignments();
  smRenderTasks();
}

window.smAddAssignment = function() {
  const subject = document.getElementById('sf-new-subject')?.value || 'N/A';
  const cls     = document.getElementById('sf-new-class')?.value   || 'N/A';
  const arm     = document.getElementById('sf-new-arm')?.value     || 'N/A';
  // Prevent exact duplicates
  const exists = _staffAssignments.some(a => a.subject === subject && a.cls === cls && a.arm === arm);
  if (exists) { toast('This exact assignment already exists', 'warning'); return; }
  _staffAssignments.push({ subject, cls, arm });
  smRenderAssignments();
  toast('Assignment added', 'success');
};

window.smRemoveAssignment = function(i) {
  _staffAssignments.splice(i, 1);
  smRenderAssignments();
};

function smRenderAssignments() {
  const el = document.getElementById('sm-assignments-list');
  if (!el) return;
  if (!_staffAssignments.length) {
    el.innerHTML = `<div style="font-size:.75rem;color:#4a5568;padding:.4rem;font-style:italic;">No assignments yet — add subject/class/arm combinations below.</div>`;
    return;
  }
  el.innerHTML = _staffAssignments.map((a, i) => `
    <div style="display:flex;align-items:center;gap:.5rem;background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.2);border-radius:7px;padding:.45rem .75rem;">
      <span style="font-size:.8rem;font-weight:600;color:#4f8ef7">📖 ${a.subject || 'N/A'}</span>
      <span style="color:#4a5568;font-size:.75rem">→</span>
      <span style="font-size:.8rem;font-weight:600;color:#10b981">${a.cls || 'N/A'} ${a.arm !== 'N/A' ? a.arm : ''}</span>
      <button onclick="smRemoveAssignment(${i})" style="margin-left:auto;background:rgba(220,38,38,.15);color:#dc2626;border:none;border-radius:4px;cursor:pointer;padding:.1rem .4rem;font-size:.75rem;font-weight:700;">✕</button>
    </div>`).join('');
}

window.smAddTask = function() {
  const val = document.getElementById('sf-new-task')?.value.trim();
  if (!val) return;
  if (_staffTasks.includes(val)) { toast('Task already added', 'warning'); return; }
  _staffTasks.push(val);
  if (document.getElementById('sf-new-task')) document.getElementById('sf-new-task').value = '';
  smRenderTasks();
};

window.smRemoveTask = function(i) {
  _staffTasks.splice(i, 1);
  smRenderTasks();
};

function smRenderTasks() {
  const el = document.getElementById('sm-tasks-list');
  if (!el) return;
  el.innerHTML = _staffTasks.map((t, i) => `
    <div style="display:flex;align-items:center;gap:.5rem;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:6px;padding:.35rem .65rem;">
      <span style="font-size:.78rem;font-weight:500;color:#10b981;">🗒 ${t}</span>
      <button onclick="smRemoveTask(${i})" style="margin-left:auto;background:rgba(220,38,38,.15);color:#dc2626;border:none;border-radius:4px;cursor:pointer;padding:.1rem .35rem;font-size:.72rem;font-weight:700;">✕</button>
    </div>`).join('');
}

// ── Submit ─────────────────────────────────────────────────────────────────────
window.smSubmitForm = async function() {
  const name = document.getElementById('sf-name')?.value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  const category = document.getElementById('sf-category')?.value;
  const position = document.getElementById('sf-position')?.value;
  if (!category) { toast('Category is required', 'error'); return; }
  if (!position) { toast('Position is required', 'error'); return; }

  // Build primary class/subject from first assignment (for backend legacy compat)
  const firstAssign = _staffAssignments[0];
  const primaryClass   = firstAssign?.cls     !== 'N/A' ? firstAssign?.cls     : null;
  const primaryArm     = firstAssign?.arm     !== 'N/A' ? firstAssign?.arm     : null;
  const primarySubject = firstAssign?.subject !== 'N/A' ? firstAssign?.subject : null;

  const data = {
    name,
    gender:        document.getElementById('sf-gender')?.value,
    phone:         document.getElementById('sf-phone')?.value     || null,
    email:         document.getElementById('sf-email')?.value     || null,
    date_joined:   document.getElementById('sf-joined')?.value    || null,
    status:        document.getElementById('sf-status')?.value,
    category,
    position,
    department:    document.getElementById('sf-department')?.value || null,
    // Primary (legacy compat)
    subject:       primarySubject,
    // All assignments + tasks stored as JSON fields
    assignments:   _staffAssignments,
    tasks:         _staffTasks,
    qualification: document.getElementById('sf-qual')?.value      || null,
    experience:    document.getElementById('sf-exp')?.value       || null,
    notes:         document.getElementById('sf-notes')?.value     || null,
  };

  const newCreds = _pendingStaffFiles.map(f => ({ name: f.name, size: f.size, type: f.type }));

  try {
    let savedStaff;
    if (_currentEditStaffId) {
      const resp = await Staff.update(_currentEditStaffId, data);
      savedStaff = resp.data || resp;

      // Update primary class assignment
      if (primaryClass) {
        await Staff.assignClass(_currentEditStaffId, { classUnit: primaryClass, arm: primaryArm }).catch(() => {});
      }

      // Update in-memory cache
      const cached = App.data.staff.find(x => x.id === _currentEditStaffId);
      if (cached) {
        Object.assign(cached, data, {
          dateJoined:  data.date_joined,
          classUnit:   primaryClass || '',
          class:       primaryClass || '',
          arm:         primaryArm  || '',
          assignments: _staffAssignments,
          tasks:       _staffTasks,
        });
      }
      toast('Staff member updated!', 'success');
    } else {
      const resp = await Staff.create(data);
      savedStaff = resp.data || resp;

      if (primaryClass) {
        await Staff.assignClass(savedStaff.id, { classUnit: primaryClass, arm: primaryArm }).catch(() => {});
        savedStaff.classUnit     = primaryClass;
        savedStaff.class         = primaryClass;
        savedStaff.assignedClass = primaryClass;
        savedStaff.arm           = primaryArm || '';
        savedStaff.assignedArm   = savedStaff.arm;
      }

      savedStaff.dateJoined  = savedStaff.dateJoined || data.date_joined || '';
      savedStaff.credentials = newCreds;
      savedStaff.assignments = _staffAssignments;
      savedStaff.tasks       = _staffTasks;
      savedStaff.role        = 'Staff';
      App.data.staff.push(savedStaff);
      toast('Staff member added!', 'success');
    }

    if (newCreds.length && savedStaff?.id) {
      await Staff.uploadCredential(savedStaff.id, { credentials: newCreds }).catch(e => {
        toast('Staff saved but credential upload failed: ' + e.message, 'warning');
      });
    }

    closeModal();
    renderStaff();

  } catch (err) {
    toast('Error saving staff: ' + (err.message || 'Unknown error'), 'error');
  }
};

// ── Delete ─────────────────────────────────────────────────────────────────────
window.smDeleteStaff = async function(id) {
  if (!priv.canManage() && denyAccess()) return;
  if (!confirmDlg('Delete this staff member? This cannot be undone.')) return;
  try {
    await Staff.delete(id);
    App.data.staff = App.data.staff.filter(s => s.id !== id);
    renderStaff();
    toast('Staff member deleted.', 'warning');
  } catch (err) {
    toast('Error deleting staff: ' + (err.message || 'Unknown error'), 'error');
  }
};

// ── Export CSV ─────────────────────────────────────────────────────────────────
window.smExport = function() {
  const rows = [['ID', 'Name', 'Category', 'Position', 'Department', 'Class/Unit', 'Subject', 'Phone', 'Email', 'Status', 'Qualification', 'Experience', 'Date Joined']];
  (App.data.staff || []).forEach(s => rows.push([
    s.id, s.name, s.category, s.position, s.department,
    s.classUnit || s.class, s.subject, s.phone, s.email,
    s.status, s.qualification, s.experience, s.dateJoined
  ]));
  const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'staff_list.csv';
  a.click();
  toast('Exported staff list as CSV', 'success');
};

// ── Legacy compatibility (maps old renderTeachers calls) ───────────────────────
window.renderTeachers = function(filter = '') { renderStaff(filter); };
window.openTeacherModal = function(t = null) { openStaffModal(t?.id || null); };
window.editTeacher = function(id) { openStaffModal(id); };
window.deleteTeacher = function(id) { smDeleteStaff(id); };

/* ─────────────────────────────────────────
   11. SUBJECTS  (Admin only)
───────────────────────────────────────── */