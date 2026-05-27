'use strict';
/**
 * users.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * User Management + Signup Requests
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
/* USER MANAGEMENT  (Admin only)
═══════════════════════════════════════════════════════════════════════════ */
function renderUsers() {
  if (!priv.isAdmin()) { accessDeniedPage('users'); return; }
  const section = document.getElementById('users');
  if (!section) return;

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:1rem;">
      <h2 style="margin:0;">👤 User Management</h2>
      <button onclick="openUserModal()" style="${btnStyle('primary')}">+ Add User</button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;">
      <button id="usr-tab-users"    onclick="switchUserTab('users')"    style="${btnStyle('primary','sm')}">👥 Portal Users</button>
      <button id="usr-tab-requests" onclick="switchUserTab('requests')" style="${btnStyle('secondary','sm')}">📬 Signup Requests <span id="signup-req-badge" style="display:none;background:#ef4444;color:#fff;border-radius:9999px;padding:.1rem .5rem;font-size:.7rem;margin-left:.3rem;"></span></button>
    </div>

    <div id="usr-tab-users-panel">
    <!-- Filters -->
    <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
      <select id="usr-filter-role" onchange="loadUsers()" style="${selectStyle()}">
        <option value="">All Roles</option>
        <option>Admin</option><option>Teacher</option><option>Student</option><option>Parent</option><option>Staff</option><option>Bursar</option>
      </select>
      <select id="usr-filter-active" onchange="loadUsers()" style="${selectStyle()}">
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
      <input id="usr-filter-search" placeholder="Search name or email…" oninput="loadUsers()"
             style="${inputStyle()};min-width:200px;">
    </div>

    <!-- Users table -->
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">NAME</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">EMAIL</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ROLE</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">LINKED TO</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">STATUS</th>
            <th style="padding:.75rem 1rem;text-align:center;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTIONS</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          <tr><td colspan="6" style="text-align:center;padding:2rem;color:#9ca3af;">Loading users…</td></tr>
        </tbody>
      </table>
    </div>
    </div>

    <div id="usr-tab-requests-panel" style="display:none;">
      <div id="signup-requests-panel">Loading…</div>
    </div>`;

  loadUsers();
  loadSignupRequestBadge();
}

window.switchUserTab = function(tab) {
  document.getElementById('usr-tab-users-panel').style.display    = tab === 'users'    ? '' : 'none';
  document.getElementById('usr-tab-requests-panel').style.display = tab === 'requests' ? '' : 'none';
  document.getElementById('usr-tab-users').style.cssText    = tab === 'users'    ? btnStyle('primary','sm')    : btnStyle('secondary','sm');
  document.getElementById('usr-tab-requests').style.cssText = tab === 'requests' ? btnStyle('primary','sm')    : btnStyle('secondary','sm');
  if (tab === 'requests') loadSignupRequests();
};
async function loadSignupRequestBadge() {
  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const res   = await fetch(`${BASE}/auth/signup-requests?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include',
    });
    const data  = await res.json();
    const count = data.pending || 0;
    const badge = document.getElementById('signup-req-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  } catch(e) {}
}

async function loadSignupRequests() {
  const panel  = document.getElementById('signup-requests-panel');
  if (!panel) return;
  panel.innerHTML = '<p style="color:#9ca3af;padding:1rem;">Loading…</p>';
  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const res   = await fetch(`${BASE}/auth/signup-requests`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include',
    });
    const data    = await res.json();
    const reqs    = data.data || [];
    const pending = reqs.filter(r => r.status === 'pending');
    const rest    = reqs.filter(r => r.status !== 'pending');

    if (!reqs.length) {
      panel.innerHTML = `<div style="text-align:center;padding:3rem;color:#9ca3af;">
        <div style="font-size:3rem;margin-bottom:.5rem;">📬</div>
        <p>No signup requests yet.</p>
      </div>`;
      return;
    }

    const statusColor = { pending:'#f59e0b', approved:'#22c55e', rejected:'#ef4444' };
    const typeEmoji   = { staff:'👨‍🏫', parent:'👨‍👩‍👧', student:'🎒' };

    const renderRow = (r) => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:.7rem 1rem;">
          <div style="font-weight:600;">${r.name}</div>
          <div style="font-size:.72rem;color:#9ca3af;">${r.email}</div>
        </td>
        <td style="padding:.7rem 1rem;font-size:.82rem;">${typeEmoji[r.type]||'👤'} ${r.type}</td>
        <td style="padding:.7rem 1rem;font-size:.8rem;color:#6b7280;">${r.phone||'—'}</td>
        <td style="padding:.7rem 1rem;font-size:.8rem;color:#6b7280;">${r.role_detail||'—'}</td>
        <td style="padding:.7rem 1rem;font-size:.78rem;color:#9ca3af;">${new Date(r.created_at).toLocaleDateString()}</td>
        <td style="padding:.7rem 1rem;">
          <span style="background:${statusColor[r.status]||'#6b7280'}22;color:${statusColor[r.status]||'#6b7280'};border-radius:9999px;padding:.2rem .7rem;font-size:.75rem;font-weight:600;">${r.status}</span>
        </td>
        <td style="padding:.7rem 1rem;text-align:center;">
          ${r.status === 'pending' ? `
            <div style="display:flex;gap:.3rem;justify-content:center;">
              <button onclick="reviewSignupRequest(${r.id},'approve')" style="${btnStyle('success','sm')}">✓ Approve</button>
              <button onclick="reviewSignupRequest(${r.id},'reject')"  style="${btnStyle('danger','sm')}">✗ Reject</button>
            </div>` : `<span style="color:#9ca3af;font-size:.8rem;">${r.reviewed_by||'—'}</span>`}
        </td>
      </tr>`;

    const tableHtml = (rows, title, color) => rows.length ? `
      <h4 style="margin:0 0 .75rem;color:${color};font-size:.9rem;">${title} (${rows.length})</h4>
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.5rem;">
        <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:.65rem 1rem;text-align:left;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">NAME</th>
            <th style="padding:.65rem 1rem;text-align:left;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">TYPE</th>
            <th style="padding:.65rem 1rem;text-align:left;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">PHONE</th>
            <th style="padding:.65rem 1rem;text-align:left;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ROLE DETAIL</th>
            <th style="padding:.65rem 1rem;text-align:left;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">DATE</th>
            <th style="padding:.65rem 1rem;text-align:left;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">STATUS</th>
            <th style="padding:.65rem 1rem;text-align:center;font-size:.78rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTION</th>
          </tr></thead>
          <tbody>${rows.map(renderRow).join('')}</tbody>
        </table>
      </div>` : '';

    panel.innerHTML =
      tableHtml(pending, '⏳ Pending Approval', '#f59e0b') +
      tableHtml(rest, '✅ Previously Reviewed', '#6b7280');

  } catch(e) { if(panel) panel.innerHTML = `<p style="color:#ef4444;padding:1rem;">Error: ${e.message}</p>`; }
}

window.reviewSignupRequest = async function(id, action) {
  if (action === 'reject' && !confirmDlg('Reject this signup request?')) return;
  if (action === 'approve') {
    const note = prompt('Optional: set a temporary password (leave blank to auto-generate)');
    // null = cancelled = abort
    if (note === null && !confirmDlg('Approve with auto-generated password?')) return;
  }
  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const res   = await fetch(`${BASE}/auth/signup-requests/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    if (action === 'approve' && data.data?.tempPassword) {
      showModal(`
        <h3 style="margin:0 0 1rem;">✅ Account Created</h3>
        <p style="color:#374151;font-size:.9rem;">Account created for <strong>${data.data?.name || 'user'}</strong>.</p>
        <p style="font-size:.85rem;color:#6b7280;">Share these credentials with the user:</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:1rem;font-family:monospace;margin:1rem 0;">
          <div>Temporary Password: <strong>${data.data.tempPassword}</strong></div>
        </div>
        <p style="font-size:.78rem;color:#9ca3af;">They should change this after first login.</p>
        <div style="text-align:right;"><button onclick="closeModal()" style="${btnStyle('primary')}">Done</button></div>`);
    } else {
      toast(action === 'approve' ? 'Request approved and account created!' : 'Request rejected.', action === 'approve' ? 'success' : 'warning');
    }
    loadSignupRequests();
    loadSignupRequestBadge();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

async function loadUsers() {
  const tbody  = document.getElementById('users-tbody');
  const role   = document.getElementById('usr-filter-role')?.value;
  const active = document.getElementById('usr-filter-active')?.value;
  const search = document.getElementById('usr-filter-search')?.value;
  if (!tbody) return;

  try {
    const params = {};
    if (role)                           params.role   = role;
    if (active !== undefined && active) params.active = active;
    if (search)                         params.search = search;

    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const q     = Object.entries(params).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
    const res   = await fetch(`${BASE}/users${q ? '?'+q : ''}`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include',
    });
    const data  = await res.json();
    const users = data.data || [];

    const rc = { Admin:'#7c3aed', Teacher:'#2563eb', Student:'#059669', Parent:'#d97706', Staff:'#0891b2' };
    tbody.innerHTML = users.length ? users.map(u => `
      <tr>
        <td style="padding:.65rem 1rem;">
          <div style="font-weight:600;font-size:.875rem;">${u.name}</div>
          <div style="font-size:.72rem;color:#9ca3af;">#${u.id}</div>
        </td>
        <td style="padding:.65rem 1rem;font-size:.8rem;">${u.email||'—'}</td>
        <td style="padding:.65rem 1rem;">
          <span style="background:${rc[u.role]||'#6b7280'}22;color:${rc[u.role]||'#6b7280'};border-radius:9999px;padding:.2rem .7rem;font-size:.75rem;font-weight:600;">${u.role}</span>
        </td>
        <td style="padding:.65rem 1rem;font-size:.8rem;color:#6b7280;">
          ${[u.staff_id?'Staff: '+u.staff_id:'', u.student_id?'Student: '+u.student_id:'', u.ward_id?'Ward: '+u.ward_id:'', u.assigned_class?'Class: '+u.assigned_class+' '+(u.assigned_arm||''):''].filter(Boolean).join(' · ')||'—'}
        </td>
        <td style="padding:.65rem 1rem;">
          <span style="background:${u.active?'#22c55e':'#ef4444'}22;color:${u.active?'#22c55e':'#ef4444'};border-radius:9999px;padding:.2rem .7rem;font-size:.75rem;font-weight:600;">${u.active?'Active':'Inactive'}</span>
        </td>
        <td style="padding:.65rem 1rem;text-align:center;">
          <div style="display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap;">
            <button onclick="openUserModal(${JSON.stringify(u).replace(/"/g,'&quot;')})" style="${btnStyle('secondary','sm')}">Edit</button>
            <button onclick="openResetPasswordModal(${u.id},'${u.name.replace(/'/g,"\\'")}'" style="${btnStyle('outline','sm')}">🔑 Pwd</button>
            <button onclick="toggleUserStatus(${u.id},${!!u.active})" style="${btnStyle(u.active?'warning':'success','sm')}">${u.active?'Disable':'Enable'}</button>
            <button onclick="deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}'" style="${btnStyle('danger','sm')}">Del</button>
          </div>
        </td>
      </tr>`).join('') :
      `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#9ca3af;">No users found</td></tr>`;

  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Error: ${e.message}</td></tr>`;
  }
}

/* Shared user API helper */
function _userApi(method, path, body) {
  const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
  const token = sessionStorage.getItem('shc_token');
  return fetch(`${BASE}/users${path}`, {
    method, credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());
}

window.openUserModal = function(u = null) {
  const isEdit = !!u;
  const roleOpts  = ['Admin','Teacher','Student','Parent','Staff','Bursar'].map(r =>
    `<option ${u?.role === r ? 'selected' : ''}>${r}</option>`).join('');
  const classOpts = ['', ...(App.data.classes || []).map(c => c.name)].map(c =>
    `<option ${u?.assigned_class === c ? 'selected' : ''} value="${c}">${c || '-- None --'}</option>`).join('');

  showModal(`
    <h3 style="margin:0 0 1.2rem;">${isEdit ? '✏️ Edit User' : '➕ Add Portal User'}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Full Name *</label>
        <input id="um-name" value="${u?.name||''}" placeholder="Full name" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Email *</label>
        <input id="um-email" type="email" value="${u?.email||''}" placeholder="user@school.ng" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Role *</label>
        <select id="um-role" style="${selectStyle()};width:100%;">${roleOpts}</select>
      </div>
      ${!isEdit ? `<div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Password *</label>
        <input id="um-password" type="password" placeholder="Min 6 characters" style="${inputStyle()};width:100%;">
      </div>` : '<div></div>'}
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Staff ID (teacher/staff)</label>
        <input id="um-staffid" value="${u?.staff_id||''}" placeholder="e.g. S001" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Student/Ward ID</label>
        <input id="um-studentid" value="${u?.student_id||u?.ward_id||''}" placeholder="e.g. SHC/001" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Assigned Class</label>
        <select id="um-class" style="${selectStyle()};width:100%;">${classOpts}</select>
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Assigned Arm</label>
        <select id="um-arm" style="${selectStyle()};width:100%;">
          <option value="">—</option>
          ${['A','B','C','D','E'].map(a => `<option ${u?.assigned_arm===a?'selected':''} value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div style="grid-column:1/-1;display:flex;gap:.75rem;justify-content:flex-end;margin-top:.3rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="submitUser(${isEdit ? u.id : 'null'})" style="${btnStyle('primary')}">${isEdit ? '💾 Save' : '✅ Create User'}</button>
      </div>
    </div>
  `);
};

window.submitUser = async function(userId) {
  const name      = document.getElementById('um-name')?.value?.trim();
  const email     = document.getElementById('um-email')?.value?.trim();
  const role      = document.getElementById('um-role')?.value;
  const password  = document.getElementById('um-password')?.value;
  const staff_id  = document.getElementById('um-staffid')?.value?.trim()    || null;
  const studentRaw= document.getElementById('um-studentid')?.value?.trim()  || null;
  const cls       = document.getElementById('um-class')?.value              || null;
  const arm       = document.getElementById('um-arm')?.value                || null;

  if (!name)  { toast('Name is required', 'error'); return; }
  if (!email) { toast('Email is required', 'error'); return; }
  if (!userId && !password) { toast('Password is required', 'error'); return; }

  const payload = {
    name, email, role, staff_id,
    student_id:     role === 'Parent' ? null : studentRaw,
    ward_id:        role === 'Parent' ? studentRaw : null,
    assigned_class: cls, assigned_arm: arm,
    ...(password ? { password } : {}),
  };

  try {
    const data = await _userApi(userId ? 'PUT' : 'POST', userId ? `/${userId}` : '', payload);
    if (!data.success) throw new Error(data.message);
    closeModal(); toast(userId ? 'User updated!' : 'User created!', 'success'); loadUsers();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.openResetPasswordModal = function(userId, userName) {
  showModal(`
    <h3 style="margin:0 0 1.2rem;">🔑 Reset Password — ${userName}</h3>
    <div style="display:flex;flex-direction:column;gap:.8rem;">
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">New Password *</label>
        <input id="rp-pwd" type="password" placeholder="Min 6 characters" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Confirm Password *</label>
        <input id="rp-pwd2" type="password" placeholder="Repeat password" style="${inputStyle()};width:100%;">
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.3rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="submitResetPassword(${userId})" style="${btnStyle('primary')}">🔑 Reset Password</button>
      </div>
    </div>
  `);
};

window.submitResetPassword = async function(userId) {
  const pwd  = document.getElementById('rp-pwd')?.value;
  const pwd2 = document.getElementById('rp-pwd2')?.value;
  if (!pwd)           { toast('Password is required', 'error'); return; }
  if (pwd.length < 6) { toast('Minimum 6 characters', 'error'); return; }
  if (pwd !== pwd2)   { toast('Passwords do not match', 'error'); return; }
  try {
    const data = await _userApi('PATCH', `/${userId}/password`, { password: pwd });
    if (!data.success) throw new Error(data.message);
    closeModal(); toast('Password reset successfully!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.toggleUserStatus = async function(userId, currentlyActive) {
  if (!confirmDlg(`${currentlyActive ? 'Disable' : 'Enable'} this user account?`)) return;
  try {
    const data = await _userApi('PATCH', `/${userId}/status`, { active: !currentlyActive });
    if (!data.success) throw new Error(data.message);
    toast(`User ${currentlyActive ? 'disabled' : 'enabled'}`, 'success'); loadUsers();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.deleteUser = async function(userId, userName) {
  if (!confirmDlg(`Delete user "${userName}"? This cannot be undone.`)) return;
  try {
    const data = await _userApi('DELETE', `/${userId}`);
    if (!data.success) throw new Error(data.message);
    toast('User deleted', 'warning'); loadUsers();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};