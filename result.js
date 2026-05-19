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
            const avg = (tr.reduce((a,b)=>a+b.total,0)/tr.length).toFixed(1);
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
      <button id="tab-single"   onclick="switchResultTab('single')"   class="res-tab-btn" style="${activeTabStyle(true)}">📝 Single Entry</button>
      <button id="tab-bulk"     onclick="switchResultTab('bulk')"     class="res-tab-btn" style="${activeTabStyle(false)}">📊 Bulk Excel</button>
      <button id="tab-allocate" onclick="switchResultTab('allocate')" class="res-tab-btn" style="${activeTabStyle(false)}">📋 Subject Allocation</button>
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
            <select id="res-arm" style="${inputStyle()}" onchange="populateResultStudents()" ${isTeacher?'disabled':''}>
              <option>${preArm||'A'}</option>
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
            <select id="bulk-res-arm" style="${inputStyle()}" ${isTeacher?'disabled':''}><option>${preArm||'A'}</option></select>
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
window.loadSubjectAllocation = function() {
  const cls = document.getElementById('alloc-class')?.value;
  const arm = document.getElementById('alloc-arm')?.value;
  if (!cls || !arm) return toast('Select class and arm.', 'warning');

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
            <p style="margin:.25rem 0 0;font-size:.82rem;color:#6b7280;">SS2 &amp; SS3: Each student can have a personalised subject list (max 9)</p>
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
                  <span style="${badgeStyle(allocated.length>9?'danger':allocated.length>=7?'success':'info')}">${allocated.length}/9</span>
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

window.saveClassAllocation = function(cls, arm) {
  toast(`Subject allocation saved for ${cls} ${arm}!`, 'success');
};

window.clearClassAllocation = function(cls, arm) {
  if (!confirm('Clear all subjects for this class/arm?')) return;
  App.data.subjectAllocations[`${cls}_${arm}`] = [];
  loadSubjectAllocation();
  toast('Allocation cleared.', 'warning');
};

/* ── Individual student allocation modal (SS2/SS3) ── */
window.openStudentAllocModal = function(studentId, cls, arm) {
  const student  = App.data.students.find(s => s.id === studentId);
  const classKey = `${cls}_${arm}`;
  const base     = App.data.subjectAllocations[classKey] || App.data.subjects.filter(s=>s.level==='All'||s.level==='Senior').map(s=>s.name);
  let allocated  = [...(App.data.subjectAllocations[studentId] || base.slice(0,9))];

  const allSubjects = App.data.subjects.filter(s => s.level==='All'||s.level==='Senior');

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
      countEl.textContent = `${allocated.length}/9`;
      countEl.style.cssText = badgeStyle(allocated.length>9?'danger':allocated.length>=7?'success':'info');
    }
    if (poolEl) poolEl.innerHTML = allSubjects.filter(s=>!allocated.includes(s.name)).map(s=>`
      <button onclick="modalAddSubject('${s.name}')"
        style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:.3rem .75rem;font-size:.8rem;cursor:pointer;color:#374151;"
        onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#f3f4f6'">
        + ${s.name}
      </button>`).join('');
  };

  window.modalAddSubject = (subj) => {
    if (allocated.length >= 9) { toast('Maximum 9 subjects for SS2/SS3.', 'warning'); return; }
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
  if (allocated.length > 9)  { toast('Maximum 9 subjects allowed for SS2/SS3.', 'error'); return; }
  App.data.subjectAllocations[studentId] = allocated;
  closeModal();
  toast(`Subjects saved for ${App.data.students.find(s=>s.id===studentId)?.name}!`, 'success');
  loadSubjectAllocation();
};

/* ── Bulk Allocate Modal (SS2/SS3) ── */
window.openBulkAllocModal = function(cls, arm) {
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  const allSubjects = App.data.subjects.filter(s => s.level==='All'||s.level==='Senior');
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
    if (selected.length >= 9) { toast('Max 9 subjects.', 'warning'); return; }
    if (!selected.includes(subj)) { selected.push(subj); render(); }
  };
  window.bulkRemoveSubj = (subj) => { selected = selected.filter(s => s !== subj); render(); };

  showModal(`
    <h3 style="margin:0 0 .25rem;">Bulk Subject Allocation</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">
      Apply same subjects to all <strong>${students.length} students</strong> in ${cls} ${arm}
    </p>

    <div style="background:#fef3c7;border-radius:8px;padding:.65rem .9rem;font-size:.85rem;color:#92400e;margin-bottom:1.25rem;">
      ⚠ This will overwrite existing individual allocations. Max 9 subjects per student.
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

window.confirmBulkAlloc = function(cls, arm) {
  const selected = window._bulkAllocSelected?.() || [];
  if (!selected.length) { toast('Select at least one subject.', 'warning'); return; }
  if (selected.length > 9) { toast('Max 9 subjects.', 'error'); return; }
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  students.forEach(s => { App.data.subjectAllocations[s.id] = [...selected]; });
  closeModal();
  toast(`${selected.length} subjects allocated to ${students.length} students!`, 'success');
  loadSubjectAllocation();
};


/* ── TAB SWITCHING ──────────────────────────────────────────────────────── */
window.switchResultTab = function(tab) {
  ['single','bulk','allocate'].forEach(t => {
    const panel = document.getElementById(`result-tab-${t}`);
    const btn   = document.getElementById(`tab-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.style.cssText   = activeTabStyle(t === tab);
  });
};

/* ── ARM POPULATION ─────────────────────────────────────────────────────── */
window.populateResultStudents = function() {
  const cls = document.getElementById('res-class')?.value;
  if (!cls) return;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel = document.getElementById('res-arm');
  if (armSel && classData) armSel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
};

window.populateBulkArms = function() {
  const cls = document.getElementById('bulk-res-class')?.value;
  if (!cls) return;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel = document.getElementById('bulk-res-arm');
  if (armSel && classData) armSel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
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
          <th style="${thStyle()}">CA (40)</th><th style="${thStyle()}">Exam (60)</th>
          <th style="${thStyle()}">Total</th><th style="${thStyle()}">Grade</th><th style="${thStyle()}">Remark</th>
        </tr></thead>
        <tbody id="result-rows">
          ${students.map(s => {
            const ex = App.data.results.find(r => r.studentId===s.id && r.subject===subject && r.term===term && r.session===session);
            return `<tr style="${trStyle()}" data-sid="${s.id}">
              <td style="${tdStyle()}">${s.id}</td><td style="${tdStyle()}">${s.name}</td>
              <td style="${tdStyle()}"><input type="number" min="0" max="40" class="ca-input" value="${ex?.ca??''}" placeholder="0-40" style="${inputStyle('sm')}" oninput="calcTotal(this)"></td>
              <td style="${tdStyle()}"><input type="number" min="0" max="60" class="exam-input" value="${ex?.exam??''}" placeholder="0-60" style="${inputStyle('sm')}" oninput="calcTotal(this)"></td>
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
};

window.calcTotal = function(input) {
  const row  = input.closest('tr');
  const ca   = parseFloat(row.querySelector('.ca-input').value)   || 0;
  const exam = parseFloat(row.querySelector('.exam-input').value) || 0;
  const total = Math.min(ca + exam, 100);
  const g = grade(total);
  row.querySelector('.total-cell').textContent  = total;
  row.querySelector('.grade-cell').textContent  = g.letter;
  row.querySelector('.remark-cell').textContent = g.remark;
};

window.saveAllResults = function(cls, arm, subject, term, session) {
  if (!priv.canEnterResults())       { denyAccess('You do not have permission to save results.'); return; }
  if (!priv.canActOnClass(cls, arm)) { denyAccess('You can only save results for your assigned class.'); return; }

  let saved = 0;
  $$('#result-rows tr').forEach(row => {
    const sid  = row.dataset.sid;
    const ca   = parseFloat(row.querySelector('.ca-input').value);
    const exam = parseFloat(row.querySelector('.exam-input').value);
    if (isNaN(ca) || isNaN(exam)) return;
    const total = Math.min(ca + exam, 100);
    const entry = { studentId: sid, class: cls, arm, subject, term, session, ca, exam, total };
    const idx = App.data.results.findIndex(r => r.studentId===sid && r.subject===subject && r.term===term && r.session===session);
    if (idx >= 0) App.data.results[idx] = entry;
    else App.data.results.push(entry);
    saved++;
  });
  toast(`${saved} result(s) saved!`, 'success');
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

window.saveBulkExcelResults = function() {
  const cls = document.getElementById('bulk-res-class').value;
  const arm = document.getElementById('bulk-res-arm').value;
  if (!priv.canEnterResults())       { denyAccess('You do not have permission to enter results.'); return; }
  if (!priv.canActOnClass(cls, arm)) { denyAccess('You can only enter results for your assigned class.'); return; }

  const rows = (window._parsedExcelRows || []).filter(r => r.ok);
  if (!rows.length) { toast('No valid rows to import.', 'warning'); return; }

  const defaultSession = App.data.schoolInfo.session;
  let saved = 0, skipped = 0;

  rows.forEach(r => {
    const student = App.data.students.find(s => s.id === r.sid);
    if (!student) { skipped++; return; }
    const session = r.session || defaultSession;
    const total   = Math.min(r.ca + r.exam, 100);
    const entry   = { studentId: r.sid, class: cls, arm, subject: r.subject, term: r.term, session, ca: r.ca, exam: r.exam, total };
    const idx     = App.data.results.findIndex(res =>
      res.studentId===r.sid && res.subject===r.subject && res.term===r.term && res.session===session);
    if (idx >= 0) App.data.results[idx] = entry;
    else App.data.results.push(entry);
    saved++;
  });

  toast(`${saved} result(s) imported!${skipped ? ` ${skipped} skipped (student not found).` : ''}`, saved > 0 ? 'success' : 'warning');
  if (saved > 0) clearExcelImport();
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