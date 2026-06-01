/**
 * transcript.js — Sacred Heart College Eziukwu Aba (SAHARCO)
 * ──────────────────────────────────────────────────────────────
 * Provides two features:
 *  1. ACADEMIC TRANSCRIPT  — full results across all sessions/terms
 *  2. STUDENT PROFILE      — detailed info: bio, attendance, domains
 *
 * Admin-only. Loaded by dashboard.html.
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), toast(), API
 */

/* ═══════════════════════════════════════════════════════════════
   RENDER TRANSCRIPT SECTION
═══════════════════════════════════════════════════════════════ */
window.renderTranscript = function() {
  const section = document.getElementById('transcript');
  if (!section) return;

  if (!priv.isAdmin()) {
    section.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:1rem;">
        <div style="font-size:3rem;">🔒</div>
        <h3 style="color:#1e3a5f;margin:0;">Admin Access Only</h3>
        <p style="color:#6b7280;">Transcripts and student profiles are restricted to Admin.</p>
      </div>`;
    return;
  }

  const students = App.data.students || [];
  const studentOpts = students
    .sort((a,b) => a.name.localeCompare(b.name))
    .map(s => `<option value="${s.id}">${s.name} — ${s.class||''} ${s.arm||''} (${s.id})</option>`)
    .join('');

  section.innerHTML = `
    <div style="padding:1.5rem 0;">
      <h2 style="margin:0 0 .25rem;color:#1e3a5f;font-size:1.25rem;font-weight:700;">📋 Student Documents</h2>
      <p style="margin:0 0 1.5rem;color:#6b7280;font-size:.875rem;">Issue official transcripts and detailed student profiles</p>

      <!-- Tab bar -->
      <div style="display:flex;gap:.5rem;margin-bottom:1.5rem;background:#f8fafc;border-radius:10px;padding:.35rem;width:fit-content;">
        <button id="tr-tab-transcript" onclick="trSwitchTab('transcript')"
          style="padding:.5rem 1.1rem;border-radius:7px;font-size:.875rem;font-weight:600;cursor:pointer;border:none;background:#1e3a5f;color:#fff;transition:all .2s;">
          📜 Academic Transcript
        </button>
        <button id="tr-tab-profile" onclick="trSwitchTab('profile')"
          style="padding:.5rem 1.1rem;border-radius:7px;font-size:.875rem;font-weight:500;cursor:pointer;border:none;background:transparent;color:#6b7280;transition:all .2s;">
          👤 Student Profile
        </button>
      </div>

      <!-- TRANSCRIPT TAB -->
      <div id="tr-panel-transcript">
        <div style="background:#fff;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.25rem;">
          <h4 style="margin:0 0 1rem;color:#1e3a5f;">Generate Academic Transcript</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1rem;">
            <div>
              <label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:.35rem;">Student</label>
              <select id="tr-student" style="${inputStyle()}" onchange="trStudentChanged()">
                <option value="">— Select student —</option>
                ${studentOpts}
              </select>
            </div>
            <div>
              <label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:.35rem;">Session (leave blank for all)</label>
              <select id="tr-session" style="${inputStyle()}">
                <option value="">All Sessions</option>
                ${[...new Set((App.data.results||[]).map(r=>r.session).filter(Boolean))].sort().reverse()
                  .map(s=>`<option>${s}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;justify-content:flex-end;gap:.5rem;">
              <button onclick="generateTranscript()" style="${btnStyle('primary')}">📜 Generate Transcript</button>
              <button onclick="printDocument('tr-output')" style="${btnStyle('secondary')}">🖨 Print / PDF</button>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.82rem;color:#374151;">
            <input type="checkbox" id="tr-official" checked style="cursor:pointer;">
            Include official header & seal
          </label>
        </div>
        <div id="tr-output"></div>
      </div>

      <!-- PROFILE TAB -->
      <div id="tr-panel-profile" style="display:none;">
        <div style="background:#fff;border-radius:14px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.25rem;">
          <h4 style="margin:0 0 1rem;color:#1e3a5f;">Generate Detailed Student Profile</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1rem;">
            <div>
              <label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:.35rem;">Student</label>
              <select id="pr-student" style="${inputStyle()}">
                <option value="">— Select student —</option>
                ${studentOpts}
              </select>
            </div>
            <div>
              <label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:.35rem;">Term</label>
              <select id="pr-term" style="${inputStyle()}">
                <option value="">All Terms</option>
                <option>First Term</option>
                <option>Second Term</option>
                <option>Third Term</option>
              </select>
            </div>
            <div>
              <label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:.35rem;">Session</label>
              <select id="pr-session" style="${inputStyle()}">
                <option value="">All Sessions</option>
                ${[...new Set((App.data.results||[]).map(r=>r.session).filter(Boolean))].sort().reverse()
                  .map(s=>`<option>${s}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;justify-content:flex-end;gap:.5rem;">
              <button onclick="generateProfile()" style="${btnStyle('primary')}">👤 Generate Profile</button>
              <button onclick="printDocument('pr-output')" style="${btnStyle('secondary')}">🖨 Print / PDF</button>
            </div>
          </div>
          <div style="display:flex;gap:1.25rem;flex-wrap:wrap;font-size:.82rem;color:#374151;margin-top:.5rem;">
            ${[
              ['pr-inc-bio',        'Personal details',    true],
              ['pr-inc-academic',   'Academic results',    true],
              ['pr-inc-attendance', 'Attendance record',   true],
              ['pr-inc-domains',    'Domain assessments',  true],
              ['pr-inc-remarks',    'Teacher remarks',     true],
            ].map(([id,lbl,def]) => `
              <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;">
                <input type="checkbox" id="${id}" ${def?'checked':''} style="cursor:pointer;">
                ${lbl}
              </label>`).join('')}
          </div>
        </div>
        <div id="pr-output"></div>
      </div>
    </div>`;
};

/* ── Tab switch ───────────────────────────────────────────────────────────── */
window.trSwitchTab = function(tab) {
  ['transcript','profile'].forEach(t => {
    document.getElementById(`tr-panel-${t}`).style.display = t===tab ? '' : 'none';
    const btn = document.getElementById(`tr-tab-${t}`);
    if (btn) {
      btn.style.background   = t===tab ? '#1e3a5f' : 'transparent';
      btn.style.color        = t===tab ? '#fff' : '#6b7280';
      btn.style.fontWeight   = t===tab ? '600' : '500';
    }
  });
};

window.trStudentChanged = function() {
  const sid = document.getElementById('tr-student')?.value;
  if (!sid) return;
  // Auto-populate session options based on this student's results
  const sessions = [...new Set((App.data.results||[])
    .filter(r=>r.studentId===sid).map(r=>r.session).filter(Boolean))].sort().reverse();
  const sel = document.getElementById('tr-session');
  if (sel) {
    sel.innerHTML = '<option value="">All Sessions</option>' +
      sessions.map(s=>`<option>${s}</option>`).join('');
  }
};

/* ═══════════════════════════════════════════════════════════════
   ACADEMIC TRANSCRIPT GENERATOR
═══════════════════════════════════════════════════════════════ */
window.generateTranscript = async function() {
  const sid     = document.getElementById('tr-student')?.value;
  const session = document.getElementById('tr-session')?.value;
  const official= document.getElementById('tr-official')?.checked;
  const output  = document.getElementById('tr-output');
  if (!sid) { toast('Please select a student', 'warning'); return; }

  output.innerHTML = `<div style="text-align:center;padding:2rem;color:#6b7280;">Generating transcript…</div>`;

  const student = App.data.students.find(s=>s.id===sid);
  if (!student) { output.innerHTML = ''; toast('Student not found', 'error'); return; }

  // Fetch results from API for accuracy
  let results = [];
  try {
    const resp = await Students.getResults(sid, session ? {session} : {});
    results = resp.data || [];
    // Merge into App.data cache
    results.forEach(r => {
      if (!App.data.results.find(x=>x.id===r.id)) App.data.results.push({
        ...r, studentId: r.student_id||sid, subject: r.subject_name||r.subject
      });
    });
  } catch(e) {
    // Fallback to local cache
    results = (App.data.results||[]).filter(r=>r.studentId===sid && (!session||r.session===session));
  }

  if (!results.length) {
    output.innerHTML = `<div style="text-align:center;padding:2rem;color:#9ca3af;">No results found for this student${session?' in '+session:''}.</div>`;
    return;
  }

  // Group by session → term → subjects
  const grouped = {};
  results.forEach(r => {
    const sess = r.session || r.acad_session || '—';
    const term = r.term || '—';
    const subj = r.subject_name || r.subject || '—';
    if (!grouped[sess]) grouped[sess] = {};
    if (!grouped[sess][term]) grouped[sess][term] = [];
    grouped[sess][term].push(r);
  });

  const school = App.data.schoolInfo || {};
  const passMark = typeof getPassMark==='function' ? getPassMark() : 40;
  const maxCA    = typeof getScoreBreakdown==='function'
    ? Object.entries(getScoreBreakdown()).filter(([k])=>/^ca/i.test(k)).reduce((s,[,v])=>s+v,0)
    : 40;
  const maxExam  = typeof getScoreBreakdown==='function'
    ? (Object.entries(getScoreBreakdown()).find(([k])=>/exam/i.test(k))?.[1]||60)
    : 60;

  // Cumulative across all sessions
  const allSubjects = [...new Set(results.map(r=>r.subject_name||r.subject))];
  const subjectAverages = allSubjects.map(sub => {
    const scores = results.filter(r=>(r.subject_name||r.subject)===sub).map(r=>r.total||0);
    const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
    return { sub, avg: parseFloat(avg.toFixed(1)), scores };
  });
  const overallAvg = subjectAverages.length
    ? parseFloat((subjectAverages.reduce((a,b)=>a+b.avg,0)/subjectAverages.length).toFixed(1))
    : 0;

  const PAGE = `font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;background:#fff;max-width:780px;margin:0 auto;border:2px solid #1e3a5f;border-radius:4px;padding:0 0 20px;`;
  const TH   = `padding:6px 10px;background:#1e3a5f;color:#fff;text-align:left;font-size:11px;border:0.5px solid #1e3a5f;`;
  const TD   = `padding:5px 10px;border:0.5px solid #e2e8f0;font-size:11px;`;

  output.innerHTML = `
  <div id="transcript-document" style="${PAGE}">

    ${official ? `
    <!-- Header -->
    <div style="background:#1e3a5f;padding:16px 20px;display:flex;align-items:center;gap:16px;">
      <div style="width:60px;height:60px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">✝</div>
      <div style="color:#fff;">
        <div style="font-size:15px;font-weight:700;letter-spacing:.04em;">${school.name||'Sacred Heart College Eziukwu Aba'}</div>
        <div style="font-size:10px;opacity:.85;margin-top:2px;">${school.address||'Aba, Abia State, Nigeria'}</div>
        <div style="font-size:10px;opacity:.85;">Tel: ${school.phone||''} | ${school.email||''}</div>
      </div>
      <div style="margin-left:auto;text-align:right;color:#fff;">
        <div style="font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Official Transcript</div>
        <div style="font-size:10px;opacity:.8;margin-top:4px;">Date Issued: ${new Date().toLocaleDateString('en-NG',{day:'2-digit',month:'long',year:'numeric'})}</div>
        <div style="font-size:10px;opacity:.8;">Ref: TR/${sid}/${new Date().getFullYear()}</div>
      </div>
    </div>` : `<div style="padding:16px 20px;border-bottom:2px solid #1e3a5f;"><strong style="font-size:14px;color:#1e3a5f;">ACADEMIC TRANSCRIPT</strong></div>`}

    <!-- Student Info Band -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-bottom:1.5px solid #e2e8f0;">
      ${[
        ['Student Name',   student.name],
        ['Student ID',     student.id],
        ['Class / Arm',    `${student.class||student.class_name||''} ${student.arm||''}`],
        ['Gender',         student.gender||'—'],
        ['Date of Birth',  student.dob||'—'],
        ['Parent / Guardian', student.parent||student.parentName||'—'],
      ].map(([l,v])=>`
        <div style="padding:8px 14px;border-right:1px solid #e2e8f0;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">${l}</div>
          <div style="font-weight:600;font-size:11px;margin-top:2px;">${v||'—'}</div>
        </div>`).join('')}
    </div>

    <div style="padding:12px 16px 4px;font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.05em;">
      Academic Record ${session ? `— ${session}` : '(All Sessions)'}
    </div>

    <!-- Results by session/term -->
    ${Object.entries(grouped).sort(([a],[b])=>b.localeCompare(a)).map(([sess, terms]) => `
      <div style="margin:8px 16px;">
        <div style="background:#eff6ff;border-left:4px solid #1e3a5f;padding:5px 10px;font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:6px;">
          Academic Session: ${sess}
        </div>
        ${Object.entries(terms).sort().map(([term, rows]) => {
          const sorted  = rows.slice().sort((a,b)=>(a.subject_name||a.subject||'').localeCompare(b.subject_name||b.subject||''));
          const termTotal = sorted.reduce((s,r)=>s+(r.total||0),0);
          const termAvg   = sorted.length ? (termTotal/sorted.length).toFixed(1) : '—';
          const passed    = sorted.filter(r=>(r.total||0)>=passMark).length;
          return `
          <div style="margin-bottom:10px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="${TH}">Subject</th>
                  <th style="${TH};text-align:center;">CA (${maxCA})</th>
                  <th style="${TH};text-align:center;">Exam (${maxExam})</th>
                  <th style="${TH};text-align:center;">Total (100)</th>
                  <th style="${TH};text-align:center;">Grade</th>
                  <th style="${TH};text-align:center;">Remark</th>
                </tr>
                <tr>
                  <td colspan="6" style="padding:3px 10px;background:#f8fafc;font-size:10px;font-style:italic;color:#475569;border:0.5px solid #e2e8f0;">${term}</td>
                </tr>
              </thead>
              <tbody>
                ${sorted.map((r,i) => {
                  const g = grade(r.total||0);
                  const pass = (r.total||0) >= passMark;
                  return `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                    <td style="${TD};font-weight:500;">${r.subject_name||r.subject||'—'}</td>
                    <td style="${TD};text-align:center;">${r.ca??'—'}</td>
                    <td style="${TD};text-align:center;">${r.exam??'—'}</td>
                    <td style="${TD};text-align:center;font-weight:700;color:${pass?'#1e3a5f':'#dc2626'};">${r.total??'—'}</td>
                    <td style="${TD};text-align:center;font-weight:600;">${g.letter}</td>
                    <td style="${TD};text-align:center;color:#6b7280;">${g.remark}</td>
                  </tr>`;
                }).join('')}
                <tr style="background:#f1f5f9;font-weight:700;">
                  <td style="${TD}">TERM SUMMARY</td>
                  <td style="${TD};text-align:center;">—</td>
                  <td style="${TD};text-align:center;">—</td>
                  <td style="${TD};text-align:center;">${termAvg}</td>
                  <td style="${TD};text-align:center;">${termAvg!=='—'?grade(parseFloat(termAvg)).letter:'—'}</td>
                  <td style="${TD};text-align:center;">${passed}/${sorted.length} passed</td>
                </tr>
              </tbody>
            </table>
          </div>`;
        }).join('')}
      </div>`).join('')}

    <!-- Overall Summary -->
    <div style="margin:12px 16px;padding:12px;background:#1e3a5f11;border:1.5px solid #1e3a5f;border-radius:8px;">
      <div style="font-weight:700;font-size:12px;color:#1e3a5f;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">Overall Academic Summary</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
        ${[
          ['Total Subjects',   allSubjects.length],
          ['Overall Average',  overallAvg+'%'],
          ['Grade',            grade(overallAvg).letter],
          ['Sessions Covered', Object.keys(grouped).length],
          ['Total Records',    results.length],
          ['Pass Mark',        passMark+'%'],
        ].map(([l,v])=>`
          <div style="background:#fff;border-radius:5px;padding:6px 10px;border:1px solid #e2e8f0;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#1e3a5f;">${v}</div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;">${l}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Subject Performance Table -->
    <div style="margin:0 16px 12px;">
      <div style="font-weight:700;font-size:11px;color:#1e3a5f;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">Subject Performance Overview</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${TH}">Subject</th>
            <th style="${TH};text-align:center;">Attempts</th>
            <th style="${TH};text-align:center;">Average</th>
            <th style="${TH};text-align:center;">Grade</th>
            <th style="${TH};text-align:center;">Performance</th>
          </tr>
        </thead>
        <tbody>
          ${subjectAverages.sort((a,b)=>b.avg-a.avg).map((s,i)=>{
            const g   = grade(s.avg);
            const pct = s.avg;
            const bar = `<div style="background:#e2e8f0;border-radius:3px;height:8px;overflow:hidden;"><div style="height:100%;width:${Math.min(pct,100)}%;background:${pct>=60?'#16a34a':pct>=passMark?'#2563eb':'#dc2626'};border-radius:3px;"></div></div>`;
            return `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
              <td style="${TD};font-weight:500;">${s.sub}</td>
              <td style="${TD};text-align:center;">${s.scores.length}</td>
              <td style="${TD};text-align:center;font-weight:700;color:${s.avg>=passMark?'#1e3a5f':'#dc2626'};">${s.avg}%</td>
              <td style="${TD};text-align:center;font-weight:600;">${g.letter}</td>
              <td style="${TD};min-width:80px;">${bar}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${official ? `
    <!-- Signatures -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:20px 20px 0;padding-top:12px;border-top:1.5px solid #e2e8f0;">
      ${['Class Teacher','Vice Principal','Principal / Head Teacher'].map(role=>`
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #374151;height:35px;margin-bottom:6px;"></div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">${role}</div>
        </div>`).join('')}
    </div>
    <div style="text-align:center;font-size:9px;color:#9ca3af;padding:8px 16px;">
      This is an official document of ${school.name||'Sacred Heart College Eziukwu Aba'}. Unauthorised alteration is a criminal offence.
    </div>` : ''}
  </div>`;
};

/* ═══════════════════════════════════════════════════════════════
   STUDENT PROFILE GENERATOR
═══════════════════════════════════════════════════════════════ */
window.generateProfile = async function() {
  const sid   = document.getElementById('pr-student')?.value;
  const term  = document.getElementById('pr-term')?.value;
  const sess  = document.getElementById('pr-session')?.value;
  const output= document.getElementById('pr-output');
  if (!sid) { toast('Please select a student', 'warning'); return; }

  const incBio      = document.getElementById('pr-inc-bio')?.checked;
  const incAcademic = document.getElementById('pr-inc-academic')?.checked;
  const incAttend   = document.getElementById('pr-inc-attendance')?.checked;
  const incDomains  = document.getElementById('pr-inc-domains')?.checked;
  const incRemarks  = document.getElementById('pr-inc-remarks')?.checked;

  output.innerHTML = `<div style="text-align:center;padding:2rem;color:#6b7280;">Loading student data…</div>`;

  const student = App.data.students.find(s=>s.id===sid);
  if (!student) { output.innerHTML=''; toast('Student not found','error'); return; }

  // Fetch fresh data from API
  let results=[], attendance=[], domains=null, remarks={};
  try {
    const [rResp, aResp] = await Promise.all([
      Students.getResults(sid, {...(sess?{session:sess}:{}), ...(term?{term}:{})}).catch(()=>({data:[]})),
      Students.getAttendance(sid, {...(sess?{session:sess}:{}), ...(term?{term}:{})}).catch(()=>({data:[],counts:{}})),
    ]);
    results    = rResp.data || [];
    attendance = aResp.data || [];
    const attCounts = aResp.counts || {};

    // Domain assessments from local cache or API
    domains = (App.data.domainAssessments||[]).find(d =>
      d.studentId===sid && (!term||d.term===term) && (!sess||d.session===sess)
    );

    // Remarks from local cache
    const remEntry = (App.data.remarks||[]).find(r =>
      r.studentId===sid && (!term||r.term===term) && (!sess||r.session===sess)
    );
    remarks = remEntry || {};

    const school = App.data.schoolInfo || {};
    const passMark = typeof getPassMark==='function' ? getPassMark() : 40;

    // Compute stats
    const totalDays   = attendance.length;
    const presentDays = attendance.filter(a=>a.status==='p').length;
    const lateDays    = attendance.filter(a=>a.status==='l').length;
    const absentDays  = attendance.filter(a=>a.status==='a').length;
    const attPct      = totalDays ? Math.round((presentDays+lateDays)/totalDays*100) : (student.attendance||0);

    const subjectsSorted = [...new Set(results.map(r=>r.subject_name||r.subject))];
    const subjectData    = subjectsSorted.map(sub => {
      const rows = results.filter(r=>(r.subject_name||r.subject)===sub);
      const avg  = rows.length ? rows.reduce((s,r)=>s+(r.total||0),0)/rows.length : null;
      return { sub, avg: avg!==null ? parseFloat(avg.toFixed(1)) : null, rows };
    });
    const overallAvg = subjectData.filter(s=>s.avg!==null).length
      ? parseFloat((subjectData.filter(s=>s.avg!==null).reduce((s,x)=>s+x.avg,0)/subjectData.filter(s=>s.avg!==null).length).toFixed(1))
      : null;

    const domainLabelMap = App.data.domainLabels || {
      5:'Excellent', 4:'Very Good', 3:'Good', 2:'Fair', 1:'Needs Improvement'
    };
    const domainLabel = v => domainLabelMap[v] || (v ? String(v) : '—');
    const domainColor = v => v>=4?'#16a34a':v>=3?'#2563eb':v>=2?'#d97706':'#dc2626';

    const PAGE = `font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;background:#fff;max-width:780px;margin:0 auto;border:2px solid #1e3a5f;border-radius:4px;`;
    const TH2  = `padding:6px 10px;background:#1e3a5f;color:#fff;text-align:left;font-size:10px;`;
    const TD2  = `padding:5px 10px;border:0.5px solid #e2e8f0;font-size:11px;`;

    output.innerHTML = `
    <div id="profile-document" style="${PAGE}">

      <!-- Header -->
      <div style="background:#1e3a5f;padding:14px 18px;display:flex;align-items:center;gap:14px;">
        <div style="width:52px;height:52px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">✝</div>
        <div style="color:#fff;flex:1;">
          <div style="font-size:14px;font-weight:700;">${school.name||'Sacred Heart College Eziukwu Aba'}</div>
          <div style="font-size:10px;opacity:.8;">${school.address||'Aba, Abia State'}</div>
        </div>
        <div style="text-align:right;color:#fff;">
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Student Profile</div>
          <div style="font-size:10px;opacity:.8;">${term||'All Terms'} ${sess||''}</div>
          <div style="font-size:10px;opacity:.8;">Generated: ${new Date().toLocaleDateString('en-NG')}</div>
        </div>
      </div>

      <!-- Student Banner -->
      <div style="display:flex;align-items:center;gap:16px;padding:14px 18px;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;">
        <div style="width:56px;height:56px;background:#1e3a5f22;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#1e3a5f;flex-shrink:0;">
          ${student.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:800;color:#1e3a5f;">${student.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">
            ${student.id} &nbsp;·&nbsp; ${student.class||''} ${student.arm||''} &nbsp;·&nbsp; ${student.gender||''}
          </div>
        </div>
        ${overallAvg !== null ? `
        <div style="text-align:center;background:#1e3a5f;color:#fff;border-radius:10px;padding:10px 16px;">
          <div style="font-size:22px;font-weight:800;">${overallAvg}%</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;opacity:.8;">Overall Avg</div>
          <div style="font-size:14px;font-weight:700;">${grade(overallAvg).letter}</div>
        </div>` : ''}
      </div>

      ${incBio ? `
      <!-- Personal Details -->
      <div style="padding:10px 18px 0;">
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
          Personal Information
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;">
          ${[
            ['Full Name',      student.name],
            ['Student ID',     student.id],
            ['Gender',         student.gender||'—'],
            ['Date of Birth',  student.dob||'—'],
            ['Class',          `${student.class||''} ${student.arm||''}`],
            ['Admission No',   student.admissionNo||student.id],
            ['Parent/Guardian',student.parent||student.parentName||'—'],
            ['Phone',          student.phone||'—'],
            ['Address',        student.address||'—'],
          ].map(([l,v],i)=>`
            <div style="padding:6px 12px;border-right:${(i+1)%3?'1':'0'}px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:9px;text-transform:uppercase;color:#9ca3af;letter-spacing:.04em;">${l}</div>
              <div style="font-weight:600;font-size:11px;margin-top:1px;">${v}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      ${incAttend ? `
      <!-- Attendance -->
      <div style="padding:10px 18px 0;">
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
          Attendance Record
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:8px;">
          ${[
            ['Attendance Rate', attPct+'%',   attPct>=75?'#16a34a':attPct>=50?'#d97706':'#dc2626'],
            ['Days Present',    presentDays,  '#16a34a'],
            ['Days Late',       lateDays,     '#d97706'],
            ['Days Absent',     absentDays,   '#dc2626'],
            ['Total School Days',totalDays||'—','#1e3a5f'],
          ].map(([l,v,c])=>`
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:8px;text-align:center;">
              <div style="font-size:16px;font-weight:800;color:${c};">${v}</div>
              <div style="font-size:9px;text-transform:uppercase;letter-spacing:.03em;color:#6b7280;">${l}</div>
            </div>`).join('')}
        </div>
        <div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden;margin-bottom:4px;">
          <div style="height:100%;width:${Math.min(attPct,100)}%;background:${attPct>=75?'#16a34a':attPct>=50?'#d97706':'#dc2626'};border-radius:6px;"></div>
        </div>
        <div style="font-size:9px;color:#9ca3af;">Minimum required attendance: 75%</div>
      </div>` : ''}

      ${incDomains && domains ? `
      <!-- Domain Assessments -->
      <div style="padding:10px 18px 0;">
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
          Domain Assessments
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px;">
          ${[
            ['Cognitive',   domains.cognitive,   '🧠'],
            ['Affective',   domains.affective,   '❤️'],
            ['Psychomotor', domains.psychomotor, '🏃'],
          ].map(([label,val,icon])=>`
            <div style="border:1.5px solid ${domainColor(val)};border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:20px;">${icon}</div>
              <div style="font-size:12px;font-weight:700;color:#374151;margin:4px 0 2px;">${label}</div>
              <div style="font-size:18px;font-weight:800;color:${domainColor(val)};">${val||'—'}/5</div>
              <div style="font-size:10px;color:#6b7280;">${domainLabel(val)}</div>
            </div>`).join('')}
        </div>
        ${domains.behavior && Object.keys(domains.behavior).length ? `
        <div style="font-size:10px;color:#374151;">
          <strong>Behaviour:</strong> ${Object.entries(domains.behavior).map(([k,v])=>`${k}: ${v}`).join(' | ')}
        </div>` : ''}
      </div>` : ''}

      ${incAcademic && results.length ? `
      <!-- Academic Results -->
      <div style="padding:10px 18px 0;">
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
          Academic Performance ${sess?`— ${sess}`:''}${term?` (${term})`:''}
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${TH2}">Subject</th>
              ${results.some(r=>r.term) ? '<th style="'+TH2+';text-align:center;">Term</th>' : ''}
              <th style="${TH2};text-align:center;">CA</th>
              <th style="${TH2};text-align:center;">Exam</th>
              <th style="${TH2};text-align:center;">Total</th>
              <th style="${TH2};text-align:center;">Grade</th>
              <th style="${TH2};text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.sort((a,b)=>(a.subject_name||a.subject||'').localeCompare(b.subject_name||b.subject||'')).map((r,i)=>{
              const g    = grade(r.total||0);
              const pass = (r.total||0)>=passMark;
              return `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                <td style="${TD2};font-weight:500;">${r.subject_name||r.subject||'—'}</td>
                ${results.some(x=>x.term) ? `<td style="${TD2};text-align:center;font-size:10px;color:#6b7280;">${r.term||'—'}</td>` : ''}
                <td style="${TD2};text-align:center;">${r.ca??'—'}</td>
                <td style="${TD2};text-align:center;">${r.exam??'—'}</td>
                <td style="${TD2};text-align:center;font-weight:700;color:${pass?'#1e3a5f':'#dc2626'};">${r.total??'—'}</td>
                <td style="${TD2};text-align:center;font-weight:600;">${g.letter}</td>
                <td style="${TD2};text-align:center;">
                  <span style="background:${pass?'#dcfce7':'#fee2e2'};color:${pass?'#166534':'#991b1b'};padding:1px 8px;border-radius:3px;font-size:10px;font-weight:700;">
                    ${pass?'PASS':'FAIL'}
                  </span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${incRemarks && (remarks.teacherRemark||remarks.principalRemark) ? `
      <!-- Remarks -->
      <div style="padding:10px 18px 0;">
        <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
          Remarks
        </div>
        ${remarks.teacherRemark ? `
        <div style="margin-bottom:8px;">
          <div style="font-size:10px;font-weight:600;color:#374151;margin-bottom:3px;">Class Teacher:</div>
          <div style="background:#f8fafc;border-left:3px solid #1e3a5f;padding:6px 10px;font-size:11px;border-radius:0 6px 6px 0;">${remarks.teacherRemark}</div>
        </div>` : ''}
        ${remarks.principalRemark ? `
        <div>
          <div style="font-size:10px;font-weight:600;color:#374151;margin-bottom:3px;">Principal:</div>
          <div style="background:#f8fafc;border-left:3px solid #1e3a5f;padding:6px 10px;font-size:11px;border-radius:0 6px 6px 0;">${remarks.principalRemark}</div>
        </div>` : ''}
      </div>` : ''}

      <!-- Signatures -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:16px 18px 0;padding-top:12px;border-top:1.5px solid #e2e8f0;">
        ${['Class Teacher','Vice Principal','Principal'].map(r=>`
          <div style="text-align:center;">
            <div style="border-bottom:1px solid #374151;height:32px;margin-bottom:5px;"></div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">${r}</div>
          </div>`).join('')}
      </div>
      <div style="text-align:center;font-size:9px;color:#9ca3af;padding:8px;">
        Official document of ${school.name||'Sacred Heart College Eziukwu Aba'} · ${new Date().toLocaleDateString('en-NG')}
      </div>

    </div>`;

  } catch(e) {
    output.innerHTML = `<div style="text-align:center;padding:2rem;color:#dc2626;">Error: ${e.message}</div>`;
    console.error('[profile]', e);
  }
};

/* ── Print helper ─────────────────────────────────────────────────────────── */
window.printDocument = function(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !el.firstElementChild) { toast('Nothing to print — generate first', 'warning'); return; }
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`
    <!DOCTYPE html><html><head>
      <title>Sacred Heart College — Document</title>
      <style>
        body{margin:0;padding:20px;background:#fff;font-family:Arial,Helvetica,sans-serif;}
        @page{margin:10mm;}
        @media print{body{padding:0;}button{display:none!important;}}
      </style>
    </head><body>
      ${el.innerHTML}
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
    </body></html>`);
  win.document.close();
};

console.info('[transcript] Transcript & Profile module loaded.');