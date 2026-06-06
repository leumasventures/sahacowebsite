'use strict';
/**
 * report-card.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 *
 * Standalone report card module. Loaded after script.js and script3.js.
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), toast(),
 *             denyAccess() from script.js
 *
 * Exports (on window):
 *   renderReportCards()    — renders the report card generator UI
 *   generateReportCards()  — builds cards for the selected class/arm/term
 *   printReportCard(btn)   — opens a print-ready popup with both pages
 *   saveRemark()           — saves teacher / principal remarks
 *   clearReportOutput()    — clears the output panel
 */
/* ═══════════════════════════════════════════════════════════════════════════
   REPORT CARDS
═══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   APPROVAL SYSTEM — Principal stamps report cards
══════════════════════════════════════════════════════════════ */
window.rcApprove = async function(studentId, term, session) {
  if (!priv.isAdmin()) { toast('Only Admin can approve report cards', 'error'); return; }
  const principal = App.data.schoolInfo?.principal || App.currentUser?.name || 'The Principal';
  const now       = new Date().toISOString();
  try {
    // Save approval in remarks
    await Results.setRemark(studentId, term, session, {
      approved:   true,
      approvedBy: principal,
      approvedAt: now,
    });
    // Update local cache
    const entry = (App.data.remarks || []).find(r =>
      r.studentId === studentId && r.term === term && r.session === session
    );
    if (entry) {
      entry.approved   = true;
      entry.approvedBy = principal;
      entry.approvedAt = now;
    } else {
      if (!App.data.remarks) App.data.remarks = [];
      App.data.remarks.push({ studentId, term, session, approved: true, approvedBy: principal, approvedAt: now });
    }
    toast('✅ Report card approved and stamped', 'success');
    // Refresh report cards
    generateReportCards();
  } catch(e) {
    // If API doesn't support it yet, do it locally only
    const entry = (App.data.remarks || []).find(r =>
      r.studentId === studentId && r.term === term && r.session === session
    );
    if (entry) {
      entry.approved = true; entry.approvedBy = principal; entry.approvedAt = now;
    } else {
      if (!App.data.remarks) App.data.remarks = [];
      App.data.remarks.push({ studentId, term, session, approved: true, approvedBy: principal, approvedAt: now });
    }
    toast('✅ Approved (saved locally)', 'success');
    generateReportCards();
  }
};

window.rcRevoke = async function(studentId, term, session) {
  if (!priv.isAdmin()) { toast('Only Admin can revoke approval', 'error'); return; }
  if (!confirm('Remove approval and stamp from this report card?')) return;
  try {
    await Results.setRemark(studentId, term, session, {
      approved: false, approvedBy: '', approvedAt: null,
    });
  } catch(e) { /* ignore — update locally anyway */ }
  const entry = (App.data.remarks || []).find(r =>
    r.studentId === studentId && r.term === term && r.session === session
  );
  if (entry) { entry.approved = false; entry.approvedBy = ''; entry.approvedAt = null; }
  toast('Approval revoked', 'warning');
  generateReportCards();
};

/* Approve ALL cards for a class at once */
window.rcApproveAll = async function(cls, arm, term, session) {
  if (!priv.isAdmin()) { toast('Only Admin can approve report cards', 'error'); return; }
  const students  = (App.data.students || []).filter(s => s.class === cls && s.arm === arm);
  if (!students.length) { toast('No students found', 'warning'); return; }
  if (!confirm(`Approve and stamp ALL ${students.length} report cards for ${cls} ${arm}?`)) return;
  const principal = App.data.schoolInfo?.principal || App.currentUser?.name || 'The Principal';
  const now       = new Date().toISOString();
  let count = 0;
  for (const s of students) {
    try {
      await Results.setRemark(s.id, term, session, {
        approved: true, approvedBy: principal, approvedAt: now,
      });
    } catch(e) { /* update locally */ }
    const entry = (App.data.remarks || []).find(r =>
      r.studentId === s.id && r.term === term && r.session === session
    );
    if (entry) { entry.approved = true; entry.approvedBy = principal; entry.approvedAt = now; }
    else { (App.data.remarks = App.data.remarks||[]).push({ studentId:s.id, term, session, approved:true, approvedBy:principal, approvedAt:now }); }
    count++;
  }
  toast(`✅ ${count} report cards approved`, 'success');
  generateReportCards();
};

function renderReportCards() {
  if (priv.isParent()) { navigate('results'); return; }

  const section   = document.getElementById('report-cards');
  const isTeacher = priv.isTeacher();
  const userClass = App.currentUser.assignedClass || '';

  const classOptions = App.data.classes
    .map(c => `<option value="${c.name}" ${userClass === c.name ? 'selected' : ''}>${c.name}</option>`)
    .join('');

  section.innerHTML = `
    <h2 style="margin-bottom:1.5rem;color:#1e40af;">Student Report Cards</h2>
    <div style="background:#fff;border-radius:12px;padding:1.75rem;box-shadow:0 4px 16px rgba(0,0,0,.08);margin-bottom:2.5rem;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.25rem;margin-bottom:1.5rem;">
        <div>
          <label style="${labelStyle()}">Class</label>
          <select id="rc-class" style="${inputStyle()}" onchange="updateRCArms()" ${isTeacher?'disabled':''}>
            <option value="">— Select —</option>${classOptions}
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Arm / Section</label>
          <select id="rc-arm" style="${inputStyle()}" ${isTeacher?'disabled':''}>
            <option value="">— Select —</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Term</label>
          <select id="rc-term" style="${inputStyle()}">
            <option>First Term</option>
            <option selected>Second Term</option>
            <option>Third Term</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Academic Session</label>
          <input id="rc-session" value="${App.data.schoolInfo?.session || '2025/2026'}" style="${inputStyle()}">
        </div>
      </div>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <button onclick="generateReportCards()" style="${btnStyle('primary')}">Generate Report Cards</button>
        <button onclick="clearReportOutput()" style="${btnStyle('secondary')}">Clear</button>
      </div>
    </div>
    <div id="report-cards-output" style="display:grid;gap:2.5rem;"></div>`;

  if (isTeacher && userClass) updateRCArms();
}

window.updateRCArms = function() {
  const cls    = document.getElementById('rc-class')?.value;
  const armSel = document.getElementById('rc-arm');
  if (!armSel) return;
  armSel.innerHTML = '<option value="">— Select arm —</option>';
  if (!cls) return;
  const classData = App.data.classes.find(c => c.name === cls);
  if (classData?.arms) armSel.innerHTML += classData.arms.map(a => `<option>${a}</option>`).join('');
};

window.generateReportCards = async function() {
  const cls     = document.getElementById('rc-class')?.value;
  const arm     = document.getElementById('rc-arm')?.value;
  const term    = document.getElementById('rc-term')?.value;
  const session = document.getElementById('rc-session')?.value;

  if (!cls || !arm || !term || !session) return toast('Please complete all fields.', 'warning');
  if (priv.isTeacher() && !priv.canActOnClass(cls, arm))
    return denyAccess('You can only generate report cards for your assigned class/arm.');

  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  if (!students.length) return toast('No students found in this class/arm.', 'warning');

  const output = document.getElementById('report-cards-output');
  const school = App.data.schoolInfo || {};

  output.innerHTML = '<div style="text-align:center;padding:2.5rem;color:#6b7280;font-size:.9rem;">⏳ Loading results &amp; allocations from server…</div>';

  // ── 1. Fetch subject allocations from API ─────────────────────────────
  const allocKey = `${cls}_${arm}`;
  try {
    const ar = await Results.getClassAllocation(cls, arm);
    const raw = ar.subjects || ar.data || [];
    const names = raw.map(s => typeof s === 'string' ? s : (s.name || s.subject_name || '')).filter(Boolean);
    if (!App.data.subjectAllocations) App.data.subjectAllocations = {};
    if (names.length) App.data.subjectAllocations[allocKey] = names;
  } catch(e) { console.warn('[rc] alloc fetch:', e.message); }

  // ── 2. Fetch fresh results for this class/term/session ────────────────
  try {
    const rr = await Results.getByClass(cls, arm, { term, session });
    const fresh = rr.data || rr.results || [];
    fresh.forEach(r => {
      const sid   = r.student_id || r.studentId || '';
      const subj  = r.subject_name || r.subject  || '';
      const entry = {
        ...r,
        studentId:    sid,
        subject:      subj,
        subject_name: subj,
        total: r.total != null ? r.total : (Number(r.ca||0) + Number(r.exam||0)),
      };
      const idx2 = App.data.results.findIndex(x =>
        (x.studentId === sid) &&
        ((x.subject||x.subject_name||'').toLowerCase() === subj.toLowerCase()) &&
        x.term === r.term && x.session === r.session
      );
      if (idx2 >= 0) App.data.results[idx2] = entry;
      else App.data.results.push(entry);
    });
    console.log(`[rc] loaded ${fresh.length} results for ${cls} ${arm}`);
  } catch(e) { console.warn('[rc] results fetch:', e.message); }

  output.innerHTML = students.map(s => buildReportCard(s, cls, arm, term, session, school)).join('');

  // "Approve All" bar at the top — admin only, more than one student
  if (priv.isAdmin() && students.length > 0) {
    const bar = document.createElement('div');
    bar.className = 'no-print';
    bar.style.cssText = 'display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:#eff6ff;border-radius:10px;margin-bottom:1rem;border:1.5px solid #bfdbfe;';
    bar.innerHTML = `<span style="font-size:.875rem;font-weight:600;color:#1e3a8a;">
      🖋 Principal Approval — ${cls} ${arm} &nbsp;·&nbsp; ${students.length} card(s)
    </span>
    <button onclick="rcApproveAll('${cls}','${arm}','${term}','${session}')"
      style="background:#1e3a8a;color:#fff;border:none;border-radius:8px;padding:.45rem 1.1rem;
             font-size:.84rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:.5rem;margin-left:auto;">
      <img src="images/sahacostamp.jpg" style="width:20px;height:20px;border-radius:50%;object-fit:contain;" onerror="this.style.display='none'">
      Approve All &amp; Stamp
    </button>`;
    output.insertBefore(bar, output.firstChild);
  }

  toast(`Generated ${students.length} report card(s)`, 'success');
};


/* ── Core card builder ─────────────────────────────────────────────────────── */
function buildReportCard(student, cls, arm, term, session, school) {
  /* ── data ── */
  // subjectAllocations is a key-value object: { "ClassName_Arm": [subjectNames] }
  const allocKey     = `${cls}_${arm}`;
  const rawAlloc     = App.data.subjectAllocations?.[allocKey]
                    || App.data.subjectAllocations?.[`${cls}`]
                    || [];
  // Normalise allocation to plain strings (may be {id,name} objects)
  const allocNorm    = rawAlloc.map(s => typeof s === 'string' ? s : (s.name || s.subject_name || '')).filter(Boolean);
  // If we have allocations, use only those. Otherwise show subjects that actually have results.
  const subjectNames = allocNorm.length
    ? allocNorm
    : [...new Set([
        ...(App.data.subjects || []).map(s => s.name),
        ...(App.data.results || [])
          .filter(r => r.studentId === student.id && r.term === term && r.session === session)
          .map(r => r.subject_name || r.subject).filter(Boolean)
      ])];

  const results      = (App.data.results || []).filter(r =>
    r.studentId === student.id && r.term === term && r.session === session);

  // Compute total with ca+exam fallback if total is missing
  const resultsWithTotal = results.map(r => {
    const ca   = Number(r.ca   ?? r.CA   ?? 0);
    const exam = Number(r.exam ?? r.Exam ?? r.EXAM ?? 0);
    // ALWAYS recompute — never trust cached total (DB GENERATED column issues)
    const tot  = ca + exam;
    return {
      ...r,
      ca,
      exam,
      total:        tot,
      subject:      r.subject      || r.subject_name || '',
      subject_name: r.subject_name || r.subject      || '',
    };
  });
  const remarkEntry  = ((App.data.remarks || []).find(r =>
    r.studentId === student.id && r.term === term && r.session === session)) || {};
  const domains      = getDomainScores(student.id, term, session);
  const classStudents= (App.data.students || []).filter(s => s.class === cls && s.arm === arm);
  const position     = computePosition(student.id, cls, arm, term, session);
  const teacher      = (App.data.teachers || []).find(t => t.class === cls && t.arm === arm);

  const totalScore   = resultsWithTotal.reduce((s, r) => s + (r.total || 0), 0);
  const subjectCount = resultsWithTotal.length;
  const _dp           = typeof getDecimalPlaces === "function" ? getDecimalPlaces() : 1;
  const average      = subjectCount ? (totalScore / subjectCount).toFixed(_dp) : null;
  const overallGrade = average ? grade(parseFloat(average)) : { letter: '—', remark: '—' };

  const canEditTeacher   = priv.isAdmin() || (priv.isTeacher() && priv.canActOnClass(cls, arm));
  const canEditPrincipal = priv.isAdmin();

  /* ── helpers ── */
  const TH = (a='center',w='') => `padding:5px 8px;text-align:${a};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;border:1px solid #93c5fd;${w?'width:'+w+';':''}`;
  const TD = (a='center',extra='') => `padding:4px 8px;text-align:${a};border:1px solid #d1d5db;font-size:11px;${extra}`;

  const DOT = (score, slot) => {
    const on = score && Number(score) >= slot;
    return `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid ${on?'#1e40af':'#9ca3af'};background:${on?'#1e40af':'transparent'};"></span>`;
  };

  const gradeBar = (raw) => {
    if (typeof raw !== 'number') return '';
    const _pm = typeof getPassMark==="function"?getPassMark():40;
    const col = raw>=80?'#16a34a':raw>=70?'#2563eb':raw>=60?'#d97706':raw>=_pm?'#ea580c':'#dc2626';
    return `<div style="height:4px;background:#e5e7eb;border-radius:2px;margin-top:2px;">
      <div style="width:${raw}%;height:100%;background:${col};border-radius:2px;"></div></div>`;
  };
  const gradeChip = (letter) => {
    const c = {A:'#16a34a',B:'#2563eb',C:'#d97706',D:'#ea580c',F:'#dc2626'}[letter]||'#6b7280';
    return `<span style="background:${c}22;color:${c};font-weight:700;padding:2px 8px;border-radius:3px;font-size:11px;">${letter}</span>`;
  };

  /* ── subject rows (only allocated subjects) ── */
  const subjectRows = subjectNames.map(name => {
    // Match by subject, subject_name, or case-insensitive comparison
    const r = resultsWithTotal.find(x =>
      (x.subject      && x.subject.trim().toLowerCase()      === name.trim().toLowerCase()) ||
      (x.subject_name && x.subject_name.trim().toLowerCase() === name.trim().toLowerCase())
    );
    if (!r) return `<tr style="background:#fafafa;">
      <td style="${TD('left','padding-left:10px;font-weight:500;')}">${name}</td>
      <td style="${TD()}">—</td><td style="${TD()}">—</td>
      <td style="${TD()}">—</td><td style="${TD()}">—</td>
      <td style="${TD('left','font-size:10px;color:#9ca3af;')}">Not recorded</td></tr>`;
    // Always recompute total from ca+exam (avoids DB GENERATED column null issues)
    const ca_n  = Number(r.ca   ?? r.CA   ?? 0);
    const ex_n  = Number(r.exam ?? r.Exam ?? r.EXAM ?? 0);
    const total = ca_n + ex_n;
    const g = grade(total);
    const pass = typeof getPassMark==='function' ? getPassMark() : 40;
    const stripe = total < pass ? 'background:#fff5f5;' : '';
    return `<tr style="${stripe}">
      <td style="${TD('left','padding-left:10px;font-weight:500;')}">${name}</td>
      <td style="${TD()}">${r.ca != null ? r.ca : '—'}</td>
      <td style="${TD()}">${r.exam != null ? r.exam : '—'}</td>
      <td style="${TD()}">${gradeBar(total)}<strong>${total}</strong></td>
      <td style="${TD()}">${gradeChip(g.letter)}</td>
      <td style="${TD('left','font-size:10px;color:#4b5563;')}">${g.remark}</td>
    </tr>`;
  }).join('');

  /* ── behaviour rows ── */
  const BEHAVIOURS = [
    'Attentiveness','Punctuality','Neatness','Politeness',
    'Honesty','Creativity','Cooperation','Leadership',
  ];
  const SKILLS = [
    'Reading','Writing','Drawing & Art','Music & Drama',
    'Physical Education','Verbal Communication','Hand Work',
  ];
  const behaviourRows = BEHAVIOURS.map(b => {
    const s = domains.behavior?.[b] || 0;
    return `<tr><td style="${TD('left','padding-left:8px;')}">${b}</td>
      ${[1,2,3,4,5].map(n=>DOT(s,n)).map(d=>`<td style="${TD()}">${d}</td>`).join('')}</tr>`;
  }).join('');
  const skillRows = SKILLS.map(k => {
    const s = domains.behavior?.[k] || 0;
    return `<tr><td style="${TD('left','padding-left:8px;')}">${k}</td>
      ${[1,2,3,4,5].map(n=>DOT(s,n)).map(d=>`<td style="${TD()}">${d}</td>`).join('')}</tr>`;
  }).join('');

  /* ── logo / photo / stamp placeholders ── */
  // Logo: use the school's actual logo image
  const _logoUrl  = school.logo || school.logo_url || 'images/sahaco logo.jpg';
  const logoHtml  = `<img src="${_logoUrl}" style="width:80px;height:80px;object-fit:contain;border-radius:6px;" alt="SAHARCO Logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
    <div style="display:none;width:80px;height:80px;border:2px solid #1e3a8a;border-radius:6px;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#1e3a8a;text-align:center;">SAHARCO</div>`;
  // Watermark — centred behind all content, low opacity
  const watermarkHtml = `<div aria-hidden="true" style="pointer-events:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);opacity:.07;z-index:0;">
    <img src="${_logoUrl}" style="width:340px;height:340px;object-fit:contain;" alt="" onerror="this.parentElement.style.display='none'">
  </div>`;

  const _showPhoto = typeof showStudentPhoto==="function" ? showStudentPhoto() : false;
  const photoHtml = _showPhoto
    ? (student.photo
        ? `<img src="${student.photo}" style="width:80px;height:90px;object-fit:cover;border:2px solid #c7d7f5;border-radius:4px;" alt="photo">`
        : `<div style="width:80px;height:90px;border:2px dashed #c7d7f5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#9ca3af;text-align:center;">STUDENT<br>PHOTO</div>`)
    : '';

  // isApproved: stored on the remark entry
  const isApproved  = !!(remarkEntry.approved);
  const approvedBy  = remarkEntry.approvedBy  || '';
  const approvedAt  = remarkEntry.approvedAt
    ? new Date(remarkEntry.approvedAt).toLocaleDateString('en-NG')
    : '';

  // Stamp: shown when approved, blank circle when not
  const stampHtml = isApproved
    ? `<div style="text-align:center;">
        <img src="images/sahacostamp.jpg"
          style="width:80px;height:80px;object-fit:contain;border-radius:50%;border:2px solid #1e3a8a;"
          alt="Official Stamp"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div style="display:none;width:80px;height:80px;border:3px double #1e3a8a;border-radius:50%;
          flex-direction:column;align-items:center;justify-content:center;font-size:7px;
          font-weight:700;color:#1e3a8a;text-align:center;padding:6px;">
          <div style="font-size:8px;font-weight:900;">SAHARCO</div><div>OFFICIAL</div>
        </div>
        <div style="font-size:8px;color:#16a34a;font-weight:700;margin-top:2px;">✓ APPROVED</div>
        ${approvedAt ? `<div style="font-size:7px;color:#6b7280;">${approvedAt}</div>` : ''}
       </div>`
    : `<div style="width:80px;height:80px;border:2px dashed #c7d7f5;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:7px;color:#9ca3af;text-align:center;line-height:1.4;">
        STAMP<br>PENDING
       </div>`;

  /* ── attendance details ── */
  const attPct   = parseFloat(student.attendance || 0);
  const attColor = attPct < 75 ? '#dc2626' : attPct < 90 ? '#d97706' : '#16a34a';
  const attLabel = attPct < 75 ? 'Below Minimum' : attPct < 90 ? 'Fair' : 'Excellent';

  /* ── shared page styles ── */
  const PAGE_STYLE = `position:relative;overflow:hidden;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;background:#fff;page-break-after:always;max-width:780px;margin:0 auto;border:1.5px solid #1e3a8a;`;
  const HEADER = `
    <div style="padding:14px 18px 10px;border-bottom:3px solid #1e3a8a;display:flex;align-items:center;gap:14px;">
      ${logoHtml}
      <div style="flex:1;text-align:center;">
        <div style="font-size:19px;font-weight:900;color:#1e3a8a;letter-spacing:.5px;">${school.name||'SACRED HEART COLLEGE'}</div>
        <div style="font-size:10px;color:#374151;margin-top:1px;">${school.address||'Eziukwu Road, Aba, Abia State'}</div>
        ${school.phone?`<div style="font-size:10px;color:#6b7280;">Tel: ${school.phone}</div>`:''}
        <div style="margin-top:6px;background:#1e3a8a;color:#fff;display:inline-block;padding:3px 18px;border-radius:3px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
          ${term} REPORT CARD — ${session}
        </div>
      </div>
      ${photoHtml}
    </div>`;

  const STUDENT_BAND = `
    <div style="background:#e8f0fe;padding:8px 18px;border-bottom:1px solid #c7d7f5;">
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:6px;">
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;">Student Name</div>
          <div style="font-size:13px;font-weight:800;color:#111;">${student.name}</div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;">Adm. No.</div>
          <div style="font-weight:700;font-size:10px;">${student.id}</div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;">Class</div>
          <div style="font-weight:700;">${cls} ${arm}</div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;">Gender</div>
          <div style="font-weight:700;">${student.gender||'—'}</div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;">Date of Birth</div>
          <div style="font-weight:700;">${student.dob ? String(student.dob).slice(0,10) : '—'}</div></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;">Term / Session</div>
          <div style="font-weight:700;font-size:10px;">${term}</div>
          <div style="font-size:9px;color:#6b7280;">${session}</div></div>
      </div>
    </div>`;

  const SIGN_STAMP = (pageLabel) => `
    <div style="border-top:2px solid #1e3a8a;padding:10px 18px;background:#f8fafc;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 80px;gap:18px;align-items:end;">
        <div style="text-align:center;">
          <div style="height:40px;border-bottom:1.5px solid #334155;"></div>
          <div style="font-size:9px;color:#475569;margin-top:3px;">Class Teacher's Signature</div>
          <div style="font-size:9px;font-weight:700;color:#1e3a8a;">${teacher?teacher.name:''}</div>
        </div>
        <div style="text-align:center;">
          <div style="height:40px;border-bottom:1.5px solid #334155;"></div>
          <div style="font-size:9px;color:#475569;margin-top:3px;">Parent / Guardian Signature</div>
        </div>
        <div style="text-align:center;">
          ${isApproved
            ? `<div style="height:40px;display:flex;align-items:center;justify-content:center;">
                <img src="images/sahacostamp.jpg" style="height:38px;object-fit:contain;opacity:.85;" onerror="this.style.display='none'">
               </div>`
            : `<div style="height:40px;border-bottom:1.5px solid #334155;"></div>`}
          <div style="font-size:9px;color:#475569;margin-top:3px;">Principal's Signature</div>
          <div style="font-size:9px;font-weight:700;color:#1e3a8a;">${school.principal||''}</div>
        </div>
        ${stampHtml}
      </div>
      <div style="text-align:center;font-size:8px;color:#9ca3af;margin-top:4px;">${pageLabel}</div>
    </div>`;

  /* ════════════════════════════════════════════════
     PAGE 1 — Summary + Subject Results + Remarks
  ════════════════════════════════════════════════ */
  const approveBtn = canEditPrincipal ? `
    <div class="rc-approve-bar no-print" style="display:flex;align-items:center;gap:.75rem;
      padding:.6rem 1rem;margin-bottom:.25rem;background:${isApproved?'#f0fdf4':'#fffbeb'};
      border:1.5px solid ${isApproved?'#86efac':'#fcd34d'};border-radius:10px;">
      <span style="font-size:.85rem;font-weight:700;color:${isApproved?'#16a34a':'#92400e'};">
        ${isApproved ? '✅ Approved by ' + approvedBy + (approvedAt?' on '+approvedAt:'') : '⏳ Pending Principal Approval'}
      </span>
      ${isApproved
        ? `<button onclick="rcRevoke('${student.id}','${term}','${session}')"
             style="background:#fee2e2;color:#991b1b;border:none;border-radius:6px;padding:.3rem .75rem;
                    font-size:.78rem;font-weight:600;cursor:pointer;margin-left:auto;">
             ✕ Revoke Approval
           </button>`
        : `<button onclick="rcApprove('${student.id}','${term}','${session}')"
             style="background:#1e3a8a;color:#fff;border:none;border-radius:6px;padding:.35rem 1rem;
                    font-size:.82rem;font-weight:700;cursor:pointer;margin-left:auto;
                    display:flex;align-items:center;gap:.4rem;">
             <img src="images/sahacostamp.jpg" style="width:18px;height:18px;border-radius:50%;object-fit:contain;" onerror="this.style.display='none'">
             Approve &amp; Stamp
           </button>`}
    </div>` : '';

  const page1 = `
  ${approveBtn}
  <div class="report-card rc-page1" data-sid="${student.id}" style="${PAGE_STYLE}">
    ${watermarkHtml}
    ${HEADER}
    ${STUDENT_BAND}

    <!-- ── Summary Bar ── -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);background:#1e3a8a;color:#fff;text-align:center;padding:8px 0;border-bottom:2px solid #1e3a8a;">
      ${[
        ['No. of Subjects', subjectCount||'—'],
        ['Total Score',     subjectCount ? totalScore : '—'],
        ['Average',         average ? average+'%' : '—'],
        ['Grade',           overallGrade.letter],
        ['Position',        position],
      ].map(([l,v])=>`<div>
        <div style="font-size:9px;opacity:.8;text-transform:uppercase;letter-spacing:.4px;">${l}</div>
        <div style="font-size:16px;font-weight:900;">${v}</div>
      </div>`).join('')}
    </div>

    <!-- ── Subject Table ── -->
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#1e3a8a;color:#fff;">
          <td colspan="6" style="padding:5px 10px;font-weight:700;font-size:10px;letter-spacing:.5px;text-transform:uppercase;">Academic Performance — ${term} ${session}</td>
        </tr>
        <tr style="background:#dbeafe;color:#1e3a8a;">
          <th style="${TH('left','38%')}">Subject</th>
          <th style="${TH('center','10%')}">CA (40)</th>
          <th style="${TH('center','10%')}">Exam (60)</th>
          <th style="${TH('center','12%')}">Total (100)</th>
          <th style="${TH('center','9%')}">Grade</th>
          <th style="${TH('left')}">Remark</th>
        </tr>
      </thead>
      <tbody>${subjectRows}</tbody>
      <tfoot>
        <tr style="background:#dbeafe;font-weight:700;">
          <td style="${TD('left','padding-left:10px;font-size:11px;border-top:2px solid #1e3a8a;')}" colspan="3">OVERALL</td>
          <td style="${TD('center','font-size:13px;color:#1e3a8a;font-weight:900;border-top:2px solid #1e3a8a;')}">${subjectCount?totalScore:'—'}</td>
          <td style="${TD('center','border-top:2px solid #1e3a8a;')}">${subjectCount?gradeChip(overallGrade.letter):'—'}</td>
          <td style="${TD('left','font-size:11px;border-top:2px solid #1e3a8a;')}">Avg: <strong>${average||'—'}${subjectCount?'%':''}</strong> &nbsp;|&nbsp; Position: <strong>${position}</strong> &nbsp;|&nbsp; Class Size: <strong>${classStudents.length}</strong></td>
        </tr>
      </tfoot>
    </table>

    <!-- ── Remarks ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:2px solid #1e3a8a;gap:0;">
      <div style="padding:10px 14px;border-right:1px solid #c7d7f5;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#1e3a8a;margin-bottom:5px;">
          Class Teacher's Remarks${teacher?' — '+teacher.name:''}
        </div>
        ${canEditTeacher
          ? `<textarea id="t-rem-${student.id}" rows="3"
              style="width:100%;font-size:11px;border:1px solid #c7d7f5;border-radius:4px;padding:5px 7px;resize:vertical;font-family:Arial,sans-serif;"
              >${remarkEntry.teacherRemark||''}</textarea>
             <button onclick="saveRemark('${student.id}','${term}','${session}','teacher')"
               style="${btnStyle('primary','sm')};margin-top:4px;font-size:10px;">💾 Save</button>`
          : `<div style="min-height:48px;border:1px solid #e2e8f0;border-radius:4px;padding:6px 8px;font-size:11px;color:#374151;font-style:italic;">${remarkEntry.teacherRemark||'—'}</div>`}
      </div>
      <div style="padding:10px 14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#1e3a8a;margin-bottom:5px;">
          Principal's Remarks — ${school.principal||'Principal'}
        </div>
        ${canEditPrincipal
          ? `<textarea id="p-rem-${student.id}" rows="3"
              style="width:100%;font-size:11px;border:1px solid #c7d7f5;border-radius:4px;padding:5px 7px;resize:vertical;font-family:Arial,sans-serif;"
              >${remarkEntry.principalRemark||''}</textarea>
             <button onclick="saveRemark('${student.id}','${term}','${session}','principal')"
               style="${btnStyle('primary','sm')};margin-top:4px;font-size:10px;">💾 Save</button>`
          : `<div style="min-height:48px;border:1px solid #e2e8f0;border-radius:4px;padding:6px 8px;font-size:11px;color:#374151;font-style:italic;">${remarkEntry.principalRemark||'—'}</div>`}
      </div>
    </div>

    ${SIGN_STAMP(`Page 1 of 2 &nbsp;|&nbsp; ${student.name} &nbsp;|&nbsp; ${cls} ${arm} &nbsp;|&nbsp; ${term} ${session}`)}

    <div style="padding:8px 18px;text-align:right;background:#f8fafc;border-top:1px solid #e2e8f0;" class="no-print">
      <button onclick="printReportCard(this)" style="${btnStyle('primary')}">🖨️ Print / Download PDF</button>
    </div>
  </div>`;

  /* ════════════════════════════════════════════════
     PAGE 2 — Attendance · Grading · Domains · Skills
  ════════════════════════════════════════════════ */
  const page2 = `
  <div class="report-card rc-page2" data-sid="${student.id}" style="${PAGE_STYLE}page-break-before:always;">
    ${HEADER}
    ${STUDENT_BAND}

    <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #c7d7f5;">

      <!-- ── LEFT: Attendance + Grading Scale + Grading Marks ── -->
      <div style="border-right:1px solid #c7d7f5;">

        <!-- Attendance -->
        <div style="border-bottom:1px solid #e2e8f0;">
          <div style="background:#1e3a8a;color:#fff;padding:5px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Attendance Record</div>
          <div style="padding:10px 14px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="flex:1;height:14px;background:#e5e7eb;border-radius:7px;overflow:hidden;">
                <div style="width:${attPct}%;height:100%;background:${attColor};border-radius:7px;"></div>
              </div>
              <span style="font-size:16px;font-weight:900;color:${attColor};min-width:46px;">${attPct}%</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:10px;text-align:center;">
              <div style="background:#f0f9ff;border-radius:4px;padding:5px;">
                <div style="color:#6b7280;">Status</div>
                <div style="font-weight:700;color:${attColor};">${attLabel}</div>
              </div>
              <div style="background:#f0f9ff;border-radius:4px;padding:5px;">
                <div style="color:#6b7280;">Days Present</div>
                <div style="font-weight:700;">${student.daysPresent||'—'}</div>
              </div>
              <div style="background:#f0f9ff;border-radius:4px;padding:5px;">
                <div style="color:#6b7280;">Days Absent</div>
                <div style="font-weight:700;">${student.daysAbsent||'—'}</div>
              </div>
            </div>
            <div style="margin-top:6px;font-size:10px;color:#6b7280;">Minimum required: <strong>75%</strong> &nbsp;|&nbsp; ${attPct>=75?'✅ Requirement met':'⚠️ Below minimum'}</div>
          </div>
        </div>

        <!-- Grading Scale -->
        <div style="border-bottom:1px solid #e2e8f0;">
          <div style="background:#1e3a8a;color:#fff;padding:5px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Grading Scale</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead><tr style="background:#dbeafe;color:#1e3a8a;">
              <th style="${TH('center','20%')}">Grade</th>
              <th style="${TH('center','25%')}">Score</th>
              <th style="${TH('left')}">Interpretation</th>
            </tr></thead>
            <tbody>
              ${[['A','80–100','Excellent / Distinction','#16a34a'],
                 ['B','70–79', 'Very Good / Credit',    '#2563eb'],
                 ['C','60–69', 'Good / Credit',         '#d97706'],
                 ['D','50–59', 'Pass',                  '#ea580c'],
                 ['F','0–49',  'Fail',                  '#dc2626']]
                .map(([g,s,i,c])=>`<tr>
                  <td style="${TD()}">${gradeChip(g)}</td>
                  <td style="${TD()}">${s}</td>
                  <td style="${TD('left','padding-left:8px;')}">${i}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <!-- Rating Marks -->
        <div>
          <div style="background:#1e3a8a;color:#fff;padding:5px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Rating Scale (Skills & Behaviour)</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead><tr style="background:#dbeafe;color:#1e3a8a;">
              <th style="${TH('center','20%')}">Mark</th>
              <th style="${TH('left')}">Meaning</th>
            </tr></thead>
            <tbody>
              ${[['5','Excellent'],['4','Good'],['3','Satisfactory'],['2','Fair'],['1','Poor']]
                .map(([m,l])=>`<tr>
                  <td style="${TD()};font-weight:700;color:#1e40af;">${m}</td>
                  <td style="${TD('left','padding-left:8px;')}">${l}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── RIGHT: 3 Domains ── -->
      <div>
      ${(typeof showDomainOnReport!=="function"||showDomainOnReport()) ? `
        <div style="background:#1e3a8a;color:#fff;padding:5px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Domain Assessments</div>
        ${[
          {label:'Cognitive Domain',   key:'cognitive',   bg:'#eff6ff',bg2:'#dbeafe',clr:'#1e40af'},
          {label:'Affective Domain',   key:'affective',   bg:'#fdf4ff',bg2:'#f3e8ff',clr:'#7e22ce'},
          {label:'Psychomotor Domain', key:'psychomotor', bg:'#f0fdf4',bg2:'#dcfce7',clr:'#166534'},
        ].map(d => {
          const v = domains[d.key];
          const pct = v ? (v/5)*100 : 0;
          return `
          <div style="background:${d.bg};border-bottom:1px solid ${d.bg2};padding:10px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${d.clr};">${d.label}</div>
              <div style="font-size:18px;font-weight:900;color:${d.clr};">${v||'—'}<span style="font-size:10px;font-weight:400;"> / 5</span></div>
            </div>
            <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${d.clr};border-radius:4px;"></div>
            </div>
            <div style="font-size:9px;color:#4b5563;margin-top:3px;">${domainLabel(v)}</div>
          </div>`;
        }).join('')}

        <!-- Next term info -->
        <div style="padding:10px 14px;background:#fffbeb;border-top:1px solid #fde68a;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#92400e;margin-bottom:5px;">Next Term</div>
          <div style="font-size:11px;color:#78350f;">
            <strong>Begins:</strong> ${school.resumptionDate||'Date TBC'}<br>
            <strong>Notice:</strong> ${school.announcements||'No announcements at this time.'}
          </div>
        </div>
      </div>
    </div>

      ` : ""}
    <!-- ── Behaviour Assessment ── -->
    <div style="border-top:2px solid #1e3a8a;">
      <div style="background:#1e3a8a;color:#fff;padding:5px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Behaviour Assessment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
        <div style="border-right:1px solid #c7d7f5;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#dbeafe;color:#1e3a8a;">
              <th style="${TH('left','44%')}">Behaviour</th>
              ${[1,2,3,4,5].map(n=>`<th style="${TH()}">${n}</th>`).join('')}
            </tr></thead>
            <tbody>${behaviourRows}</tbody>
          </table>
        </div>
        <div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#dbeafe;color:#1e3a8a;">
              <th style="${TH('left','44%')}">Skills</th>
              ${[1,2,3,4,5].map(n=>`<th style="${TH()}">${n}</th>`).join('')}
            </tr></thead>
            <tbody>${skillRows}</tbody>
          </table>
        </div>
      </div>
    </div>

    ${SIGN_STAMP(`Page 2 of 2 &nbsp;|&nbsp; ${student.name} &nbsp;|&nbsp; ${cls} ${arm} &nbsp;|&nbsp; ${term} ${session}`)}

    <div style="padding:8px 18px;text-align:right;background:#f8fafc;border-top:1px solid #e2e8f0;" class="no-print">
      <button onclick="printReportCard(this)" style="${btnStyle('primary')}">🖨️ Print / Download PDF</button>
    </div>
  </div>`;

  // ── PAGE 3 — Cumulative (Third Term only) ──────────────────────────────
  let page3 = '';
  const ps  = typeof getPromotionSettings === 'function' ? getPromotionSettings() : {};
  if (term === 'Third Term' && ps.enableCumulative !== false) {
    const cum = typeof computeCumulative === 'function'
      ? computeCumulative(student.id, session)
      : null;
    if (cum) {
      const dc = cum.promotion === ps.labelPromoted  ? '#16a34a'
               : cum.promotion === ps.labelRepeat    ? '#dc2626' : '#d97706';
      const dpx = typeof getDecimalPlaces === 'function' ? getDecimalPlaces() : 1;
      page3 = `
  <div class="report-card rc-page3" data-sid="${student.id}" style="${PAGE_STYLE}page-break-before:always;">
    ${HEADER}
    ${STUDENT_BAND}

    <!-- Cumulative Header -->
    <div style="background:#1e3a8a;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0 14px;">
      📊 Cumulative Session Results — ${session}
    </div>

    <!-- Subject breakdown table -->
    <div style="margin:0 14px;overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#dbeafe;">
          <th style="${TH('left','150px')}">Subject</th>
          ${ps.showTermBreakdown !== false ? `
          <th style="${TH()}">1st Term</th>
          <th style="${TH()}">2nd Term</th>
          <th style="${TH()}">3rd Term</th>` : ''}
          <th style="${TH()}">Cumulative Avg</th>
          <th style="${TH()}">Grade</th>
          <th style="${TH()}">Remark</th>
          <th style="${TH()}">Status</th>
        </tr>
      </thead>
      <tbody>
        ${cum.subjects.map((s, i) => {
          const passed = s.avg !== null && s.avg >= (typeof getPassMark==='function'?getPassMark():40);
          return `<tr style="background:${i%2===0?'#f9fafb':'#fff'};">
            <td style="${TD('left')};font-weight:600;">${s.name}</td>
            ${ps.showTermBreakdown !== false ? `
            <td style="${TD()};color:${s.t1!==null&&s.t1<(typeof getPassMark==='function'?getPassMark():40)?'#dc2626':'#111'};">${s.t1 ?? '—'}</td>
            <td style="${TD()};color:${s.t2!==null&&s.t2<(typeof getPassMark==='function'?getPassMark():40)?'#dc2626':'#111'};">${s.t2 ?? '—'}</td>
            <td style="${TD()};color:${s.t3!==null&&s.t3<(typeof getPassMark==='function'?getPassMark():40)?'#dc2626':'#111'};">${s.t3 ?? '—'}</td>` : ''}
            <td style="${TD()};font-weight:700;font-size:12px;color:${passed?'#1e3a8a':'#dc2626'};">${s.avg ?? '—'}</td>
            <td style="${TD()};">${s.grade}</td>
            <td style="${TD()};color:#6b7280;">${s.remark}</td>
            <td style="${TD()};">
              <span style="background:${passed?'#dcfce7':'#fee2e2'};color:${passed?'#166534':'#991b1b'};padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;">
                ${passed ? 'Pass' : 'Fail'}
              </span>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#eff6ff;font-weight:700;">
          <td style="${TD('left')};font-weight:800;" ${ps.showTermBreakdown!==false?'colspan="4"':'colspan="1"'}>CUMULATIVE SUMMARY</td>
          <td style="${TD()};font-size:13px;font-weight:800;color:#1e3a8a;">${cum.grandAvg ?? '—'}</td>
          <td style="${TD()}">${cum.grandAvg !== null ? grade(cum.grandAvg).letter : '—'}</td>
          <td style="${TD()}">${cum.grandAvg !== null ? grade(cum.grandAvg).remark : '—'}</td>
          <td style="${TD()}"></td>
        </tr>
      </tfoot>
    </table>
    </div>

    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 14px;">
      ${[
        ['Total Subjects', cum.subjects.filter(s=>s.avg!==null).length, '#1e3a8a'],
        ['Subjects Passed', cum.passed, '#16a34a'],
        ['Subjects Failed', cum.failed, '#dc2626'],
        ['Class Position',  ps.showCumulativePosition !== false
          ? computePosition(student.id, cls, arm, 'Third Term', session)
          : '—', '#7c3aed'],
      ].map(([l,v,c])=>`
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:7px;padding:8px;text-align:center;">
          <div style="font-size:15px;font-weight:800;color:${c};">${v}</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${l}</div>
        </div>`).join('')}
    </div>

    ${ps.showPromotionBox !== false ? `
    <!-- Promotion Decision Box -->
    <div style="margin:10px 14px;padding:14px 18px;background:${dc}11;border:2px solid ${dc};border-radius:10px;display:flex;align-items:center;gap:16px;">
      <div style="font-size:36px;">${cum.promotion===ps.labelPromoted?'🎓':cum.promotion===ps.labelRepeat?'🔁':'📋'}</div>
      <div style="flex:1;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${dc};font-weight:700;margin-bottom:3px;">Promotion Decision</div>
        <div style="font-size:22px;font-weight:900;color:${dc};letter-spacing:.04em;">${cum.promotion}</div>
        ${cum.reasons?.length && cum.promotion !== ps.labelPromoted ? `
        <div style="font-size:9px;color:#6b7280;margin-top:4px;">Reason: ${cum.reasons.join(' | ')}</div>` : ''}
        ${ps.showNextClass && cum.promotion === ps.labelPromoted ? `
        <div style="font-size:10px;color:#166534;font-weight:600;margin-top:4px;">Next Class: ${getNextClass(cls)}</div>` : ''}
      </div>
      <div style="text-align:center;">
        <div style="font-size:28px;font-weight:900;color:${dc};">${cum.grandAvg ?? '—'}</div>
        <div style="font-size:9px;color:#6b7280;">Overall Avg</div>
        <div style="font-size:13px;font-weight:700;color:${dc};">${cum.grandAvg !== null ? grade(cum.grandAvg).letter : '—'}</div>
      </div>
    </div>` : ''}

    ${(() => {
      // Show auto-promotion stamp if admin applied it
      const rec = (App?.data?.promotionRecords||[]).find(r => r.studentId === student.id && r.session === session);
      if (!rec) return '';
      return `<div style="margin:4px 14px;padding:5px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;display:flex;align-items:center;gap:8px;font-size:9px;color:#166534;">
        <span style="font-size:12px;">✅</span>
        <span>Auto-promotion applied by <strong>${rec.appliedBy||'Admin'}</strong> on ${rec.appliedAt?new Date(rec.appliedAt).toLocaleDateString():''}</span>
      </div>`;
    })()}

    <!-- Signatures -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:16px 14px 14px;padding-top:10px;border-top:1px solid #e5e7eb;">
      ${['Form Teacher', 'Vice Principal', school.principal||'Principal'].map(role=>`
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #9ca3af;height:30px;margin-bottom:4px;"></div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;">${role}</div>
        </div>`).join('')}
    </div>
    <div style="text-align:right;font-size:8px;color:#9ca3af;padding:4px 14px;">
      Cumulative — Page 3 of 3 &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}
    </div>
  </div>`;
    }
  }

  return page1 + '\n' + page2 + (page3 ? '\n' + page3 : '');
}

/* ── Next class helper ── */
function getNextClass(cls) {
  const order = ['JS 1','JS 2','JS 3','SS 1','SS 2','SS 3',
                 'JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3'];
  const idx = order.findIndex(c => c.toLowerCase() === cls.toLowerCase());
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : '(Final Year)';
}

/* ── Table helpers ── */
function rcTh(align='center'){return`padding:5px 8px;text-align:${align};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;border:0.5px solid #93c5fd;`;}
function rcTd(align='center'){return`padding:4px 8px;text-align:${align};border:0.5px solid #e2e8f0;font-size:11px;`;}
function rcSubjectRow(s,ca,ex,tot,gl,gr,raw){
  const c={A:'#16a34a',B:'#2563eb',C:'#d97706',D:'#ea580c',F:'#dc2626'}[gl]||'#6b7280';
  return `<tr><td style="${rcTd('left')}padding-left:10px;font-weight:500;">${s}</td>
    <td style="${rcTd()}">${ca}</td><td style="${rcTd()}">${ex}</td>
    <td style="${rcTd()}">${tot}</td>
    <td style="${rcTd()}">${gl!=='—'?`<span style="background:${c}1a;color:${c};font-weight:700;padding:1px 7px;border-radius:3px;">${gl}</span>`:'<span style="color:#d1d5db;">—</span>'}</td>
    <td style="${rcTd('left')}font-size:10px;color:#6b7280;">${gr}</td></tr>`;
}
function rcRatingDot(score,slot){const f=score&&Number(score)>=slot;return`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${f?'#1e40af':'#e2e8f0'};"></span>`;}

/* ── Domain helpers ── */
function getDomainScores(studentId, term, session) {
  const record = (App.data.domainAssessments || []).find(d =>
    d.studentId === studentId && d.term === term && d.session === session) || {};
  return {
    cognitive:   record.cognitive   || null,
    affective:   record.affective   || null,
    psychomotor: record.psychomotor || null,
    behavior:    record.behavior    || {},
  };
}
function domainLabel(score) {
  if (!score) return 'Not assessed';
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Very Good';
  if (score >= 2.5) return 'Good';
  if (score >= 1.5) return 'Fair';
  return 'Needs Improvement';
}

/* ── Remarks ── */
window.saveRemark = function(studentId, term, session, type) {
  if (type==='principal' && !priv.isAdmin()) { denyAccess("Only Admin can save the principal's remark."); return; }
  if (type==='teacher'   && !priv.canEnterResults()) { denyAccess('You do not have permission.'); return; }
  const key   = type==='teacher' ? 'teacherRemark' : 'principalRemark';
  const elId  = type==='teacher' ? `t-rem-${studentId}` : `p-rem-${studentId}`;
  const value = document.getElementById(elId)?.value || '';
  let entry = (App.data.remarks||[]).find(r=>r.studentId===studentId&&r.term===term&&r.session===session);
  if (entry) { entry[key] = value; }
  else { entry={studentId,term,session,teacherRemark:'',principalRemark:''}; entry[key]=value; App.data.remarks.push(entry); }
  toast(`${type==='teacher'?'Teacher':'Principal'}'s remark saved!`, 'success');
};

/* ── Position ── */
function computePosition(studentId, cls, arm, term, session) {
  const students = (App.data.students||[]).filter(s=>s.class===cls&&s.arm===arm);
  const scores = students.map(s=>{
    const res=(App.data.results||[]).filter(r=>r.studentId===s.id&&r.term===term&&r.session===session);
    return {id:s.id, avg:res.length?res.reduce((a,b)=>a+b.total,0)/res.length:0};
  }).sort((a,b)=>b.avg-a.avg);
  const idx=scores.findIndex(s=>s.id===studentId);
  return idx<0?'N/A':`${ordinal(idx+1)} / ${students.length}`;
}

window.clearReportOutput = function() {
  document.getElementById('report-cards-output').innerHTML = '';
};

/* ── Print / PDF ── */
window.printReportCard = function(btn) {
  const pages = [];
  // Collect both pages for this student (rc-page1 + rc-page2)
  const page1 = btn.closest('.rc-page1') || btn.closest('.report-card');
  if (!page1) return;
  const sid   = page1.dataset.sid;
  const page2 = document.querySelector(`.rc-page2[data-sid="${sid}"]`);

  [page1, page2].filter(Boolean).forEach(p => {
    const clone = p.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    clone.querySelectorAll('button').forEach(el => el.remove());
    clone.querySelectorAll('textarea').forEach(el => {
      const div = document.createElement('div');
      div.style.cssText = 'min-height:32px;padding:4px 6px;font-size:11px;line-height:1.4;white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:4px;';
      div.textContent = el.value || '—';
      el.replaceWith(div);
    });
    pages.push(clone.outerHTML);
  });

  const win = window.open('', '_blank', 'width=860,height=1100,scrollbars=yes');
  if (!win) { alert('Popup blocked. Please allow popups for printing.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Report Card</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#f3f4f6; padding:1rem; font-family:Arial,Helvetica,sans-serif; }
  .report-card { max-width:780px; margin:0 auto 2rem; }
  .no-print, button { display:none !important; }
  @media print {
    body { background:#fff; padding:0; }
    .report-card { margin:0; border:none !important; box-shadow:none !important; page-break-after:always; }
    @page { size:A4; margin:8mm; }
  }
  .print-btn { display:block !important; text-align:center; margin:1rem auto; }
</style>
</head><body>
<div class="print-btn no-print" style="text-align:center;margin-bottom:1rem;">
  <button onclick="window.print()" style="background:#1e3a8a;color:#fff;border:none;padding:.6rem 1.6rem;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;margin-right:.5rem;">🖨 Print / Save as PDF</button>
  <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:.6rem 1.2rem;border-radius:8px;font-size:1rem;cursor:pointer;">✕ Close</button>
</div>
${pages.join('\n')}
</body></html>`);
  win.document.close();
};