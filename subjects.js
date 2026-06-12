'use strict';
/* selectStyle fallback — in case script.js hasn't defined it yet */
if (typeof selectStyle === 'undefined') window.selectStyle = () => 'width:100%;padding:.52rem .75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.875rem;font-family:inherit;outline:none;background:#fff;cursor:pointer;';
if (typeof inputStyle  === 'undefined') window.inputStyle  = () => 'width:100%;padding:.52rem .75rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.875rem;font-family:inherit;outline:none;';
/**
 * subjects.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * Subjects module: render, add, edit, delete subjects
 * Depends on: App, priv, btnStyle(), inputStyle(), selectStyle(),
 *             labelStyle(), showModal(), closeModal(), toast(),
 *             denyAccess(), tdStyle(), thStyle(), thRowStyle(), tableStyle()
 */

/* ── RENDER ──────────────────────────────────────────────────────────────── */
function renderSubjects() {
  const section   = document.getElementById('subjects');
  if (!section) return;

  const canManage = priv.canManage();
  const subjects  = App.data.subjects || [];

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h2 style="margin:0 0 .2rem;font-size:1.5rem;">Subjects</h2>
        <p style="margin:0;color:#6b7280;font-size:.875rem;">${subjects.length} subject${subjects.length !== 1 ? 's' : ''} registered</p>
      </div>
      ${canManage ? `<button onclick="openSubjectModal()" style="${btnStyle('primary')}">+ Add Subject</button>` : ''}
    </div>

    ${subjects.length === 0 ? `
      <div style="text-align:center;padding:3rem;color:#9ca3af;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="font-size:3rem;margin-bottom:1rem;">📚</div>
        <h3 style="margin:0 0 .5rem;color:#374151;">No subjects yet</h3>
        <p style="margin:0 0 1.5rem;">Add subjects to get started.</p>
        ${canManage ? `<button onclick="openSubjectModal()" style="${btnStyle('primary')}">+ Add First Subject</button>` : ''}
      </div>` : `

    <div style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden;">
      <div style="padding:.75rem 1rem;border-bottom:1px solid #e5e7eb;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
        <input id="subject-search" placeholder="🔍 Search subjects…" oninput="filterSubjects()"
          style="${inputStyle('sm')};max-width:220px;">
        <select id="subject-level-filter" onchange="filterSubjects()" style="${selectStyle('sm')};max-width:160px;">
          <option value="">All Levels</option>
          <option>All</option><option>Junior</option><option>Senior</option>
        </select>
        <select id="subject-type-filter" onchange="filterSubjects()" style="${selectStyle('sm')};max-width:160px;">
          <option value="">All Types</option>
          <option>Core</option><option>Elective</option><option>Vocational</option>
        </select>
      </div>
      <div style="overflow-x:auto;">
        <table style="${tableStyle()}" id="subjects-table">
          <thead>
            <tr style="${thRowStyle()}">
              <th style="${thStyle('40px','center')}">#</th>
              <th style="${thStyle()}">Subject Name</th>
              <th style="${thStyle('80px')}">Code</th>
              <th style="${thStyle('90px')}">Level</th>
              <th style="${thStyle('100px')}">Type</th>
              ${canManage ? `<th style="${thStyle('100px','center')}">Actions</th>` : ''}
            </tr>
          </thead>
          <tbody id="subjects-tbody">
            ${subjects.map((s, i) => subjectRow(s, i + 1, canManage)).join('')}
          </tbody>
        </table>
      </div>
    </div>`}`;
}
window.renderSubjects = renderSubjects;

function subjectRow(s, idx, canManage) {
  const levelColors = {
    All:    '#6366f1', Junior: '#818cf8', Senior: '#f59e0b',
  };
  const typeColors = {
    Core: '#16a34a', Elective: '#0891b2', Vocational: '#d97706',
  };
  const lc = levelColors[s.level] || '#6b7280';
  const tc = typeColors[s.type]   || '#6b7280';

  return `<tr id="subject-row-${s.id}" style="transition:background .12s;">
    <td style="${tdStyle({align:'center',muted:true})}">${idx}</td>
    <td style="${tdStyle({bold:true})}">${s.name}</td>
    <td style="${tdStyle()}"><code style="background:#f3f4f6;padding:.1rem .4rem;border-radius:4px;font-size:.8rem;">${s.code || '—'}</code></td>
    <td style="${tdStyle()}">
      <span style="background:${lc}18;color:${lc};border:1px solid ${lc}33;padding:.15rem .55rem;border-radius:9999px;font-size:.72rem;font-weight:600;">${s.level || 'All'}</span>
    </td>
    <td style="${tdStyle()}">
      <span style="background:${tc}18;color:${tc};border:1px solid ${tc}33;padding:.15rem .55rem;border-radius:9999px;font-size:.72rem;font-weight:600;">${s.type || 'Core'}</span>
    </td>
    ${canManage ? `
    <td style="${tdStyle({align:'center',nowrap:true})}">
      <button onclick="openSubjectModal('${s.id}')" style="${btnStyle('ghost','sm')}" title="Edit">✏️</button>
      <button onclick="deleteSubject('${s.id}')" style="${btnStyle('ghostDanger','sm')}" title="Delete">🗑</button>
    </td>` : ''}
  </tr>`;
}

/* ── FILTER ──────────────────────────────────────────────────────────────── */
window.filterSubjects = function () {
  const q     = (document.getElementById('subject-search')?.value || '').toLowerCase();
  const level = document.getElementById('subject-level-filter')?.value || '';
  const type  = document.getElementById('subject-type-filter')?.value  || '';

  (App.data.subjects || []).forEach(s => {
    const row = document.getElementById(`subject-row-${s.id}`);
    if (!row) return;
    const matchQ     = !q     || s.name.toLowerCase().includes(q) || (s.code||'').toLowerCase().includes(q);
    const matchLevel = !level || s.level === level;
    const matchType  = !type  || s.type  === type;
    row.style.display = (matchQ && matchLevel && matchType) ? '' : 'none';
  });
};

/* ── MODAL ───────────────────────────────────────────────────────────────── */
window.openSubjectModal = function (id = null) {
  if (!priv.canManage()) { denyAccess(); return; }
  const s = id ? (App.data.subjects || []).find(x => String(x.id) === String(id)) : null;

  showModal(`
    <div style="min-width:320px;">
      <h3 style="margin:0 0 1.25rem;font-size:1.1rem;color:#1e3a5f;">${s ? 'Edit Subject' : 'Add New Subject'}</h3>
      <div style="display:flex;flex-direction:column;gap:.9rem;">
        <div>
          <label style="${labelStyle()}">Subject Name *</label>
          <input id="subj-name" value="${s?.name || ''}" placeholder="e.g. Mathematics"
            style="${inputStyle()}" maxlength="80">
        </div>
        <div>
          <label style="${labelStyle()}">Code</label>
          <input id="subj-code" value="${s?.code || ''}" placeholder="e.g. MTH"
            style="${inputStyle()}" maxlength="10">
        </div>
        <div>
          <label style="${labelStyle()}">Level</label>
          <select id="subj-level" style="${selectStyle()}">
            ${['All','Junior','Senior'].map(l =>
              `<option value="${l}" ${(s?.level||'All')===l?'selected':''}>${l}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Type</label>
          <select id="subj-type" style="${selectStyle()}">
            ${['Core','Elective','Vocational'].map(t =>
              `<option value="${t}" ${(s?.type||'Core')===t?'selected':''}>${t}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="saveSubject('${s?.id||''}')" style="${btnStyle('primary')}">${s ? 'Save Changes' : 'Add Subject'}</button>
      </div>
    </div>`);
};

window.saveSubject = async function (id) {
  const name  = document.getElementById('subj-name')?.value.trim();
  const code  = document.getElementById('subj-code')?.value.trim().toUpperCase();
  const level = document.getElementById('subj-level')?.value || 'All';
  const type  = document.getElementById('subj-type')?.value  || 'Core';

  if (!name) { toast('Subject name is required.', 'warning'); return; }

  // Check duplicate name
  const dup = (App.data.subjects || []).find(s =>
    s.name.toLowerCase() === name.toLowerCase() && String(s.id) !== String(id)
  );
  if (dup) { toast('A subject with this name already exists.', 'warning'); return; }

  const payload = { name, code, level, type };

  try {
    let saved;
    if (id) {
      saved = await apiSaveSubject(payload, id);
      const idx = App.data.subjects.findIndex(s => String(s.id) === String(id));
      if (idx >= 0) App.data.subjects[idx] = { ...App.data.subjects[idx], ...payload, ...saved };
    } else {
      saved = await apiSaveSubject(payload);
      App.data.subjects.push({ ...payload, id: saved?.id || saved?.data?.id || Date.now(), ...saved });
    }
    closeModal();
    renderSubjects();
    toast(`Subject "${name}" ${id ? 'updated' : 'added'}.`, 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
};

window.deleteSubject = function (id) {
  if (!priv.canManage()) { denyAccess(); return; }
  const s = (App.data.subjects || []).find(x => String(x.id) === String(id));
  if (!s) return;

  showModal(`
    <div style="text-align:center;padding:.5rem 0 1rem;">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">🗑️</div>
      <h3 style="margin:0 0 .5rem;">Delete Subject?</h3>
      <p style="color:#6b7280;margin:0 0 .5rem;"><strong>${s.name}</strong> will be permanently removed.</p>
      <p style="color:#ef4444;font-size:.82rem;margin:0 0 1.5rem;">This will also remove all result entries for this subject.</p>
      <div style="display:flex;gap:.75rem;justify-content:center;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="confirmDeleteSubject('${id}')" style="${btnStyle('danger')}">Yes, Delete</button>
      </div>
    </div>`);
};

window.confirmDeleteSubject = async function (id) {
  try {
    await apiDeleteSubject(id);
    App.data.subjects = (App.data.subjects || []).filter(s => String(s.id) !== String(id));
    closeModal();
    renderSubjects();
    toast('Subject deleted.', 'warning');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
};