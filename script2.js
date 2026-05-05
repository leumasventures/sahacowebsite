/* ============================================================
   Sacred Heart College – School Management Dashboard
   script2.js – v3.1  |  Enhanced Attendance, Subject Limit & Parent Token View
   ============================================================ */

'use strict';

// ... (keep all previous code up to renderReportCards() )

/* ─────────────────────────────────────────
   PARENT TOKEN-BASED REPORT CARD VIEW
───────────────────────────────────────── */
function renderParentView() {
  const section = document.getElementById('parent-portal') || document.createElement('div');
  section.id = 'parent-portal';
  section.innerHTML = `
    <div style="max-width:700px; margin:3rem auto; padding:2rem; background:#fff; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
      <h2 style="text-align:center; color:#1e40af; margin-bottom:1.5rem;">Parent / Guardian Report Card Access</h2>
      <p style="text-align:center; color:#64748b; margin-bottom:2rem;">
        Enter the unique token provided by the school to view your ward's report card.
      </p>

      <div style="margin-bottom:1.5rem;">
        <label style="${labelStyle()}">Access Token</label>
        <input id="parent-token-input" type="text" placeholder="e.g. SHC-PRC-2026-XXXXXX" 
          style="${inputStyle()}; font-family:monospace; letter-spacing:1px; text-transform:uppercase;">
      </div>

      <button onclick="validateParentToken()" 
        style="${btnStyle('primary')}; width:100%; padding:1rem; font-size:1.1rem;">
        View Report Card
      </button>

      <div id="parent-token-error" style="color:#ef4444; text-align:center; margin-top:1rem; min-height:1.5rem;"></div>
      <div id="parent-report-output" style="margin-top:2.5rem;"></div>
    </div>`;

  // If this is a new section, append it to body or appropriate container
  if (!document.getElementById('parent-portal')) {
    document.body.appendChild(section);
  }
}

window.validateParentToken = function() {
  const token = document.getElementById('parent-token-input')?.value.trim().toUpperCase();
  const errorEl = document.getElementById('parent-token-error');
  const outputEl = document.getElementById('parent-report-output');

  if (!token) {
    errorEl.textContent = "Please enter a token.";
    outputEl.innerHTML = '';
    return;
  }

  // Find matching token
  const tokenRecord = App.data.parentTokens?.find(t => t.token === token);
  if (!tokenRecord) {
    errorEl.textContent = "Invalid or expired token. Please check and try again.";
    outputEl.innerHTML = '';
    return;
  }

  // Check expiry
  if (tokenRecord.expires && new Date(tokenRecord.expires) < new Date()) {
    errorEl.textContent = "This token has expired.";
    outputEl.innerHTML = '';
    return;
  }

  // Get student
  const student = App.data.students.find(s => s.id === tokenRecord.studentId);
  if (!student) {
    errorEl.textContent = "Student record not found.";
    outputEl.innerHTML = '';
    return;
  }

  errorEl.textContent = '';
  renderSingleReportCard(student, outputEl, true); // true = parent view mode (no edit)
};

/* Generate token for a student (called from report card or admin panel) */
window.generateParentToken = function(studentId) {
  if (!priv.isAdmin()) return denyAccess("Only Admin can generate tokens.");

  const token = 'SHC-PRC-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();

  const expiryDays = 30;
  const expires = new Date();
  expires.setDate(expires.getDate() + expiryDays);

  App.data.parentTokens = App.data.parentTokens || [];
  // Remove old tokens for this student
  App.data.parentTokens = App.data.parentTokens.filter(t => t.studentId !== studentId);
  // Add new one
  App.data.parentTokens.push({
    token,
    studentId,
    created: new Date().toISOString(),
    expires: expires.toISOString(),
    used: false
  });

  // Show token to admin
  showModal(`
    <div style="text-align:center; padding:1rem;">
      <h3 style="margin:0 0 1rem; color:#1e40af;">Parent Access Token Generated</h3>
      <div style="font-family:monospace; font-size:1.4rem; letter-spacing:2px; background:#f1f5f9; padding:1rem; border-radius:8px; margin:1.5rem 0;">
        ${token}
      </div>
      <p style="color:#64748b; margin:0 0 1rem;">
        Give this token to the parent/guardian.<br>
        It expires on <strong>${expires.toLocaleDateString()}</strong>.
      </p>
      <button onclick="closeModal(); navigator.clipboard.writeText('${token}').then(()=>toast('Token copied!', 'success'))" 
        style="${btnStyle('primary')}">
        Copy Token
      </button>
    </div>`);

  // Optional: auto-copy to clipboard
  navigator.clipboard.writeText(token).catch(()=>{});
};

/* ─────────────────────────────────────────
   ENHANCED REPORT CARD – shows attendance + token button
───────────────────────────────────────── */
function renderSingleReportCard(student, container, isParentView = false) {
  const term    = document.getElementById('rc-term')?.value    || App.data.schoolInfo.term;
  const session = document.getElementById('rc-session')?.value || App.data.schoolInfo.session;

  const results = App.data.results.filter(r => 
    r.studentId === student.id && r.term === term && r.session === session
  );

  const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const subjectCount = results.length;
  const average = subjectCount ? (totalScore / subjectCount).toFixed(1) : 'N/A';
  const overallGrade = subjectCount ? grade(parseFloat(average)) : { letter: 'N/A', remark: 'No results' };

  const position = computePosition(student.id, student.class, student.arm, term, session);
  const remarkEntry = App.data.remarks.find(r => 
    r.studentId === student.id && r.term === term && r.session === session
  ) || {};

  const domains = getDomainScores(student.id, term, session);
  const school = App.data.schoolInfo || {};
  const teacher = App.data.teachers.find(t => t.class === student.class && t.arm === student.arm);

  const html = `
    <div class="report-card" style="background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.1); border:1px solid #e2e8f0;">

      <!-- HEADER -->
      <div style="background:linear-gradient(135deg, #1e3a8a, #3b82f6); color:white; padding:2rem 1.5rem; text-align:center;">
        <h1 style="margin:0; font-size:1.8rem;">${school.name || 'Sacred Heart College'}</h1>
        <p style="margin:0.5rem 0 0;">${term} Report Card • ${session}</p>
      </div>

      <!-- STUDENT INFO + ATTENDANCE -->
      <div style="padding:1.5rem; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:1.25rem;">
          <div><strong>Name:</strong> ${student.name}</div>
          <div><strong>Class:</strong> ${student.class} ${student.arm}</div>
          <div><strong>Admission No:</strong> ${student.id}</div>
        </div>

        <!-- Attendance Bar -->
        <div style="margin-top:1.5rem; padding:1rem; background:#f1f5f9; border-radius:10px;">
          <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem;">
            <span style="font-weight:600; min-width:110px;">Attendance</span>
            <div style="flex:1; height:14px; background:#e2e8f0; border-radius:7px; overflow:hidden;">
              <div style="width:${student.attendance || 0}%; height:100%; background:${student.attendance < 75 ? '#ef4444' : student.attendance < 90 ? '#f59e0b' : '#22c55e'}; transition:width 0.6s;"></div>
            </div>
            <strong style="min-width:70px; text-align:right; color:${student.attendance < 75 ? '#ef4444' : '#15803d'}">
              ${student.attendance || 0}%
            </strong>
          </div>
          ${student.attendance < 75 ? '<div style="color:#ef4444; font-size:0.9rem; text-align:center;">Low attendance – please improve</div>' : ''}
        </div>
      </div>

      <!-- RESULTS TABLE -->
      ${results.length ? `
        <div style="padding:1.5rem;">
          <h3 style="margin:0 0 1rem; color:#1e40af;">Academic Performance</h3>
          <div style="overflow-x:auto;">
            <table style="${tableStyle()} border-collapse:collapse; width:100%;">
              <thead>
                <tr style="background:#eff6ff;">
                  <th style="${thStyle()}">Subject</th>
                  <th style="${thStyle('90px')}">CA</th>
                  <th style="${thStyle('90px')}">Exam</th>
                  <th style="${thStyle('100px')}">Total</th>
                  <th style="${thStyle('70px')}">Grade</th>
                  <th style="${thStyle()}">Remark</th>
                </tr>
              </thead>
              <tbody>
                ${results.map(r => {
                  const g = grade(r.total);
                  return `
                    <tr>
                      <td style="${tdStyle()}">${r.subject}</td>
                      <td style="${tdStyle('text-align:center;')}">${r.ca||'—'}</td>
                      <td style="${tdStyle('text-align:center;')}">${r.exam||'—'}</td>
                      <td style="${tdStyle('text-align:center; font-weight:600;')}">${r.total||'—'}</td>
                      <td style="${tdStyle('text-align:center;')}"><span style="${badgeStyle(g.letter === 'A'?'success':g.letter === 'F'?'danger':'warning')}">${g.letter}</span></td>
                      <td style="${tdStyle()}">${g.remark}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div style="margin-top:1.5rem; padding:1.25rem; background:#eff6ff; border-radius:10px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
            <div><strong>Average:</strong> ${average}%</div>
            <div><strong>Grade:</strong> ${overallGrade.letter}</div>
            <div><strong>Position:</strong> ${position}</div>
          </div>
        </div>
      ` : '<div style="padding:2rem; text-align:center; color:#64748b;">No results recorded this term.</div>'}

      <!-- REMARKS -->
      <div style="padding:1.5rem; border-top:1px solid #e2e8f0;">
        <h3 style="margin:0 0 1rem; color:#1e40af;">Remarks</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
          <div>
            <strong>Class Teacher:</strong>
            <p style="margin:0.5rem 0 0; white-space:pre-wrap;">${remarkEntry.teacherRemark || '—'}</p>
          </div>
          <div>
            <strong>Principal:</strong>
            <p style="margin:0.5rem 0 0; white-space:pre-wrap;">${remarkEntry.principalRemark || '—'}</p>
          </div>
        </div>
      </div>

      <!-- PARENT TOKEN (only show in admin view) -->
      ${!isParentView && priv.isAdmin() ? `
        <div style="padding:1rem 1.5rem; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:right;">
          <button onclick="generateParentToken('${student.id}')" style="${btnStyle('info','sm')}">
            🔑 Generate Parent Access Token
          </button>
        </div>
      ` : ''}

    </div>`;

  container.innerHTML = html;
}

function renderReportCards() {
  // ... existing code ...

  // Add token generation button in each generated card (admin view only)
  if (priv.isAdmin()) {
    // After generating cards, you can add listener or inline onclick
    // Already handled in renderSingleReportCard()
  }
}

/* ─────────────────────────────────────────
   SUBJECT LIMIT ENFORCEMENT (SS2 & SS3 → max 9 subjects)
───────────────────────────────────────── */
window.loadResultEntry = function() {
  // ... existing code ...

  // After rendering table, enforce subject limit for SS2/SS3
  const cls = document.getElementById('res-class').value;
  if (['SS 2','SS 3'].includes(cls)) {
    const warning = document.createElement('div');
    warning.style.cssText = 'margin:1rem 0; padding:0.75rem; background:#fef3c7; border-radius:8px; color:#92400e;';
    warning.innerHTML = '⚠ SS 2 & SS 3 students can register a maximum of <strong>9 subjects</strong>.';
    document.getElementById('result-entry-table').prepend(warning);
  }
};

// Also enforce in bulk import
window.saveBulkExcelResults = function() {
  // ... existing code ...

  const cls = document.getElementById('bulk-res-class').value;
  if (['SS 2','SS 3'].includes(cls)) {
    const subjectsByStudent = {};
    rows.forEach(r => {
      if (!subjectsByStudent[r.sid]) subjectsByStudent[r.sid] = new Set();
      subjectsByStudent[r.sid].add(r.subject);
    });

    for (const sid in subjectsByStudent) {
      if (subjectsByStudent[sid].size > 9) {
        toast(`Student ${sid} has ${subjectsByStudent[sid].size} subjects — maximum is 9 for SS 2/SS 3.`, 'error');
        return; // stop import
      }
    }
  }

  // proceed with save...
};

/* ─────────────────────────────────────────
   INITIALIZATION – make sure parent portal is available
───────────────────────────────────────── */
function init() {
  // ... existing init code ...

  // Add parent portal nav if needed
  const nav = document.querySelector('.sidebar-nav');
  if (nav && priv.isAdmin()) {
    // Optional: add admin link to generate tokens in bulk
  }
}

// Also expose for direct access if needed
window.renderParentView = renderParentView;