'use strict';
/**
 * results.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Results & Subject Allocations
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
function renderResults() {
  const section = document.getElementById('results');

  /* ── PARENT VIEW ── */
  if (priv.isParent()) {
    const studentId = App.currentUser.studentId;
    if (!studentId) { section.innerHTML = '<p style="padding:2rem;color:#ef4444;">No student linked to this account.</p>'; return; }
    const student = App.data.students.find(s => s.id === studentId);
    if (!student) { section.innerHTML = '<p style="padding:2rem;color:#ef4444;">Student record not found.</p>'; return; }
    const results = App.data.results.filter(r => r.studentId === studentId);
    const terms   = [...new Set(results.map(r => r.term))];
    section.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="margin:0 0 .25rem;">Results — ${student.name}</h2>
        <p style="margin:0;color:#6b7280;font-size:.9rem;">${student.class} ${student.arm} &nbsp;|&nbsp; Attendance: <strong style="color:${student.attendance<75?'#ef4444':'#22c55e'}">${student.attendance}%</strong></p>
      </div>
      ${!results.length
        ? `<div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">No results recorded yet.</div>`
        : terms.map(term => {
            const tr = results.filter(r => r.term === term);
            const avg = (tr.reduce((a,b)=>a+(Number(b.ca??0)+Number(b.exam??0)),0)/tr.length).toFixed(1);
            return `<div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.5rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
                <h3 style="margin:0;">${term}</h3>
                <div style="display:flex;gap:.75rem;">
                  <span style="${badgeStyle('info')}">Average: ${avg}%</span>
                  <span style="${badgeStyle(parseFloat(avg)>=50?'success':'danger')}">Grade: ${grade(parseFloat(avg)).letter}</span>
                </div>
              </div>
              <div style="overflow-x:auto;">
              <table style="${tableStyle()}">
                <thead><tr style="${thRowStyle()}">
                  <th style="${thStyle()}">Subject</th><th style="${thStyle()}">CA (40)</th>
                  <th style="${thStyle()}">Exam (60)</th><th style="${thStyle()}">Total</th>
                  <th style="${thStyle()}">Grade</th><th style="${thStyle()}">Remark</th>
                </tr></thead>
                <tbody>
                  ${tr.map(r => { const g = grade(r.total); return `<tr style="${trStyle()}">
                    <td style="${tdStyle()};font-weight:500;">${r.subject}</td>
                    <td style="${tdStyle()}">${r.ca}</td><td style="${tdStyle()}">${r.exam}</td>
                    <td style="${tdStyle()}"><strong>${r.total}</strong></td>
                    <td style="${tdStyle()}"><span style="${badgeStyle(r.total>=50?'success':r.total>=40?'warning':'danger')}">${g.letter}</span></td>
                    <td style="${tdStyle()};color:#6b7280;">${g.remark}</td>
                  </tr>`; }).join('')}
                </tbody>
              </table></div>
            </div>`;
          }).join('')
      }`;
    return;
  }

  /* ── ADMIN / TEACHER VIEW ── */
  const isTeacher = priv.isTeacher();
  const preClass  = App.currentUser.assignedClass || '';
  const preArm    = App.currentUser.assignedArm   || '';
  const SS_INDIVIDUAL = ['SS 2', 'SS 3'];

  const classOptions = App.data.classes.map(c =>
    `<option ${preClass===c.name?'selected':''}>${c.name}</option>`).join('');
  const subjOptions  = App.data.subjects.map(s =>
    `<option>${s.name}</option>`).join('');

  section.innerHTML = `
    <style>
      .res-tab-btn { transition: all .2s; }
      .res-tab-btn:hover { opacity: .85; }
      .result-card { background:#fff; border-radius:14px; padding:1.5rem; box-shadow:0 4px 16px rgba(0,0,0,.08); margin-bottom:1.5rem; }
      .alloc-chip { display:inline-flex; align-items:center; gap:.3rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:20px; padding:.2rem .75rem; font-size:.82rem; font-weight:500; color:#1d4ed8; margin:.15rem; }
      .alloc-chip button { background:none; border:none; cursor:pointer; color:#3b82f6; font-size:.9rem; line-height:1; padding:0; }
      .subject-tag { display:inline-block; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:.15rem .55rem; font-size:.78rem; color:#15803d; margin:.1rem; }
      @keyframes fadeSlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      .fade-in { animation: fadeSlide .25s ease; }
    </style>

    <div style="margin-bottom:1.75rem;">
      <h2 style="margin:0 0 .25rem;color:#1e3a5f;">Results Management</h2>
      <p style="margin:0;color:#6b7280;font-size:.875rem;">Enter grades · Allocate subjects · Export results</p>
    </div>

    <!-- Tab Bar -->
    <div style="display:flex;gap:.5rem;margin-bottom:1.75rem;flex-wrap:wrap;background:#f1f5f9;border-radius:12px;padding:.4rem;">
      <button id="tab-single"      onclick="switchResultTab('single')"   class="res-tab-btn" style="${activeTabStyle(true)}">📝 Single Entry</button>
      <button id="tab-bulk"        onclick="switchResultTab('bulk')"     class="res-tab-btn" style="${activeTabStyle(false)}">📊 Bulk Excel</button>
      <button id="tab-allocate"    onclick="switchResultTab('allocate')" class="res-tab-btn" style="${activeTabStyle(false)}">📋 Subject Allocation</button>
      <button id="tab-verify"      onclick="switchResultTab('verify')"   class="res-tab-btn" style="${activeTabStyle(false)}">🔍 Score Verification</button>
      <button id="tab-cumulative"  onclick="switchResultTab('cumulative')" class="res-tab-btn" style="${activeTabStyle(false)}">🎓 Cumulative</button>
    </div>

    <!-- ═══ SINGLE ENTRY TAB ═══ -->
    <div id="result-tab-single" class="fade-in">
      <div class="result-card">
        <h4 style="margin:0 0 1.25rem;color:#1e3a5f;display:flex;align-items:center;gap:.5rem;">
          <span style="background:#dbeafe;color:#1d4ed8;padding:.3rem .6rem;border-radius:8px;font-size:.85rem;">Step 1</span>
          Select Class & Subject
        </h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:1.25rem;">
          <div>
            <label style="${labelStyle()}">Class</label>
            <select id="res-class" style="${inputStyle()}" onchange="populateResultStudents()" ${isTeacher?'disabled':''}>
              ${classOptions}
            </select>
          </div>
          <div>
            <label style="${labelStyle()}">Arm</label>
            <select id="res-arm" style="${inputStyle()}" ${isTeacher?'disabled':''}>
              ${(() => {
                const firstCls = isTeacher
                  ? App.data.classes.find(c => c.name === preClass)
                  : App.data.classes[0];
                const arms = firstCls?.arms || ['A'];
                return arms.map(a => `<option ${a === (preArm||arms[0]) ? 'selected' : ''}>${a}</option>`).join('');
              })()}
            </select>
          </div>
          <div>
            <label style="${labelStyle()}">Subject</label>
            <select id="res-subject" style="${inputStyle()}">${subjOptions}</select>
          </div>
          <div>
            <label style="${labelStyle()}">Term</label>
            <select id="res-term" style="${inputStyle()}">
              <option>First Term</option><option selected>Second Term</option><option>Third Term</option>
            </select>
          </div>
          <div>
            <label style="${labelStyle()}">Session</label>
            <input id="res-session" value="${App.data.schoolInfo.session}" style="${inputStyle()}">
          </div>
        </div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          <button onclick="loadResultEntry()" style="${btnStyle('primary')}">⚡ Load Students</button>
          <button onclick="populateResultStudents()" style="${btnStyle('secondary')}">🔄 Refresh Arms</button>
        </div>
      </div>
      <div id="result-entry-table"></div>
    </div>

    <!-- ═══ BULK EXCEL TAB ═══ -->
    <div id="result-tab-bulk" style="display:none;" class="fade-in">
      <div class="result-card">
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;">
            <h4 style="margin:0 0 .35rem;color:#1e3a5f;">Step 1 — Download Template</h4>
            <p style="margin:0;font-size:.85rem;color:#6b7280;">Pre-formatted Excel file with dropdowns &amp; auto-grade columns.</p>
          </div>
          <button onclick="downloadResultsTemplate()" style="${btnStyle('secondary')}">⬇ Excel Template</button>
        </div>
      </div>
      <div class="result-card">
        <h4 style="margin:0 0 1rem;color:#1e3a5f;">Step 2 — Select Class &amp; Arm</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;">
          <div><label style="${labelStyle()}">Class</label>
            <select id="bulk-res-class" style="${inputStyle()}" onchange="populateBulkArms()" ${isTeacher?'disabled':''}>${classOptions}</select>
          </div>
          <div><label style="${labelStyle()}">Arm</label>
            <select id="bulk-res-arm" style="${inputStyle()}" ${isTeacher?'disabled':''}>
              ${(() => {
                const firstCls = isTeacher
                  ? App.data.classes.find(c => c.name === preClass)
                  : App.data.classes[0];
                const arms = firstCls?.arms || ['A'];
                return arms.map(a => `<option ${a === (preArm||arms[0]) ? 'selected' : ''}>${a}</option>`).join('');
              })()}
            </select>
          </div>
        </div>
      </div>
      <div class="result-card">
        <h4 style="margin:0 0 .5rem;color:#1e3a5f;">Step 3 — Upload Completed Excel</h4>
        <p style="margin:0 0 1rem;font-size:.85rem;color:#6b7280;">Accepted: <code style="background:#f3f4f6;padding:.15rem .4rem;border-radius:4px;">.xlsx</code> or <code style="background:#f3f4f6;padding:.15rem .4rem;border-radius:4px;">.xls</code></p>
        <div id="excel-drop-zone"
          ondragover="event.preventDefault();this.style.borderColor='#2563eb';this.style.background='#eff6ff';"
          ondragleave="this.style.borderColor='#d1d5db';this.style.background='#f9fafb';"
          ondrop="handleExcelDrop(event)"
          style="border:2px dashed #d1d5db;border-radius:10px;padding:2.5rem;text-align:center;background:#f9fafb;cursor:pointer;transition:all .2s;"
          onclick="document.getElementById('excel-file-input').click()">
          <div style="font-size:2.5rem;margin-bottom:.5rem;">📊</div>
          <p style="margin:0;font-weight:600;color:#374151;">Click to browse or drag &amp; drop</p>
          <p style="margin:.25rem 0 0;font-size:.8rem;color:#9ca3af;">Excel files only (.xlsx / .xls)</p>
        </div>
        <input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display:none" onchange="handleExcelFileSelect(this)">
        <div id="excel-file-info" style="margin-top:.75rem;"></div>
      </div>
      <div id="bulk-excel-preview-section" style="display:none;">
        <div class="result-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;margin-bottom:1rem;">
            <h4 style="margin:0;color:#1e3a5f;">Step 4 — Preview &amp; Import</h4>
            <span id="preview-stats" style="${badgeStyle('info')}"></span>
          </div>
          <div id="bulk-result-preview" style="overflow-x:auto;max-height:360px;overflow-y:auto;"></div>
          <div style="display:flex;gap:.75rem;margin-top:1.25rem;justify-content:flex-end;flex-wrap:wrap;">
            <button onclick="clearExcelImport()" style="${btnStyle('secondary')}">✖ Clear</button>
            <button id="btn-import-excel" onclick="saveBulkExcelResults()" style="${btnStyle('primary')}" disabled>💾 Import Valid Results</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ SUBJECT ALLOCATION TAB ═══ -->
    <div id="result-tab-allocate" style="display:none;" class="fade-in">
      <div class="result-card">
        <h4 style="margin:0 0 1rem;color:#1e3a5f;">Select Class &amp; Arm</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:1.25rem;">
          <div><label style="${labelStyle()}">Class</label>
            <select id="alloc-class" style="${inputStyle()}" onchange="updateAllocArms()" ${isTeacher?'disabled':''}>
              ${classOptions}
            </select>
          </div>
          <div><label style="${labelStyle()}">Arm</label>
            <select id="alloc-arm" style="${inputStyle()}" ${isTeacher?'disabled':''}><option>${preArm||'A'}</option></select>
          </div>
        </div>
        <button onclick="loadSubjectAllocation()" style="${btnStyle('primary')}">📋 Load Allocation</button>
      </div>
      <div id="allocation-output"></div>
    </div>`;

  /* Init dropdowns */
  if (isTeacher) {
    const classData = App.data.classes.find(c => c.name === preClass);
    ['res-arm','bulk-res-arm','alloc-arm'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel && classData) sel.innerHTML = classData.arms.map(a=>`<option ${a===preArm?'selected':''}>${a}</option>`).join('');
    });
    // FIX: restrict the subject dropdown to subjects allocated to this teacher's class/arm
    if (preClass && preArm) {
      Results.getClassAllocation(preClass, preArm).then(resp => {
        const raw   = resp.subjects || resp.data || [];
        const names = raw.map(s => typeof s === 'string' ? s : s.name).filter(Boolean);
        const sel   = document.getElementById('res-subject');
        if (sel && names.length) {
          sel.innerHTML = names.map(n => `<option>${n}</option>`).join('');
          App.data.subjectAllocations[`${preClass}_${preArm}`] = names;
        }
        // If no allocation set yet, leave the full subject list as fallback
      }).catch(e => console.warn('[results] allocation fetch failed:', e.message));
    }
  } else {

    populateResultStudents();
    populateBulkArms();
  }
}

/* ── Active tab style helper ── */
function activeTabStyle(active) {
  return active
    ? 'background:#fff;color:#1e3a5f;border:none;padding:.5rem 1.1rem;border-radius:9px;font-size:.875rem;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.1);'
    : 'background:transparent;color:#6b7280;border:none;padding:.5rem 1.1rem;border-radius:9px;font-size:.875rem;font-weight:500;cursor:pointer;';
}

/* ── Update alloc arms dropdown ── */
window.updateAllocArms = function() {
  const cls = document.getElementById('alloc-class')?.value;
  const sel = document.getElementById('alloc-arm');
  if (!sel || !cls) return;
  const classData = App.data.classes.find(c => c.name === cls);
  if (classData) sel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
};

/* ── Subject Allocation Loader ── */
/* ── Subject limit helper — reads from settings ──────────────── */
function getMaxStudentSubjects() {
  return parseInt(App?.data?.generalSettings?.maxSubjectsPerStudent) || 9;
}

window.loadSubjectAllocation = async function() {
  const cls = document.getElementById('alloc-class')?.value;
  const arm = document.getElementById('alloc-arm')?.value;
  if (!cls || !arm) return toast('Select class and arm.', 'warning');

  // Always fetch latest allocation from API
  try {
    const resp  = await Results.getClassAllocation(cls, arm);
    const raw   = resp.subjects || resp.data || [];
    const names = raw.map(s => typeof s === 'string' ? s : s.name).filter(Boolean);
    if (names.length) App.data.subjectAllocations[`${cls}_${arm}`] = names;
  } catch(e) { console.warn('[loadSubjectAllocation] API fetch failed:', e.message); }

  const SS_INDIVIDUAL = ['SS 2', 'SS 3'];
  const output = document.getElementById('allocation-output');
  const allSubjects = App.data.subjects.filter(s => s.level === 'All' || s.level === 'Senior' || s.level === (App.data.classes.find(c=>c.name===cls)?.level==='Junior'?'Junior':'Senior'));

  if (SS_INDIVIDUAL.includes(cls)) {
    /* Individual allocation per student */
    const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
    if (!students.length) return toast('No students found.', 'warning');

    const classKey = `${cls}_${arm}`;
    const classSubjects = App.data.subjectAllocations[classKey] || App.data.subjects.filter(s => s.level==='All' || s.level==='Senior').map(s=>s.name);

    output.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:1.5rem;box-shadow:0 4px 16px rgba(0,0,0,.08);" class="fade-in">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;">
          <div>
            <h4 style="margin:0;color:#1e3a5f;">${cls} ${arm} — Individual Subject Allocation</h4>
            <p style="margin:.25rem 0 0;font-size:.82rem;color:#6b7280;">SS2 &amp; SS3: Each student picks their own subjects (max ${getMaxStudentSubjects()})</p>
          </div>
          <button onclick="openBulkAllocModal('${cls}','${arm}')" style="${btnStyle('primary')}">⚡ Bulk Allocate All Students</button>
        </div>

        <div style="overflow-x:auto;">
        <table style="${tableStyle()}">
          <thead><tr style="${thRowStyle()}">
            <th style="${thStyle()}">Student</th>
            <th style="${thStyle()}">Allocated Subjects</th>
            <th style="${thStyle()};text-align:center;">Count</th>
            <th style="${thStyle()}">Actions</th>
          </tr></thead>
          <tbody>
            ${students.map(s => {
              const key = s.id;
              const allocated = App.data.subjectAllocations[key] || classSubjects.slice(0,9);
              return `<tr style="${trStyle()}" id="alloc-row-${s.id}">
                <td style="${tdStyle()}">
                  <div style="font-weight:600;color:#1e3a5f;">${s.name}</div>
                  <div style="font-size:.75rem;color:#9ca3af;">${s.id}</div>
                </td>
                <td style="${tdStyle()}">
                  <div id="chips-${s.id}" style="display:flex;flex-wrap:wrap;gap:.2rem;">
                    ${allocated.map(subj=>`<span class="subject-tag">${subj}</span>`).join('')}
                  </div>
                </td>
                <td style="${tdStyle()};text-align:center;">
                  <span style="${badgeStyle(allocated.length>getMaxStudentSubjects()?'danger':allocated.length>=Math.max(5,getMaxStudentSubjects()-2)?'success':'info')}">${allocated.length}/9</span>
                </td>
                <td style="${tdStyle()}">
                  <button onclick="openStudentAllocModal('${s.id}','${cls}','${arm}')" style="${btnStyle('primary','sm')}">✏ Edit</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>`;
  } else {
    /* Class-level allocation */
    const classKey = `${cls}_${arm}`;
    const allocated = App.data.subjectAllocations[classKey] || [];

    output.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:1.5rem;box-shadow:0 4px 16px rgba(0,0,0,.08);" class="fade-in">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;">
          <div>
            <h4 style="margin:0;color:#1e3a5f;">${cls} ${arm} — Class Subject Allocation</h4>
            <p style="margin:.25rem 0 0;font-size:.82rem;color:#6b7280;">Subjects allocated here apply to all students in this class/arm</p>
          </div>
          <span style="${badgeStyle('info')}">${allocated.length} subjects allocated</span>
        </div>

        <div id="class-alloc-chips" style="display:flex;flex-wrap:wrap;gap:.4rem;padding:1rem;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;min-height:60px;margin-bottom:1.25rem;">
          ${allocated.length ? allocated.map(subj=>`
            <span class="alloc-chip">
              ${subj}
              <button onclick="removeClassSubject('${cls}','${arm}','${subj}')" title="Remove">✕</button>
            </span>`).join('') : '<span style="color:#9ca3af;font-size:.875rem;">No subjects allocated yet. Add subjects below.</span>'}
        </div>

        <div style="margin-bottom:1.25rem;">
          <label style="${labelStyle()}">Add Subjects</label>
          <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;">
            ${allSubjects.filter(s => !allocated.includes(s.name)).map(s=>`
              <button onclick="addClassSubject('${cls}','${arm}','${s.name}')"
                style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:.3rem .75rem;font-size:.8rem;cursor:pointer;color:#374151;transition:all .15s;"
                onmouseover="this.style.background='#dbeafe';this.style.borderColor='#93c5fd';"
                onmouseout="this.style.background='#f3f4f6';this.style.borderColor='#e5e7eb';">
                + ${s.name}
              </button>`).join('')}
          </div>
        </div>

        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          <button onclick="saveClassAllocation('${cls}','${arm}')" style="${btnStyle('primary')}">💾 Save Allocation</button>
          <button onclick="clearClassAllocation('${cls}','${arm}')" style="${btnStyle('danger')}">🗑 Clear All</button>
        </div>
      </div>`;
  }
};

/* ── Class-level allocation actions ── */
window.addClassSubject = function(cls, arm, subject) {
  const key = `${cls}_${arm}`;
  if (!App.data.subjectAllocations[key]) App.data.subjectAllocations[key] = [];
  if (App.data.subjectAllocations[key].includes(subject)) return;
  App.data.subjectAllocations[key].push(subject);
  loadSubjectAllocation();
};

window.removeClassSubject = function(cls, arm, subject) {
  const key = `${cls}_${arm}`;
  if (App.data.subjectAllocations[key]) {
    App.data.subjectAllocations[key] = App.data.subjectAllocations[key].filter(s => s !== subject);
    loadSubjectAllocation();
  }
};

window.saveClassAllocation = async function(cls, arm) {
  const key      = `${cls}_${arm}`;
  const subNames = App.data.subjectAllocations[key] || [];
  if (!subNames.length) { toast('No subjects selected to save.', 'warning'); return; }

  // Map names → IDs
  const subjectIds = subNames.map(name => {
    const sub = App.data.subjects.find(s => s.name === name || s.code === name);
    return sub?.id;
  }).filter(Boolean);

  if (!subjectIds.length) { toast('Could not match subjects to IDs — check subjects list.', 'error'); return; }

  try {
    await Results.setClassAllocation(cls, arm, subjectIds);
    toast(`✅ Allocation saved for ${cls} ${arm} (${subjectIds.length} subjects)`, 'success');
  } catch(e) { toast('Save failed: ' + e.message, 'error'); }
};

window.clearClassAllocation = async function(cls, arm) {
  if (!confirm(`Clear all subject allocations for ${cls} ${arm}?`)) return;
  try {
    await Results.clearClassAllocation(cls, arm);
    App.data.subjectAllocations[`${cls}_${arm}`] = [];
    loadSubjectAllocation();
    toast('Allocation cleared.', 'warning');
  } catch(e) { toast('Clear failed: ' + e.message, 'error'); }
};

/* ── Individual student allocation modal (SS2/SS3) ── */
window.openStudentAllocModal = function(studentId, cls, arm) {
  const student  = App.data.students.find(s => s.id === studentId);
  const classKey = `${cls}_${arm}`;
  const base     = App.data.subjectAllocations[classKey] || App.data.subjects.filter(s=>s.level==='All'||s.level==='Senior').map(s=>s.name);
  let allocated  = [...(App.data.subjectAllocations[studentId] || [])];

  const allSubjects = App.data.subjects; // All subjects available — student picks their choice

  const render = () => {
    const chipsEl = document.getElementById('modal-student-chips');
    const countEl = document.getElementById('modal-alloc-count');
    const poolEl  = document.getElementById('modal-subject-pool');
    if (chipsEl) chipsEl.innerHTML = allocated.map(subj=>`
      <span class="alloc-chip">
        ${subj}
        <button onclick="modalRemoveSubject('${subj}')" title="Remove">✕</button>
      </span>`).join('') || '<span style="color:#9ca3af;font-size:.82rem;">No subjects yet</span>';
    if (countEl) {
      countEl.textContent = `${allocated.length}/${getMaxStudentSubjects()}`;
      countEl.style.cssText = badgeStyle(allocated.length>getMaxStudentSubjects()?'danger':allocated.length>=Math.max(5,getMaxStudentSubjects()-2)?'success':'info');
    }
    if (poolEl) poolEl.innerHTML = allSubjects.filter(s=>!allocated.includes(s.name)).map(s=>`
      <button onclick="modalAddSubject('${s.name}')"
        style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:.3rem .75rem;font-size:.8rem;cursor:pointer;color:#374151;"
        onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#f3f4f6'">
        + ${s.name}
      </button>`).join('');
  };

  window.modalAddSubject = (subj) => {
    const _max = getMaxStudentSubjects(); if (allocated.length >= _max) { toast(`Maximum ${_max} subjects allowed. Change limit in Settings → General.`, 'warning'); return; }
    if (!allocated.includes(subj)) { allocated.push(subj); render(); }
  };
  window.modalRemoveSubject = (subj) => {
    allocated = allocated.filter(s => s !== subj); render();
  };

  showModal(`
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #f3f4f6;">
      <div style="width:42px;height:42px;border-radius:50%;background:${stringToColor(student.name)};
        display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.9rem;flex-shrink:0;">
        ${student.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
      </div>
      <div>
        <h3 style="margin:0;">${student.name}</h3>
        <p style="margin:.15rem 0 0;font-size:.85rem;color:#6b7280;">${student.id} · ${cls} ${arm} · Max 9 subjects</p>
      </div>
    </div>

    <div style="margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
        <label style="${labelStyle()};margin:0;">Allocated Subjects</label>
        <span id="modal-alloc-count" style="${badgeStyle('info')}">0/9</span>
      </div>
      <div id="modal-student-chips" style="display:flex;flex-wrap:wrap;gap:.35rem;min-height:48px;padding:.75rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;"></div>
    </div>

    <div style="margin-bottom:1.5rem;">
      <label style="${labelStyle()}">Available Subjects (click to add)</label>
      <div id="modal-subject-pool" style="display:flex;flex-wrap:wrap;gap:.35rem;padding:.5rem 0;max-height:200px;overflow-y:auto;"></div>
    </div>

    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="saveStudentAllocation('${studentId}','${cls}','${arm}')" style="${btnStyle('primary')}">💾 Save Allocation</button>
    </div>`);

  window._currentModalAllocation = () => allocated;
  render();
};

window.saveStudentAllocation = function(studentId, cls, arm) {
  const allocated = window._currentModalAllocation?.() || [];
  if (allocated.length === 0) { toast('Please allocate at least one subject.', 'warning'); return; }
  const _maxS = getMaxStudentSubjects(); if (allocated.length > _maxS) { toast(`Maximum ${_maxS} subjects allowed.`, 'error'); return; }
  App.data.subjectAllocations[studentId] = allocated;
  // Save to backend
  const _subIds = allocated.map(n => App.data.subjects.find(s=>s.name===n)?.id).filter(Boolean);
  Results.setStudentAllocation(studentId, _subIds)
    .then(() => toast(`✅ Subjects saved for ${App.data.students.find(s=>s.id===studentId)?.name}!`, 'success'))
    .catch(e => toast('Backend save failed: ' + e.message, 'warning'));
  closeModal();
  loadSubjectAllocation();
};

/* ── Bulk Allocate Modal (SS2/SS3) ── */
window.openBulkAllocModal = function(cls, arm) {
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  const allSubjects = App.data.subjects; // All subjects available — student picks their choice
  let selected = [];

  const render = () => {
    const chipsEl = document.getElementById('bulk-alloc-chips');
    const countEl = document.getElementById('bulk-alloc-count');
    if (chipsEl) chipsEl.innerHTML = selected.map(subj=>`
      <span class="alloc-chip">${subj}
        <button onclick="bulkRemoveSubj('${subj}')">✕</button>
      </span>`).join('') || '<span style="color:#9ca3af;font-size:.82rem;">Select subjects below</span>';
    if (countEl) { countEl.textContent = `${selected.length}/9`; countEl.style.cssText = badgeStyle(selected.length>9?'danger':'info'); }
    const pool = document.getElementById('bulk-alloc-pool');
    if (pool) pool.innerHTML = allSubjects.filter(s=>!selected.includes(s.name)).map(s=>`
      <button onclick="bulkAddSubj('${s.name}')"
        style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:.3rem .75rem;font-size:.8rem;cursor:pointer;color:#374151;"
        onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#f3f4f6'">
        + ${s.name}
      </button>`).join('');
  };

  window.bulkAddSubj = (subj) => {
    const _maxB = getMaxStudentSubjects(); if (selected.length >= _maxB) { toast(`Max ${_maxB} subjects.`, 'warning'); return; }
    if (!selected.includes(subj)) { selected.push(subj); render(); }
  };
  window.bulkRemoveSubj = (subj) => { selected = selected.filter(s => s !== subj); render(); };

  showModal(`
    <h3 style="margin:0 0 .25rem;">Bulk Subject Allocation</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">
      Apply same subjects to all <strong>${students.length} students</strong> in ${cls} ${arm}
    </p>

    <div style="background:#fef3c7;border-radius:8px;padding:.65rem .9rem;font-size:.85rem;color:#92400e;margin-bottom:1.25rem;">
      ⚠ This will overwrite existing individual allocations. Max ${getMaxStudentSubjects()} subjects per student.
    </div>

    <div style="margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
        <label style="${labelStyle()};margin:0;">Selected Subjects</label>
        <span id="bulk-alloc-count" style="${badgeStyle('info')}">0/9</span>
      </div>
      <div id="bulk-alloc-chips" style="display:flex;flex-wrap:wrap;gap:.35rem;min-height:48px;padding:.75rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;"></div>
    </div>

    <div style="margin-bottom:1.5rem;">
      <label style="${labelStyle()}">Available Subjects</label>
      <div id="bulk-alloc-pool" style="display:flex;flex-wrap:wrap;gap:.35rem;padding:.5rem 0;max-height:180px;overflow-y:auto;"></div>
    </div>

    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="confirmBulkAlloc('${cls}','${arm}')" style="${btnStyle('primary')}">⚡ Apply to All ${students.length} Students</button>
    </div>`);

  window._bulkAllocSelected = () => selected;
  render();
};

window.confirmBulkAlloc = async function(cls, arm) {
  const selected = window._bulkAllocSelected?.() || [];
  if (!selected.length) { toast('Select at least one subject.', 'warning'); return; }
  if (selected.length > getMaxStudentSubjects()) { toast(`Max ${getMaxStudentSubjects()} subjects.`, 'error'); return; }
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  students.forEach(s => { App.data.subjectAllocations[s.id] = [...selected]; });
  // Save to backend
  const subIds = selected.map(name => {
    const sub = App.data.subjects.find(s => s.name === name);
    return sub?.id;
  }).filter(Boolean);
  try {
    await Results.bulkSetStudentAllocations({ class: cls, arm, subjects: subIds });
    toast(`✅ ${selected.length} subjects saved for ${students.length} students!`, 'success');
  } catch(e) {
    toast('Backend save failed: ' + e.message + ' (saved locally)', 'warning');
  }
  closeModal();
  loadSubjectAllocation();
};


/* ── TAB SWITCHING ──────────────────────────────────────────────────────── */
window.switchResultTab = function(tab) {
  ['single','bulk','allocate','verify','cumulative'].forEach(t => {
    const panel = document.getElementById(`result-tab-${t}`);
    const btn   = document.getElementById(`tab-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.style.cssText   = activeTabStyle(t === tab);
  });
  if (tab === 'cumulative') renderCumulativeTab();
  if (tab === 'verify')     renderVerifyTab();
};

/* ── ARM POPULATION ─────────────────────────────────────────────────────── */
window.populateResultStudents = function() {
  const cls = document.getElementById('res-class')?.value;
  if (!cls) return;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel    = document.getElementById('res-arm');
  if (armSel && classData?.arms?.length) {
    const current = armSel.value; // preserve selection if possible
    armSel.innerHTML = classData.arms.map(a =>
      `<option ${a === current ? 'selected' : ''}>${a}</option>`
    ).join('');
    // If current arm no longer valid, default to first
    if (!classData.arms.includes(current)) armSel.value = classData.arms[0];
  }
};

window.populateBulkArms = function() {
  const cls = document.getElementById('bulk-res-class')?.value;
  if (!cls) return;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel    = document.getElementById('bulk-res-arm');
  if (armSel && classData?.arms?.length) {
    const current = armSel.value;
    armSel.innerHTML = classData.arms.map(a =>
      `<option ${a === current ? 'selected' : ''}>${a}</option>`
    ).join('');
    if (!classData.arms.includes(current)) armSel.value = classData.arms[0];
  }
};

/* ── SINGLE ENTRY ───────────────────────────────────────────────────────── */
window.loadResultEntry = function() {
  const cls     = document.getElementById('res-class').value;
  const arm     = document.getElementById('res-arm').value;
  const subject = document.getElementById('res-subject').value;
  const term    = document.getElementById('res-term').value;
  const session = document.getElementById('res-session').value;

  if (!priv.canEnterResults())       { denyAccess('You do not have permission to enter results.'); return; }
  if (!priv.canActOnClass(cls, arm)) { denyAccess('You can only enter results for your assigned class.'); return; }

  const students = App.data.students.filter(s => s.class===cls && s.arm===arm);
  if (!students.length) return toast('No students found for this class/arm.', 'warning');

  document.getElementById('result-entry-table').innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <h4 style="margin:0 0 1rem;">${cls} ${arm} • ${subject} • ${term} ${session}</h4>
      <div style="overflow-x:auto;">
      <table style="${tableStyle()}">
        <thead><tr style="${thRowStyle()}">
          <th style="${thStyle()}">Student ID</th><th style="${thStyle()}">Name</th>
          <th style="${thStyle()}">CA (${(getScoreBreakdown?Object.entries(getScoreBreakdown()).filter(([k])=>/^ca/i.test(k)).reduce((s,[,v])=>s+v,0):40)||40})</th>
          <th style="${thStyle()}">Exam (${getScoreBreakdown?(Object.entries(getScoreBreakdown()).find(([k])=>/exam/i.test(k))?.[1]||60):60})</th>
          <th style="${thStyle()}">Total</th><th style="${thStyle()}">Grade</th><th style="${thStyle()}">Remark</th>
        </tr></thead>
        <tbody id="result-rows">
          ${students.map(s => {
            const ex = App.data.results.find(r => r.studentId===s.id && r.subject===subject && r.term===term && r.session===session);
            return `<tr style="${trStyle()}" data-sid="${s.id}">
              <td style="${tdStyle()}">${s.id}</td><td style="${tdStyle()}">${s.name}</td>
              <td style="${tdStyle()}"><input type="number" min="0" max="${(getScoreBreakdown?Object.entries(getScoreBreakdown()).filter(([k])=>/^ca/i.test(k)).reduce((s,[,v])=>s+v,0):40)||40}" class="ca-input" value="${ex?.ca??''}" placeholder="0-${(getScoreBreakdown?Object.entries(getScoreBreakdown()).filter(([k])=>/^ca/i.test(k)).reduce((s,[,v])=>s+v,0):40)||40}" style="${inputStyle('sm')}" oninput="calcTotal(this)"></td>
              <td style="${tdStyle()}"><input type="number" min="0" max="${getScoreBreakdown?(Object.entries(getScoreBreakdown()).find(([k])=>/exam/i.test(k))?.[1]||60):60}" class="exam-input" value="${ex?.exam??''}" placeholder="0-${getScoreBreakdown?(Object.entries(getScoreBreakdown()).find(([k])=>/exam/i.test(k))?.[1]||60):60}" style="${inputStyle('sm')}" oninput="calcTotal(this)"></td>
              <td style="${tdStyle()}" class="total-cell">${ex?.total??'-'}</td>
              <td style="${tdStyle()}" class="grade-cell">${ex ? grade(ex.total).letter : '-'}</td>
              <td style="${tdStyle()}" class="remark-cell">${ex ? grade(ex.total).remark : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
      <div style="display:flex;gap:.75rem;margin-top:1.25rem;justify-content:flex-end;">
        <button onclick="saveAllResults('${cls}','${arm}','${subject}','${term}','${session}')" style="${btnStyle('primary')}">💾 Save All Results</button>
      </div>
    </div>`;
  // Recalculate totals for pre-loaded rows (existing results)
  requestAnimationFrame(() => {
    $$('#result-rows tr').forEach(row => {
      const caEl = row.querySelector('.ca-input');
      if (caEl && caEl.value !== '') calcTotal(caEl);
    });
  });
};

window.calcTotal = function(input) {
  const row    = input.closest('tr');
  const caEl   = row.querySelector('.ca-input');
  const examEl = row.querySelector('.exam-input');

  // Get max limits from settings
  const bk      = typeof getScoreBreakdown === 'function' ? getScoreBreakdown() : {};
  const maxCA   = Object.entries(bk).filter(([k]) => /^ca/i.test(k)).reduce((s,[,v]) => s+v, 0) || 40;
  const maxExam = Object.entries(bk).find(([k]) => /exam/i.test(k))?.[1] || 60;

  // Clamp values to their maximums
  if (caEl && caEl.value !== '') {
    const v = parseFloat(caEl.value);
    if (!isNaN(v) && v > maxCA) {
      caEl.value = maxCA;
      caEl.style.borderColor = '#ef4444';
      caEl.title = `Maximum CA score is ${maxCA}`;
    } else if (!isNaN(v) && v < 0) {
      caEl.value = 0;
    } else {
      caEl.style.borderColor = '';
      caEl.title = '';
    }
  }
  if (examEl && examEl.value !== '') {
    const v = parseFloat(examEl.value);
    if (!isNaN(v) && v > maxExam) {
      examEl.value = maxExam;
      examEl.style.borderColor = '#ef4444';
      examEl.title = `Maximum Exam score is ${maxExam}`;
    } else if (!isNaN(v) && v < 0) {
      examEl.value = 0;
    } else {
      examEl.style.borderColor = '';
      examEl.title = '';
    }
  }

  const ca   = parseFloat(caEl?.value)   || 0;
  const exam = parseFloat(examEl?.value) || 0;
  const hasValue = (caEl?.value !== '' && caEl?.value != null) || (examEl?.value !== '' && examEl?.value != null);
  const total = hasValue ? (ca + exam) : null;
  const g = total !== null ? grade(total) : null;
  const totalCell  = row.querySelector('.total-cell');
  const gradeCell  = row.querySelector('.grade-cell');
  const remarkCell = row.querySelector('.remark-cell');
  if (totalCell)  totalCell.textContent  = total !== null ? total : '-';
  if (gradeCell)  gradeCell.textContent  = g ? g.letter : '-';
  if (remarkCell) remarkCell.textContent = g ? g.remark : '-';
  if (totalCell && total !== null) {
    const pass = typeof getPassMark === 'function' ? getPassMark() : 40;
    totalCell.style.color      = total >= pass ? '#16a34a' : '#dc2626';
    totalCell.style.fontWeight = '700';
  }
};

window.saveAllResults = async function(cls, arm, subject, term, session) {
  if (!priv.canEnterResults())       { denyAccess('You do not have permission to save results.'); return; }
  if (!priv.canActOnClass(cls, arm)) { denyAccess('You can only save results for your assigned class.'); return; }

  const btn = document.querySelector('[onclick*="saveAllResults"]');
  const origText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const rows = [];
  $$('#result-rows tr').forEach(row => {
    const sid      = row.dataset.sid;
    const caVal    = row.querySelector('.ca-input')?.value;
    const examVal  = row.querySelector('.exam-input')?.value;
    const bk2     = typeof getScoreBreakdown === 'function' ? getScoreBreakdown() : {};
    const _maxCA   = Object.entries(bk2).filter(([k]) => /^ca/i.test(k)).reduce((s,[,v]) => s+v, 0) || 40;
    const _maxExam = Object.entries(bk2).find(([k]) => /exam/i.test(k))?.[1] || 60;
    const ca       = caVal   !== '' && caVal   != null ? Math.min(_maxCA,   Math.max(0, parseFloat(caVal)))   : null;
    const exam     = examVal !== '' && examVal != null ? Math.min(_maxExam, Math.max(0, parseFloat(examVal))) : null;
    // Skip completely empty rows
    if (!sid || (ca === null && exam === null)) return;
    // Skip invalid values
    if ((ca   !== null && isNaN(ca))   ) return;
    if ((exam !== null && isNaN(exam)) ) return;
    rows.push({ student_id: sid, studentId: sid, ca: ca ?? 0, exam: exam ?? 0 });
  });

  if (!rows.length) { toast('No scores to save.', 'warning'); if (btn) { btn.disabled=false; btn.textContent=origText; } return; }

  let saved = 0, failed = 0;
  try {
    // Use bulk endpoint for efficiency
    const resp = await Results.bulkCreate({
      results: rows.map(r => ({ student_id: r.studentId, subject, term, session, ca: r.ca, exam: r.exam }))
    });
    saved = resp.saved || resp.data?.saved || rows.length;
    failed = resp.skipped || 0;

    // Update local cache
    rows.forEach(r => {
      const total = Math.min(r.ca + r.exam, getMaxScore ? getMaxScore() : 100);
      const entry = { studentId: r.studentId, class: cls, arm, subject, term, session, ca: r.ca, exam: r.exam, total };
      const idx = App.data.results.findIndex(x => x.studentId===r.studentId && x.subject===subject && x.term===term && x.session===session);
      if (idx >= 0) App.data.results[idx] = { ...App.data.results[idx], ...entry };
      else App.data.results.push(entry);
    });

    toast(`✅ ${saved} result(s) saved to database!${failed > 0 ? ` (${failed} skipped)` : ''}`, 'success');
  } catch(e) {
    console.error('[saveAllResults]', e);
    toast('Save failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText || '💾 Save All Results'; }
  }
};

/* ── EXCEL BULK IMPORT ──────────────────────────────────────────────────── */

/* Drag-and-drop handler */
window.handleExcelDrop = function(e) {
  e.preventDefault();
  const zone = document.getElementById('excel-drop-zone');
  zone.style.borderColor = '#d1d5db'; zone.style.background = '#f9fafb';
  const file = e.dataTransfer.files[0];
  if (file) processExcelFile(file);
};

window.handleExcelFileSelect = function(input) {
  if (input.files[0]) processExcelFile(input.files[0]);
};

/* Shared processing */
function processExcelFile(file) {
  const info = document.getElementById('excel-file-info');
  const ext  = file.name.split('.').pop().toLowerCase();
  if (!['xlsx','xls'].includes(ext)) {
    info.innerHTML = `<p style="color:#ef4444;font-size:.875rem;">⚠ Please upload an .xlsx or .xls file.</p>`;
    return;
  }
  info.innerHTML = `<p style="color:#6b7280;font-size:.85rem;">⏳ Reading <strong>${file.name}</strong>…</p>`;

  parseResultsExcel(file).then(rawRows => {
    const parsed = rawRows.map(normaliseRow);
    window._parsedExcelRows = parsed;

    const valid   = parsed.filter(p => p.ok);
    const invalid = parsed.filter(p => !p.ok);

    info.innerHTML = `<p style="font-size:.85rem;color:#374151;">✅ File loaded: <strong>${file.name}</strong> — ${parsed.length} row(s) found.</p>`;

    document.getElementById('preview-stats').textContent =
      `${valid.length} valid · ${invalid.length} invalid`;
    document.getElementById('preview-stats').style.cssText =
      badgeStyle(invalid.length > 0 ? 'warning' : 'success');

    document.getElementById('bulk-excel-preview-section').style.display = '';
    document.getElementById('btn-import-excel').disabled = valid.length === 0;

    const rows = parsed.map(p => `
      <tr style="${trStyle()}">
        <td style="${tdStyle()}">${p.rowNum}</td>
        <td style="${tdStyle()}">${p.sid||'—'}</td>
        <td style="${tdStyle()}">${p.subject||'—'}</td>
        <td style="${tdStyle()};text-align:center;">${isNaN(p.ca)?'—':p.ca}</td>
        <td style="${tdStyle()};text-align:center;">${isNaN(p.exam)?'—':p.exam}</td>
        <td style="${tdStyle()};text-align:center;">${p.ok ? Math.min(p.ca+p.exam,100) : '—'}</td>
        <td style="${tdStyle()}">${p.term||'—'}</td>
        <td style="${tdStyle()}">
          ${p.ok
            ? `<span style="${badgeStyle('success')}">✔ OK</span>`
            : `<span style="${badgeStyle('danger')}" title="${p.errors.join('; ')}">✘ ${p.errors[0]}${p.errors.length>1?' +'+(p.errors.length-1):''}</span>`}
        </td>
      </tr>`).join('');

    document.getElementById('bulk-result-preview').innerHTML = `
      <table style="${tableStyle()}font-size:.82rem;">
        <thead><tr style="${thRowStyle()}">
          <th style="${thStyle()}">#</th>
          <th style="${thStyle()}">Student ID</th>
          <th style="${thStyle()}">Subject</th>
          <th style="${thStyle()}">CA</th>
          <th style="${thStyle()}">Exam</th>
          <th style="${thStyle()}">Total</th>
          <th style="${thStyle()}">Term</th>
          <th style="${thStyle()}">Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }).catch(err => {
    info.innerHTML = `<p style="color:#ef4444;font-size:.875rem;">⚠ Could not read file: ${err.message}</p>`;
  });
}

window.clearExcelImport = function() {
  window._parsedExcelRows = null;
  document.getElementById('excel-file-input').value = '';
  document.getElementById('excel-file-info').innerHTML = '';
  document.getElementById('bulk-excel-preview-section').style.display = 'none';
  document.getElementById('bulk-result-preview').innerHTML = '';
};

window.saveBulkExcelResults = async function() {
  const cls = document.getElementById('bulk-res-class').value;
  const arm = document.getElementById('bulk-res-arm').value;
  if (!priv.canEnterResults())       { denyAccess('You do not have permission to enter results.'); return; }
  if (!priv.canActOnClass(cls, arm)) { denyAccess('You can only enter results for your assigned class.'); return; }

  const rows = (window._parsedExcelRows || []).filter(r => r.ok);
  if (!rows.length) { toast('No valid rows to import.', 'warning'); return; }

  const btn = document.getElementById('btn-import-excel');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  const defaultSession = App.data.schoolInfo?.session || '';
  const payload = rows.map(r => ({
    student_id: r.sid, studentId: r.sid,
    subject: r.subject, term: r.term,
    session: r.session || defaultSession,
    ca: r.ca, exam: r.exam,
  }));

  try {
    const resp   = await Results.bulkCreate({ results: payload });
    const saved  = resp.saved || resp.data?.saved || rows.length;
    const skipped= resp.skipped || 0;

    // Update local cache
    rows.forEach(r => {
      const session = r.session || defaultSession;
      const total   = Math.min(r.ca + r.exam, getMaxScore ? getMaxScore() : 100);
      const entry   = { studentId: r.sid, class: cls, arm, subject: r.subject, term: r.term, session, ca: r.ca, exam: r.exam, total };
      const idx     = App.data.results.findIndex(res =>
        res.studentId===r.sid && res.subject===r.subject && res.term===r.term && res.session===session);
      if (idx >= 0) App.data.results[idx] = entry;
      else App.data.results.push(entry);
    });

    toast(`✅ ${saved} result(s) saved to database!${skipped ? ` (${skipped} skipped)` : ''}`, 'success');
    if (saved > 0) clearExcelImport();
  } catch(e) {
    toast('Import failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Import Valid Results'; }
  }
};
/* ─────────────────────────────────────────
   13. REPORT CARDS
   Admin   → full access + add all remarks
   Teacher → view only (their class), can add teacher remark for their arm
   Parent  → not accessible (redirected to results)
───────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CARDS MODULE  –  Layout matches quarterly column design
   Admin   → full access + all remarks
   Teacher → view only (their class/arm), can add teacher remark
   Parent  → redirected to results
   ───────────────────────────────────────────────────────────────────────────── */


/* ─────────────────────────────────────────────────────────────────────────────
  14 
  ATTENDANCE & DOMAIN ASSESSMENT MODULE
   • Spreadsheet-style register — all session days as columns
   • Month-grouped column headers with day-of-week labels
   • Click cells to cycle P → L → A → E
   • Today's column highlighted with outline
   • Weekends auto-shaded and non-interactive
   • Per-row running totals: Present / Absent / Late + % bar
   • Day-total row at the bottom showing class presence per day
   • Domain Assessment tab (Cognitive / Affective / Psychomotor + Behaviours)
   • Summary & Stats tab with alert flags for students below 75%
   • Export to CSV
   ───────────────────────────────────────────────────────────────────────────── */

/* ── Term date ranges — edit to match your school calendar ─────────────────── */
const ATT_TERM_DATES = {
  'First Term':  { start: [2025,  8,  8], end: [2025, 11, 12] },
  'Second Term': { start: [2026,  0, 12], end: [2026,  3,  3] },
  'Third Term':  { start: [2026,  4,  4], end: [2026,  7,  1] },
};

const ATT_CYCLE      = ['P', 'L', 'A', 'E'];
const ATT_CHIP_STYLE = {
  P: 'background:#dcfce7;color:#166534;border-color:#bbf7d0',
  A: 'background:#fee2e2;color:#991b1b;border-color:#fca5a5',
  L: 'background:#fef9c3;color:#854d0e;border-color:#fde68a',
  E: 'background:#e0f2fe;color:#075985;border-color:#bae6fd',
  H: 'background:#f1f5f9;color:#94a3b8;border-color:#e2e8f0',
};

const ATT_BEHAVIORS = [
  'Attentiveness','Punctuality','Neatness','Politeness',
  'Honesty','Creativity','Cooperation','Leadership'
];

/* ── Module-level state ─────────────────────────────────────────────────────── */
let _attSchoolDays = [];
let _attActiveTab  = 'attendance';

/* ── CSS injection ──────────────────────────────────────────────────────────── */
(function injectAttStyles() {
  if (document.getElementById('att-module-styles')) return;
  const s = document.createElement('style');
  s.id = 'att-module-styles';
  s.textContent = `
    .att-chip{display:inline-block;width:20px;height:20px;border-radius:3px;font-size:10px;font-weight:700;line-height:20px;text-align:center;cursor:pointer;border:0.5px solid transparent}
    .att-sheet-wrap{overflow-x:auto;border:1px solid var(--border,#e2e8f0);border-radius:10px}
    table.att-reg{border-collapse:collapse;font-size:11px;min-width:100%}
    table.att-reg th,table.att-reg td{border:0.5px solid var(--border,#e2e8f0);white-space:nowrap}
    .att-name{min-width:150px;padding:4px 8px;font-size:11px;position:sticky;left:0;z-index:1;background:var(--surface,#fff)}
    .att-day-cell{width:26px;min-width:26px;text-align:center;padding:2px 1px;cursor:pointer;user-select:none}
    .att-wknd{background:#f8fafc!important;cursor:default}
    .att-sum{min-width:40px;text-align:center;padding:4px 5px;font-size:11px;font-weight:600;background:var(--surface2,#f8fafc)}
    .att-pct-good{color:#166534}.att-pct-warn{color:#854d0e}.att-pct-bad{color:#991b1b}
    .att-tab{padding:6px 16px;font-size:12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);background:var(--surface,#fff);color:var(--text2,#6b7280);cursor:pointer;font-family:inherit}
    .att-tab.active{background:#1e3a8a;color:#fff;border-color:#1e3a8a}
    .att-stat{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px 14px}
    .att-stat .sv{font-size:22px;font-weight:700;line-height:1}
    .att-stat .sl{font-size:11px;color:var(--text2,#6b7280);margin-top:3px}
    .att-alert{background:#fee2e2;color:#991b1b;font-size:10px;padding:1px 6px;border-radius:3px;margin-left:6px;font-weight:600}
  `;
  document.head.appendChild(s);
})();

/* ── Entry point ────────────────────────────────────────────────────────────── */

/* ── CUMULATIVE RESULTS ─────────────────────────────────────────────────── */

window.populateCumulativeArms = function() {
  const cls = document.getElementById('cum-class')?.value;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel = document.getElementById('cum-arm');
  if (armSel && classData) armSel.innerHTML = (classData.arms||[]).map(a=>`<option>${a}</option>`).join('');
};

function renderCumulativeTab() {
  populateCumulativeArms();
  // Inject the tab div into DOM if it doesn't exist yet
  if (!document.getElementById('result-tab-cumulative')) {
    const div = document.createElement('div');
    div.id = 'result-tab-cumulative';
    div.className = 'fade-in';
    div.style.display = 'none';
    const classOpts = App.data.classes.map(c=>`<option>${c.name}</option>`).join('');
    div.innerHTML = `
      <div class="result-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
          <div>
            <h4 style="margin:0 0 .3rem;color:#1e3a5f;">🎓 Cumulative Session Results &amp; Promotion</h4>
            <p style="margin:0;font-size:.82rem;color:#6b7280;">Aggregates all three terms. Auto-promotion applies saved criteria from Settings.</p>
          </div>
          ${!priv.isTeacher() ? `<button onclick="openAutoPromotionWizard()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:.55rem 1.1rem;font-size:.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.4rem;white-space:nowrap;">⚡ Run Auto-Promotion</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:1.25rem;">
          <div>
            <label style="${labelStyle()}">Class</label>
            <select id="cum-class" style="${inputStyle()}" onchange="populateCumulativeArms()">${classOpts}</select>
          </div>
          <div>
            <label style="${labelStyle()}">Arm</label>
            <select id="cum-arm" style="${inputStyle()}"><option>A</option></select>
          </div>
          <div>
            <label style="${labelStyle()}">Session</label>
            <input id="cum-session" value="${App.data.schoolInfo?.session||'2025/2026'}" style="${inputStyle()}">
          </div>
          <div>
            <label style="${labelStyle()}">View Mode</label>
            <select id="cum-view-mode" style="${inputStyle()}">
              <option value="summary">Summary (Avg per Subject)</option>
              <option value="full">Full (All 3 Terms)</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
          <button onclick="loadCumulativeResults()" style="${btnStyle('primary')}">📊 Load Cumulative Results</button>
          <button onclick="exportCumulativeCSV()" style="${btnStyle('secondary')}">⬇ Export CSV</button>
          <span id="cum-promotion-criteria-badge" style="font-size:.78rem;color:#6b7280;padding:.35rem .75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;"></span>
        </div>
      </div>
      <div id="cumulative-results-area"></div>
      <!-- Auto-Promotion Wizard Modal -->
      <div id="auto-promo-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:none;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:16px;padding:2rem;max-width:540px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.25);">
          <div id="auto-promo-modal-content"></div>
        </div>
      </div>`;

    // Insert before the switchResultTab script area — append to the results section
    const section = document.getElementById('results');
    if (section) section.appendChild(div);
  }
  populateCumulativeArms();
}

window.loadCumulativeResults = async function() {
  const cls     = document.getElementById('cum-class')?.value;
  const arm     = document.getElementById('cum-arm')?.value;
  const session = document.getElementById('cum-session')?.value;
  const area    = document.getElementById('cumulative-results-area');
  if (!cls || !arm || !session || !area) return;

  area.innerHTML = `<div class="result-card" style="text-align:center;padding:2rem;color:#6b7280;">Loading cumulative results…</div>`;

  try {
    // Try backend API first (has server-side promotion logic)
    const resp = await Results.getCumulative({ class: cls, arm, session });
    const rows = resp.data || [];
    const summary = resp.summary || {};
    const ps = resp.promotionSettings || getPromotionSettings();

    if (!rows.length) {
      area.innerHTML = `<div class="result-card" style="text-align:center;color:#9ca3af;padding:2rem;">No results found for ${cls} ${arm} — ${session}</div>`;
      return;
    }

    _renderCumulativeResults(rows, summary, ps, cls, arm, session);
  } catch(e) {
    // Fallback to client-side computation
    console.warn('[cumulative] API failed, using local data:', e.message);
    const ps       = getPromotionSettings();
    const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
    if (!students.length) { area.innerHTML = `<div class="result-card" style="text-align:center;color:#9ca3af;">No students in ${cls} ${arm}</div>`; return; }

    const rows = students.map(s => ({ studentId: s.id, name: s.name, class: s.class, arm: s.arm, attendance: s.attendance, ...computeCumulative(s.id, session) }));
    const ranked = [...rows].filter(r => r.grandAvg !== null).sort((a,b)=>(b.grandAvg||0)-(a.grandAvg||0));
    ranked.forEach((r,i) => { r.position = i+1; });

    const summary = {
      total:      rows.length,
      promoted:   rows.filter(r => r.promotion === ps.labelPromoted).length,
      repeat:     rows.filter(r => r.promotion === ps.labelRepeat).length,
      incomplete: rows.filter(r => r.promotion === ps.labelIncomplete).length,
      classAvg:   ranked.length ? parseFloat((ranked.reduce((s,r)=>s+r.grandAvg,0)/ranked.length).toFixed(1)) : null,
    };
    _renderCumulativeResults([...ranked, ...rows.filter(r=>r.grandAvg===null)], summary, ps, cls, arm, session);
  }
};

function _renderCumulativeResults(rows, summary, ps, cls, arm, session) {
  const area = document.getElementById('cumulative-results-area');
  if (!area) return;
  const promoColor = { [ps.labelPromoted]:'#16a34a', [ps.labelRepeat]:'#dc2626', [ps.labelIncomplete]:'#d97706' };
  const viewMode   = document.getElementById('cum-view-mode')?.value || 'summary';
  const passMark   = getPassMark();

  // Update the criteria badge
  const badge = document.getElementById('cum-promotion-criteria-badge');
  if (badge) {
    const parts = [];
    if (ps.useAverage)    parts.push(`Avg ≥ ${ps.minAverage}%`);
    if (ps.usePassCount)  parts.push(`Pass ≥ ${ps.minPassCount} subj`);
    if (ps.useAttendance) parts.push(`Attend ≥ ${ps.minAttendance}%`);
    if (ps.useNoFail)     parts.push(`No subj < ${ps.noFailMark}%`);
    if (ps.useCoreSubjects && ps.coreSubjects?.length) parts.push(`Core: ${ps.coreSubjects.join(', ')}`);
    badge.textContent = parts.length ? '⚙ Criteria: ' + parts.join(' · ') : '⚙ No criteria set';
  }

  const allSubjects = rows[0]?.subjects || [];

  /* ── Per-student card view (full 3-term mode) ── */
  if (viewMode === 'full') {
    area.innerHTML = `
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.85rem;margin-bottom:1.5rem;">
        ${[
          ['Total Students', summary.total || rows.length, '#1e3a5f'],
          [ps.labelPromoted || 'PROMOTED', summary.promoted || 0, '#16a34a'],
          [ps.labelRepeat   || 'REPEAT',   summary.repeat   || 0, '#dc2626'],
          ['Incomplete', summary.incomplete || 0, '#d97706'],
          ['Class Average', (summary.classAvg != null ? summary.classAvg + '%' : '—'), '#7c3aed'],
        ].map(([l,v,c])=>`
          <div style="background:#fff;border-radius:10px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid ${c};text-align:center;">
            <div style="font-size:1.5rem;font-weight:800;color:${c};">${v}</div>
            <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${l}</div>
          </div>`).join('')}
      </div>

      ${rows.map(r => {
        const dc   = promoColor[r.promotion] || '#6b7280';
        const subs = r.subjects || [];
        const pos  = r.position || '—';
        return `
        <div style="background:#fff;border-radius:14px;margin-bottom:1.25rem;box-shadow:0 4px 16px rgba(0,0,0,.08);overflow:hidden;">
          <!-- Student header -->
          <div style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:.85rem 1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
            <div>
              <span style="font-weight:700;font-size:1rem;color:#1e3a5f;">${r.name}</span>
              <span style="font-size:.78rem;color:#9ca3af;margin-left:.5rem;">${r.studentId}</span>
              ${ps.showCumulativePosition ? `<span style="font-size:.78rem;color:#7c3aed;margin-left:.75rem;font-weight:600;">Position: ${pos}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:.75rem;">
              <span style="font-size:.82rem;color:#6b7280;">Grand Avg: <strong style="color:#1e3a5f;">${r.grandAvg ?? '—'}</strong></span>
              <span style="background:${dc}18;color:${dc};font-weight:800;font-size:.82rem;padding:.3rem .8rem;border-radius:6px;white-space:nowrap;">${r.promotion}</span>
            </div>
          </div>
          <!-- Subject rows with T1/T2/T3 breakdown -->
          <div style="overflow-x:auto;">
          <table style="${tableStyle()}">
            <thead><tr style="${thRowStyle()}">
              <th style="${thStyle()}">Subject</th>
              <th style="${thStyle('65px')}">1st Term</th>
              <th style="${thStyle('65px')}">2nd Term</th>
              <th style="${thStyle('65px')}">3rd Term</th>
              <th style="${thStyle('70px')}">Cumulative Avg</th>
              <th style="${thStyle('55px')}">Grade</th>
              <th style="${thStyle('90px')}">Status</th>
            </tr></thead>
            <tbody>
              ${subs.map(sub => {
                const passed = sub.avg !== null && sub.avg >= passMark;
                const rowBg  = sub.avg !== null && !passed ? '#fff5f5' : '';
                const termCell = (v) => `<td style="${tdStyle()};text-align:center;color:${v!==null&&v<passMark?'#dc2626':'#374151'};">${v ?? '<span style="color:#d1d5db;">—</span>'}</td>`;
                return `<tr style="${trStyle()};${rowBg?'background:'+rowBg+';':''}">
                  <td style="${tdStyle()};font-weight:600;">${sub.name}</td>
                  ${termCell(sub.t1)}${termCell(sub.t2)}${termCell(sub.t3)}
                  <td style="${tdStyle()};text-align:center;font-weight:700;color:${passed?'#1e3a8a':'#dc2626'};">${sub.avg ?? '—'}</td>
                  <td style="${tdStyle()};text-align:center;">${sub.grade}</td>
                  <td style="${tdStyle()};text-align:center;">
                    <span style="background:${passed?'#dcfce7':'#fee2e2'};color:${passed?'#166534':'#991b1b'};padding:2px 8px;border-radius:4px;font-size:.75rem;font-weight:700;">
                      ${passed ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </td>
                </tr>`;
              }).join('')}
              <tr style="background:#eff6ff;font-weight:700;">
                <td style="${tdStyle()};font-weight:800;">TOTALS</td>
                <td style="${tdStyle()};text-align:center;color:#6b7280;">${subs.some(s=>s.t1!==null)?subs.filter(s=>s.t1!==null).reduce((a,s)=>a+s.t1,0):'—'}</td>
                <td style="${tdStyle()};text-align:center;color:#6b7280;">${subs.some(s=>s.t2!==null)?subs.filter(s=>s.t2!==null).reduce((a,s)=>a+s.t2,0):'—'}</td>
                <td style="${tdStyle()};text-align:center;color:#6b7280;">${subs.some(s=>s.t3!==null)?subs.filter(s=>s.t3!==null).reduce((a,s)=>a+s.t3,0):'—'}</td>
                <td style="${tdStyle()};text-align:center;font-size:1.05rem;font-weight:800;color:#1e3a5f;">${r.grandAvg ?? '—'}</td>
                <td style="${tdStyle()};text-align:center;">${r.grandAvg !== null ? grade(r.grandAvg).letter : '—'}</td>
                <td style="${tdStyle()};text-align:center;font-size:.78rem;color:#6b7280;">${r.passed||0} passed / ${subs.filter(s=>s.avg!==null).length} total</td>
              </tr>
            </tbody>
          </table>
          </div>
          ${r.reasons?.length && r.promotion !== ps.labelPromoted ? `
          <div style="padding:.5rem 1.25rem;background:#fff5f5;border-top:1px solid #fecaca;font-size:.78rem;color:#991b1b;">
            ⚠ ${r.reasons.join(' · ')}
          </div>` : ''}
        </div>`;
      }).join('')}`;
    return;
  }

  /* ── Summary table view (default) ── */
  area.innerHTML = `
    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.85rem;margin-bottom:1.5rem;">
      ${[
        ['Total Students', summary.total || rows.length, '#1e3a5f'],
        [ps.labelPromoted || 'PROMOTED', summary.promoted || 0,   '#16a34a'],
        [ps.labelRepeat   || 'REPEAT',   summary.repeat   || 0,   '#dc2626'],
        ['Incomplete',  summary.incomplete || 0, '#d97706'],
        ['Class Average', (summary.classAvg != null ? summary.classAvg+'%' : '—'), '#7c3aed'],
      ].map(([l,v,c])=>`
        <div style="background:#fff;border-radius:10px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid ${c};text-align:center;">
          <div style="font-size:1.5rem;font-weight:800;color:${c};">${v}</div>
          <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${l}</div>
        </div>`).join('')}
    </div>

    <!-- Per-student summary table -->
    <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
        <h4 style="margin:0;color:#1e3a5f;">📊 ${cls} ${arm} — ${session} Cumulative Results</h4>
        <span style="font-size:.82rem;color:#6b7280;">${rows.length} students · hover subject cell for term breakdown</span>
      </div>
      <div style="overflow-x:auto;">
      <table style="${tableStyle()}">
        <thead>
          <tr style="${thRowStyle()}">
            <th style="${thStyle('40px')}">#</th>
            <th style="${thStyle()}">Student</th>
            ${allSubjects.map(s=>`<th style="${thStyle('70px')}" title="${s.name}">${s.name.length>8?s.name.substring(0,7)+'…':s.name}</th>`).join('')}
            <th style="${thStyle('70px')}">Grand Avg</th>
            <th style="${thStyle('55px')}">Grade</th>
            <th style="${thStyle('60px')}">Passed</th>
            ${ps.showCumulativePosition?`<th style="${thStyle('45px')}">Pos</th>`:''}
            <th style="${thStyle('110px')}">Decision</th>
          </tr>
          <!-- Sub-header: T1/T2/T3 per subject -->
          <tr style="background:#f0f4ff;">
            <td style="${tdStyle()}" colspan="2"></td>
            ${allSubjects.map(()=>`<td style="text-align:center;padding:2px 4px;font-size:.65rem;color:#6b7280;border-bottom:1px solid #e5e7eb;">T1·T2·T3</td>`).join('')}
            <td colspan="${2 + (ps.showCumulativePosition?2:1) + 1}" style="${tdStyle()}"></td>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const pos  = r.position || '—';
            const dc   = promoColor[r.promotion] || '#6b7280';
            const subs = r.subjects || [];
            return `<tr style="${trStyle()}">
              <td style="${tdStyle()};font-size:.78rem;color:#9ca3af;">${pos}</td>
              <td style="${tdStyle()}">
                <div style="font-weight:600;font-size:.875rem;">${r.name}</div>
                <div style="font-size:.72rem;color:#9ca3af;">${r.studentId}</div>
              </td>
              ${subs.map(sub=>`
                <td style="${tdStyle()};text-align:center;padding:4px;" title="${sub.name}&#10;1st: ${sub.t1??'—'} | 2nd: ${sub.t2??'—'} | 3rd: ${sub.t3??'—'}&#10;Avg: ${sub.avg??'—'}">
                  <div style="font-weight:${sub.avg!==null&&sub.avg>=passMark?'600':'400'};color:${sub.avg!==null&&sub.avg<passMark?'#dc2626':'#111'};">
                    ${sub.avg !== null ? sub.avg : '—'}
                  </div>
                  <div style="font-size:.6rem;color:#9ca3af;margin-top:1px;">${sub.t1??'—'}·${sub.t2??'—'}·${sub.t3??'—'}</div>
                  ${sub.avg!==null?`<div style="font-size:.65rem;color:#6b7280;">${sub.grade}</div>`:''}
                </td>`).join('')}
              <td style="${tdStyle()};text-align:center;font-weight:700;font-size:1rem;color:#1e3a5f;">${r.grandAvg ?? '—'}</td>
              <td style="${tdStyle()};text-align:center;">${r.grandAvg !== null ? grade(r.grandAvg).letter : '—'}</td>
              <td style="${tdStyle()};text-align:center;">${r.passed||0}/${subs.filter(x=>x.avg!==null).length}</td>
              ${ps.showCumulativePosition?`<td style="${tdStyle()};text-align:center;font-weight:600;">${pos}</td>`:''}
              <td style="${tdStyle()};text-align:center;">
                <span style="background:${dc}18;color:${dc};font-weight:800;font-size:.75rem;padding:.25rem .6rem;border-radius:5px;white-space:nowrap;">
                  ${r.promotion}
                </span>
                ${r.reasons?.length && r.promotion !== ps.labelPromoted ? `
                <div style="font-size:.65rem;color:#ef4444;margin-top:2px;" title="${r.reasons.join('; ')}">ⓘ ${r.reasons[0].substring(0,30)}${r.reasons[0].length>30?'…':''}</div>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>`;
};

/* ══════════════════════════════════════════════════════════
   AUTO-PROMOTION WIZARD
══════════════════════════════════════════════════════════ */
window.openAutoPromotionWizard = function() {
  if (!priv.isAdmin()) { toast('Only Admin can run auto-promotion.', 'error'); return; }
  const ps = getPromotionSettings();
  const modal = document.getElementById('auto-promo-modal');
  const content = document.getElementById('auto-promo-modal-content');
  if (!modal || !content) return;

  const classOpts = App.data.classes.map(c => `<option>${c.name}</option>`).join('');
  const criteriaList = [];
  if (ps.useAverage)    criteriaList.push(`<li>Cumulative average ≥ <strong>${ps.minAverage}%</strong></li>`);
  if (ps.usePassCount)  criteriaList.push(`<li>At least <strong>${ps.minPassCount}</strong> subjects passed</li>`);
  if (ps.useNoFail)     criteriaList.push(`<li>No subject below <strong>${ps.noFailMark}%</strong></li>`);
  if (ps.useAttendance) criteriaList.push(`<li>Attendance ≥ <strong>${ps.minAttendance}%</strong></li>`);
  if (ps.useCoreSubjects && ps.coreSubjects?.length) criteriaList.push(`<li>Must pass core subjects: <strong>${ps.coreSubjects.join(', ')}</strong></li>`);

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;">
      <div>
        <h3 style="margin:0 0 .3rem;color:#1e3a5f;">⚡ Auto-Promotion Wizard</h3>
        <p style="margin:0;font-size:.85rem;color:#6b7280;">Evaluates each student and stamps a promotion decision based on saved criteria.</p>
      </div>
      <button onclick="document.getElementById('auto-promo-modal').style.display='none'" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#9ca3af;line-height:1;">×</button>
    </div>
git add .

    <!-- Active Criteria display -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;">
      <div style="font-weight:700;font-size:.85rem;color:#166534;margin-bottom:.5rem;">✅ Active Promotion Criteria</div>
      ${criteriaList.length
        ? `<ul style="margin:0;padding-left:1.25rem;font-size:.85rem;color:#374151;line-height:1.8;">${criteriaList.join('')}</ul>`
        : `<p style="margin:0;font-size:.85rem;color:#6b7280;">No criteria enabled. Go to Settings → Promotion to configure.</p>`}
      <a onclick="document.getElementById('auto-promo-modal').style.display='none';document.querySelector('[data-settings-tab=\"promotion\"]')?.click();"
         style="font-size:.8rem;color:#16a34a;cursor:pointer;margin-top:.5rem;display:inline-block;text-decoration:underline;">
        Edit criteria in Settings →
      </a>
    </div>

    <!-- Class / Arm / Session -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
      <div>
        <label style="${labelStyle()}">Class</label>
        <select id="ap-class" style="${inputStyle()}" onchange="populateAutoPromoArms()">${classOpts}</select>
      </div>
      <div>
        <label style="${labelStyle()}">Arm</label>
        <select id="ap-arm" style="${inputStyle()}"><option>A</option></select>
      </div>
      <div>
        <label style="${labelStyle()}">Session</label>
        <input id="ap-session" value="${App.data.schoolInfo?.session||'2025/2026'}" style="${inputStyle()}">
      </div>
    </div>

    <!-- Scope -->
    <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:1rem;margin-bottom:1.25rem;">
      <label style="${labelStyle()}">Scope</label>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:.35rem;">
        <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.875rem;">
          <input type="radio" name="ap-scope" value="arm" checked> Selected Class &amp; Arm only
        </label>
        <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.875rem;">
          <input type="radio" name="ap-scope" value="class"> All arms of selected class
        </label>
        <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.875rem;">
          <input type="radio" name="ap-scope" value="all"> ALL classes &amp; arms (entire school)
        </label>
      </div>
    </div>

    <div id="ap-preview-area" style="margin-bottom:1.25rem;"></div>

    <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
      <button onclick="previewAutoPromotion()" style="${btnStyle('secondary')}">🔍 Preview Results</button>
      <button id="ap-apply-btn" onclick="applyAutoPromotion()" style="${btnStyle('primary')};display:none;">⚡ Apply Promotion Decisions</button>
      <button onclick="document.getElementById('auto-promo-modal').style.display='none'" style="${btnStyle('ghost'||'secondary')}">Cancel</button>
    </div>`;

  modal.style.display = 'flex';
  populateAutoPromoArms();
};

window.populateAutoPromoArms = function() {
  const cls = document.getElementById('ap-class')?.value;
  const sel = document.getElementById('ap-arm');
  if (!sel || !cls) return;
  const c = App.data.classes.find(x => x.name === cls);
  const arms = c?.arms || ['A'];
  sel.innerHTML = arms.map(a => `<option>${a}</option>`).join('');
};

window.previewAutoPromotion = function() {
  const cls     = document.getElementById('ap-class')?.value;
  const arm     = document.getElementById('ap-arm')?.value;
  const session = document.getElementById('ap-session')?.value;
  const scope   = document.querySelector('input[name="ap-scope"]:checked')?.value || 'arm';
  const ps      = getPromotionSettings();
  const preview = document.getElementById('ap-preview-area');
  if (!preview) return;

  let students = [];
  if (scope === 'arm')   students = App.data.students.filter(s => s.class===cls && s.arm===arm);
  else if (scope==='class') students = App.data.students.filter(s => s.class===cls);
  else students = [...App.data.students];

  if (!students.length) { preview.innerHTML = `<p style="color:#ef4444;font-size:.875rem;">No students found.</p>`; return; }

  const results = students.map(s => ({ s, cum: computeCumulative(s.id, session) }));
  const promoted = results.filter(r => r.cum.promotion === ps.labelPromoted).length;
  const repeat   = results.filter(r => r.cum.promotion === ps.labelRepeat).length;
  const incomplete = results.filter(r => r.cum.promotion === ps.labelIncomplete).length;

  preview.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:.75rem;">
      <div style="font-weight:700;font-size:.875rem;color:#1e3a5f;margin-bottom:.75rem;">📋 Preview — ${students.length} students</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem;">
        <div style="background:#dcfce7;border-radius:8px;padding:.75rem;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#16a34a;">${promoted}</div>
          <div style="font-size:.72rem;font-weight:700;color:#166534;text-transform:uppercase;">${ps.labelPromoted}</div>
        </div>
        <div style="background:#fee2e2;border-radius:8px;padding:.75rem;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#dc2626;">${repeat}</div>
          <div style="font-size:.72rem;font-weight:700;color:#991b1b;text-transform:uppercase;">${ps.labelRepeat}</div>
        </div>
        <div style="background:#fef3c7;border-radius:8px;padding:.75rem;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#d97706;">${incomplete}</div>
          <div style="font-size:.72rem;font-weight:700;color:#92400e;text-transform:uppercase;">INCOMPLETE</div>
        </div>
      </div>
      <div style="max-height:200px;overflow-y:auto;">
        <table style="${tableStyle()}">
          <thead><tr style="${thRowStyle()}">
            <th style="${thStyle()}">Student</th>
            <th style="${thStyle('60px')}">Class</th>
            <th style="${thStyle('70px')}">Grand Avg</th>
            <th style="${thStyle('80px')}">Passed</th>
            <th style="${thStyle('110px')}">Decision</th>
          </tr></thead>
          <tbody>
            ${results.map(({s, cum}) => {
              const dc = { [ps.labelPromoted]:'#16a34a', [ps.labelRepeat]:'#dc2626', [ps.labelIncomplete]:'#d97706' }[cum.promotion] || '#6b7280';
              return `<tr style="${trStyle()}">
                <td style="${tdStyle()};font-weight:600;">${s.name}</td>
                <td style="${tdStyle()};text-align:center;">${s.class} ${s.arm}</td>
                <td style="${tdStyle()};text-align:center;font-weight:700;">${cum.grandAvg ?? '—'}</td>
                <td style="${tdStyle()};text-align:center;">${cum.passed}/${cum.subjects.filter(x=>x.avg!==null).length}</td>
                <td style="${tdStyle()};text-align:center;">
                  <span style="background:${dc}18;color:${dc};font-weight:800;font-size:.75rem;padding:.2rem .5rem;border-radius:4px;">${cum.promotion}</span>
                  ${cum.reasons?.length && cum.promotion!==ps.labelPromoted ? `<div style="font-size:.62rem;color:#ef4444;margin-top:1px;" title="${cum.reasons.join('; ')}">ⓘ ${cum.reasons[0].substring(0,25)}…</div>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  const applyBtn = document.getElementById('ap-apply-btn');
  if (applyBtn) applyBtn.style.display = '';
  // Store results for apply step
  window._apPreviewData = results;
};

window.applyAutoPromotion = function() {
  const data = window._apPreviewData;
  if (!data?.length) { toast('Please run Preview first.', 'warning'); return; }
  const ps    = getPromotionSettings();
  const session = document.getElementById('ap-session')?.value;

  if (!confirm(`Apply promotion decisions for ${data.length} student(s)?\n\nThis will record the decision in each student's cumulative record for session ${session}. It does NOT move students to a new class — use Student Management for class transitions.`)) return;

  let applied = 0;
  data.forEach(({ s, cum }) => {
    // Store the promotion decision on the student record
    if (!App.data.promotionRecords) App.data.promotionRecords = [];
    const existing = App.data.promotionRecords.find(r => r.studentId === s.id && r.session === session);
    const record   = {
      studentId:  s.id,
      session,
      decision:   cum.promotion,
      grandAvg:   cum.grandAvg,
      passed:     cum.passed,
      failed:     cum.failed,
      reasons:    cum.reasons || [],
      appliedBy:  App.currentUser?.username || 'admin',
      appliedAt:  new Date().toISOString(),
    };
    if (existing) { Object.assign(existing, record); }
    else          { App.data.promotionRecords.push(record); }
    applied++;
  });

  saveAppData?.();
  document.getElementById('auto-promo-modal').style.display = 'none';
  toast(`✅ Promotion decisions applied for ${applied} student(s).`, 'success');

  // Refresh cumulative view if open
  if (document.getElementById('result-tab-cumulative')?.style.display !== 'none') {
    loadCumulativeResults();
  }
};

window.exportCumulativeCSV = function() {
  const cls     = document.getElementById('cum-class')?.value;
  const arm     = document.getElementById('cum-arm')?.value;
  const session = document.getElementById('cum-session')?.value;
  const ps      = getPromotionSettings();

  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  if (!students.length) { toast('No students found', 'warning'); return; }

  const rows = students.map(s => ({ student: s, cum: computeCumulative(s.id, session) }));
  const allSubjects = rows[0]?.cum.subjects.map(s => s.name) || [];

  const headers = ['Name','Student ID','Class','Arm',...allSubjects,'Average','Grade','Passed','Decision'];
  const lines   = [headers.join(',')];
  rows.forEach(({student:s, cum:c}) => {
    const subScores = allSubjects.map(n => {
      const sub = c.subjects.find(x => x.name === n);
      return sub?.avg ?? '';
    });
    lines.push([
      `"${s.name}"`, s.id, s.class, s.arm,
      ...subScores,
      c.grandAvg ?? '', c.grandAvg !== null ? grade(c.grandAvg).letter : '',
      c.passed, c.promotion,
    ].join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `cumulative_${cls}_${arm}_${session.replace('/','_')}.csv`;
  a.click();
  toast('CSV exported!', 'success');
};

/* ── SCORE VERIFICATION TAB ─────────────────────────────────────────────── */

function renderVerifyTab() {
  if (!document.getElementById('result-tab-verify')) {
    const div = document.createElement('div');
    div.id = 'result-tab-verify';
    div.className = 'fade-in';
    div.style.display = 'none';
    const classOpts  = App.data.classes.map(c=>`<option>${c.name}</option>`).join('');
    const termOpts   = ['First Term','Second Term','Third Term'].map(t=>`<option ${t===App.data.schoolInfo?.term?'selected':''}>${t}</option>`).join('');
    div.innerHTML = `
      <div class="result-card">
        <h4 style="margin:0 0 1.25rem;color:#1e3a5f;">🔍 Score Verification — Entered & Missing</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:1rem;">
          <div>
            <label style="${labelStyle()}">Class</label>
            <select id="vfy-class" style="${inputStyle()}" onchange="populateVerifyArms()">${classOpts}</select>
          </div>
          <div>
            <label style="${labelStyle()}">Arm</label>
            <select id="vfy-arm" style="${inputStyle()}">
              ${(App.data.classes[0]?.arms||['A']).map(a=>`<option>${a}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="${labelStyle()}">Term</label>
            <select id="vfy-term" style="${inputStyle()}">${termOpts}</select>
          </div>
          <div>
            <label style="${labelStyle()}">Session</label>
            <input id="vfy-session" value="${App.data.schoolInfo?.session||'2025/2026'}" style="${inputStyle()}">
          </div>
        </div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
          <button onclick="loadVerifyResults()" style="${btnStyle('primary')}">🔍 Verify Scores</button>
          <button onclick="exportVerifyCSV()" style="${btnStyle('secondary')}">⬇ Export Missing</button>
        </div>
      </div>
      <div id="verify-results-area"></div>`;
    const section = document.getElementById('results');
    if (section) section.appendChild(div);
  }
  populateVerifyArms();
}

window.populateVerifyArms = function() {
  const cls = document.getElementById('vfy-class')?.value;
  const classData = App.data.classes.find(c => c.name === cls);
  const sel = document.getElementById('vfy-arm');
  if (sel && classData?.arms?.length)
    sel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
};

window.loadVerifyResults = async function() {
  const cls     = document.getElementById('vfy-class')?.value;
  const arm     = document.getElementById('vfy-arm')?.value;
  const term    = document.getElementById('vfy-term')?.value;
  const session = document.getElementById('vfy-session')?.value;
  const area    = document.getElementById('verify-results-area');
  if (!cls || !arm || !term || !session || !area) return;

  area.innerHTML = `<div class="result-card" style="text-align:center;padding:2rem;color:#6b7280;">Loading…</div>`;

  // Fetch fresh results from API
  let apiResults = [];
  try {
    const resp = await Results.getAll({ class: cls, arm, term, session });
    apiResults = resp.data || [];
    // Merge into App.data so grade calculations work
    apiResults.forEach(r => {
      const idx = App.data.results.findIndex(x => x.id === r.id);
      if (idx >= 0) App.data.results[idx] = r;
      else App.data.results.push(r);
    });
  } catch(e) {
    apiResults = App.data.results.filter(r => r.term === term && r.session === session);
  }

  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  if (!students.length) {
    area.innerHTML = `<div class="result-card" style="text-align:center;color:#9ca3af;padding:2rem;">No students in ${cls} ${arm}</div>`;
    return;
  }

  // Get allocated subjects from API — returns [{id, name, code}]
  let allocSubs = [];
  try {
    const resp = await Results.getClassAllocation(cls, arm);
    const raw  = resp.subjects || resp.data || [];
    // API returns objects with name field; extract names for string comparison
    allocSubs = raw.map(s => (typeof s === 'string' ? s : s.name)).filter(Boolean);
    // Also update local cache
    if (allocSubs.length) App.data.subjectAllocations[`${cls}_${arm}`] = allocSubs;
  } catch(e) { console.warn('[loadVerify] allocation fetch failed:', e.message); }
  if (!allocSubs.length) allocSubs = App.data.subjectAllocations[`${cls}_${arm}`] || App.data.subjects.map(s => s.name);
  if (!allocSubs.length) { area.innerHTML = `<div class="result-card" style="text-align:center;color:#d97706;padding:2rem;">⚠ No subjects allocated to ${cls} ${arm}. Go to Subject Allocation tab first.</div>`; return; }

  const maxCA   = getScoreBreakdown ? Object.entries(getScoreBreakdown()).filter(([k])=>/^ca/i.test(k)).reduce((s,[,v])=>s+v,0)||40 : 40;
  const maxExam = getScoreBreakdown ? (Object.entries(getScoreBreakdown()).find(([k])=>/exam/i.test(k))?.[1]||60) : 60;
  const passMark= typeof getPassMark === 'function' ? getPassMark() : 40;

  // Count stats
  const totalCells   = students.length * allocSubs.length;
  let   enteredCells = 0;

  // Build the verification matrix
  const matrix = students.map(s => {
    const row = { student: s, subjects: {} };
    allocSubs.forEach(sub => {
      const r = apiResults.find(x => x.studentId === s.id && x.subject === sub)
             || App.data.results.find(x => x.studentId === s.id && x.subject === sub && x.term === term && x.session === session);
      if (r) { enteredCells++; row.subjects[sub] = r; }
      else    { row.subjects[sub] = null; }
    });
    return row;
  });

  const pct = totalCells > 0 ? Math.round(enteredCells/totalCells*100) : 0;
  const barColor = pct === 100 ? '#16a34a' : pct > 60 ? '#2563eb' : pct > 0 ? '#d97706' : '#dc2626';

  area.innerHTML = `
    <!-- Summary bar -->
    <div style="background:#fff;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.5rem;">
        <span style="font-weight:700;color:#1e3a5f;">${cls} ${arm} · ${term} · ${session}</span>
        <span style="font-size:.85rem;color:#6b7280;">${enteredCells} / ${totalCells} scores entered (${pct}%)</span>
      </div>
      <div style="height:10px;background:#f3f4f6;border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:5px;transition:width .5s;"></div>
      </div>
      <div style="display:flex;gap:1rem;margin-top:.75rem;flex-wrap:wrap;font-size:.8rem;">
        <span style="color:#16a34a;">✓ Entered: ${enteredCells}</span>
        <span style="color:#dc2626;">✕ Missing: ${totalCells - enteredCells}</span>
        <span style="color:#6b7280;">${students.length} students · ${allocSubs.length} subjects</span>
      </div>
    </div>

    <!-- Filter -->
    <div style="display:flex;gap:.5rem;margin-bottom:.75rem;flex-wrap:wrap;align-items:center;">
      <label style="font-size:.8rem;font-weight:600;color:#374151;">Show:</label>
      <button onclick="vfyFilter('all')"     id="vfy-btn-all"     style="padding:.3rem .8rem;border-radius:6px;font-size:.78rem;cursor:pointer;background:#1e3a5f;color:#fff;border:none;font-weight:600;">All</button>
      <button onclick="vfyFilter('missing')" id="vfy-btn-missing" style="padding:.3rem .8rem;border-radius:6px;font-size:.78rem;cursor:pointer;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;">Missing Only</button>
      <button onclick="vfyFilter('entered')" id="vfy-btn-entered" style="padding:.3rem .8rem;border-radius:6px;font-size:.78rem;cursor:pointer;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;">Entered Only</button>
      <button onclick="vfyFilter('failing')" id="vfy-btn-failing" style="padding:.3rem .8rem;border-radius:6px;font-size:.78rem;cursor:pointer;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;">Failing (< Pass Mark)</button>
    </div>

    <!-- Matrix table -->
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <div style="overflow-x:auto;">
      <table style="${tableStyle()}" id="vfy-table">
        <thead>
          <tr style="${thRowStyle()}">
            <th style="${thStyle('180px')}">Student</th>
            ${allocSubs.map(sub=>`
              <th style="${thStyle('80px')};text-align:center;" title="${sub}">
                <div style="max-width:75px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.68rem;">${sub}</div>
                <div style="font-size:.62rem;color:#9ca3af;font-weight:400;">${maxCA}+${maxExam}</div>
              </th>`).join('')}
            <th style="${thStyle('70px')}">Total</th>
            <th style="${thStyle('60px')}">Avg</th>
            <th style="${thStyle('55px')}">Grade</th>
            <th style="${thStyle('80px')}">Status</th>
          </tr>
        </thead>
        <tbody>
          ${matrix.map(row => {
            const scores  = allocSubs.map(sub => row.subjects[sub]).filter(Boolean);
            // Always recompute total from ca+exam
            const total   = scores.reduce((s,r) => s + (Number(r.ca??0) + Number(r.exam??0)), 0);
            const avg     = scores.length ? parseFloat((total/scores.length).toFixed(1)) : null;
            const g       = avg !== null ? grade(avg) : { letter:'—', remark:'—' };
            const missing = allocSubs.filter(sub => !row.subjects[sub]).length;
            const failing = allocSubs.filter(sub => {
              const rs = row.subjects[sub];
              return rs && (Number(rs.ca??0) + Number(rs.exam??0)) < passMark;
            }).length;
            const rowStatus = missing > 0 ? 'missing' : failing > 0 ? 'failing' : 'complete';
            const rowBg = missing > 0 ? '' : failing > 0 ? '#fff9f0' : '#f0fdf4';

            return `<tr class="vfy-row vfy-${rowStatus}" style="${trStyle()};background:${rowBg};" data-sid="${row.student.id}">
              <td style="${tdStyle()};font-weight:600;">
                <div style="font-size:.875rem;">${row.student.name}</div>
                <div style="font-size:.7rem;color:#9ca3af;">${row.student.id}</div>
              </td>
              ${allocSubs.map(sub => {
                const r = row.subjects[sub];
                if (!r) return `
                  <td style="${tdStyle()};text-align:center;background:#fff5f5;">
                    <button onclick="quickEnterScore('${row.student.id}','${row.student.name}','${sub}','${cls}','${arm}','${term}','${session}')"
                      style="font-size:.68rem;color:#dc2626;background:#fee2e2;border:1px dashed #dc2626;border-radius:4px;padding:.2rem .4rem;cursor:pointer;white-space:nowrap;">
                      ✕ Enter
                    </button>
                  </td>`;
                const rTotal = Number(r.ca??0) + Number(r.exam??0);
                const isLow  = rTotal < passMark;
                return `
                  <td style="${tdStyle()};text-align:center;background:${isLow?'#fff9f0':''}" title="CA:${r.ca??'—'} Exam:${r.exam??'—'} Total:${rTotal}">
                    <div style="font-weight:700;font-size:.82rem;color:${isLow?'#dc2626':'#1e3a5f'}">${rTotal}</div>
                    <div style="font-size:.62rem;color:#9ca3af">${r.ca??'—'}+${r.exam??'—'}</div>
                  </td>`;
              }).join('')}
              <td style="${tdStyle()};text-align:center;font-weight:700;">${scores.length > 0 ? total : '—'}</td>
              <td style="${tdStyle()};text-align:center;font-weight:700;color:${avg!==null&&avg<passMark?'#dc2626':'#1e3a5f'};">${avg??'—'}</td>
              <td style="${tdStyle()};text-align:center;">${g.letter}</td>
              <td style="${tdStyle()};text-align:center;">
                ${rowStatus === 'complete' ? `<span style="background:#dcfce7;color:#166534;padding:.15rem .5rem;border-radius:4px;font-size:.72rem;font-weight:600;">✓ Complete</span>`
                : rowStatus === 'failing'  ? `<span style="background:#fef3c7;color:#92400e;padding:.15rem .5rem;border-radius:4px;font-size:.72rem;font-weight:600;">⚠ ${failing} failing</span>`
                                            : `<span style="background:#fee2e2;color:#991b1b;padding:.15rem .5rem;border-radius:4px;font-size:.72rem;font-weight:600;">✕ ${missing} missing</span>`}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>`;

  // Store data for export
  window._vfyData = { matrix, allocSubs, cls, arm, term, session, maxCA, maxExam, passMark };
};

window.vfyFilter = function(type) {
  ['all','missing','entered','failing'].forEach(t => {
    const btn = document.getElementById(`vfy-btn-${t}`);
    if (btn) btn.style.cssText = t===type
      ? 'padding:.3rem .8rem;border-radius:6px;font-size:.78rem;cursor:pointer;background:#1e3a5f;color:#fff;border:none;font-weight:600;'
      : 'padding:.3rem .8rem;border-radius:6px;font-size:.78rem;cursor:pointer;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;';
  });
  document.querySelectorAll('.vfy-row').forEach(row => {
    const cls = row.className;
    if (type === 'all')     row.style.display = '';
    else if (type === 'missing') row.style.display = cls.includes('vfy-missing') ? '' : 'none';
    else if (type === 'entered') row.style.display = !cls.includes('vfy-missing') ? '' : 'none';
    else if (type === 'failing') row.style.display = cls.includes('vfy-failing') ? '' : 'none';
  });
};

window.quickEnterScore = function(studentId, studentName, subject, cls, arm, term, session) {
  const maxCA   = getScoreBreakdown ? Object.entries(getScoreBreakdown()).filter(([k])=>/^ca/i.test(k)).reduce((s,[,v])=>s+v,0)||40 : 40;
  const maxExam = getScoreBreakdown ? (Object.entries(getScoreBreakdown()).find(([k])=>/exam/i.test(k))?.[1]||60) : 60;
  showModal(`
    <h3 style="margin:0 0 .25rem;">✏️ Enter Score</h3>
    <div style="font-size:.85rem;color:#6b7280;margin-bottom:1.25rem;">${studentName} · ${subject} · ${term} ${session}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div>
        <label style="${labelStyle()}">CA (max ${maxCA})</label>
        <input id="qs-ca" type="number" min="0" max="${maxCA}" style="${inputStyle()}" placeholder="0–${maxCA}" autofocus>
      </div>
      <div>
        <label style="${labelStyle()}">Exam (max ${maxExam})</label>
        <input id="qs-exam" type="number" min="0" max="${maxExam}" style="${inputStyle()}" placeholder="0–${maxExam}">
      </div>
    </div>
    <div id="qs-preview" style="text-align:center;padding:.75rem;background:#f8fafc;border-radius:8px;margin-bottom:1rem;font-size:.9rem;color:#6b7280;">
      Total: — · Grade: —
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="submitQuickScore('${studentId}','${subject}','${cls}','${arm}','${term}','${session}')" style="${btnStyle('primary')}">💾 Save Score</button>
    </div>`);

  // Live preview
  ['qs-ca','qs-exam'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const ca   = parseInt(document.getElementById('qs-ca')?.value) || 0;
      const exam = parseInt(document.getElementById('qs-exam')?.value) || 0;
      const tot  = ca + exam;
      const g    = grade(tot);
      const prev = document.getElementById('qs-preview');
      if (prev) prev.innerHTML = `<strong>Total: ${tot}</strong> · Grade: <strong>${g.letter}</strong> · ${g.remark}`;
    });
  });
};

window.submitQuickScore = async function(studentId, subject, cls, arm, term, session) {
  const ca   = parseInt(document.getElementById('qs-ca')?.value) || 0;
  const exam = parseInt(document.getElementById('qs-exam')?.value) || 0;
  if (ca === 0 && exam === 0) { toast('Enter at least one score', 'warning'); return; }
  try {
    const resp = await Results.create({ studentId, subject, term, session, ca, exam });
    const saved = resp.data || resp;
    App.data.results.push(saved);
    closeModal();
    toast(`✓ Score saved for ${subject}`, 'success');
    // Refresh the verify table
    loadVerifyResults();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.exportVerifyCSV = function() {
  const d = window._vfyData;
  if (!d) { toast('Load verification first', 'warning'); return; }
  const headers = ['Name','Student ID', ...d.allocSubs,'Total','Average','Grade','Missing Count'];
  const lines   = [headers.join(',')];
  d.matrix.forEach(row => {
    const scores = d.allocSubs.map(sub => row.subjects[sub]);
    const total  = scores.filter(Boolean).reduce((s,r)=>s+(Number(r?.ca??0)+Number(r?.exam??0)),0);
    const avg    = scores.filter(Boolean).length ? parseFloat((total/scores.filter(Boolean).length).toFixed(1)) : '';
    const g      = avg !== '' ? grade(avg).letter : '';
    const missing= scores.filter(s=>!s).length;
    lines.push([
      `"${row.student.name}"`, row.student.id,
      ...scores.map(r => r ? Number(r.ca??0)+Number(r.exam??0) : 'MISSING'),
      total || '', avg || '', g,
      missing
    ].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `verify_${d.cls}_${d.arm}_${d.term.replace(' ','_')}_${d.session.replace('/','_')}.csv`;
  a.click();
  toast('CSV exported!', 'success');
};