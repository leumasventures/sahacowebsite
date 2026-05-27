'use strict';
/**
 * attendance.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Attendance
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
function renderAttendance() {
  if (priv.isParent()) { navigate('results'); return; }

  const section   = document.getElementById('attendance');
  const isTeacher = priv.isTeacher();
  const userClass = App.currentUser.assignedClass || '';
  const userArm   = App.currentUser.assignedArm   || '';

  if (!App.data.attendanceRecords) App.data.attendanceRecords = [];
  if (!App.data.domainAssessments) App.data.domainAssessments = [];

  const classOptions = App.data.classes
    .map(c => `<option value="${c.name}" ${userClass === c.name ? 'selected' : ''}>${c.name}</option>`)
    .join('');

  section.innerHTML = `
    <h2 style="margin-bottom:1.25rem;display:flex;align-items:center;gap:1rem;">
      Attendance &amp; Assessment
      ${isTeacher ? `<span style="${badgeStyle('success')}">${userClass} ${userArm}</span>` : ''}
    </h2>

    <div style="background:var(--surface,#fff);border-radius:12px;padding:1.5rem;border:1px solid var(--border,#e2e8f0);margin-bottom:1.25rem;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:1rem;">
        <div>
          <label style="${labelStyle()}">Class</label>
          <select id="att-class" style="${inputStyle()}" onchange="attUpdateArms()" ${isTeacher?'disabled':''}>
            <option value="">— Select class —</option>${classOptions}
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Arm / Section</label>
          <select id="att-arm" style="${inputStyle()}" ${isTeacher?'disabled':''}>
            <option value="">— Select arm —</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Term</label>
          <select id="att-term" style="${inputStyle()}">
            <option>First Term</option>
            <option selected>Second Term</option>
            <option>Third Term</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Academic Session</label>
          <input id="att-session" value="${App.data.schoolInfo?.session || '2025/2026'}" style="${inputStyle()}">
        </div>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
        <button onclick="attLoadRegister()" style="${btnStyle('primary')}">Load Register</button>
        <button onclick="attMarkAllToday('P')" style="${btnStyle('success','sm')}">All Present Today</button>
        <button onclick="attMarkAllToday('A')" style="${btnStyle('danger','sm')}">All Absent Today</button>
        <button onclick="attSaveAll()" style="${btnStyle('secondary','sm')}">Save All</button>
        <button onclick="attExportCSV()" style="${btnStyle('secondary','sm')}">Export CSV</button>
      </div>
    </div>

    <div id="att-tabs" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;"></div>
    <div id="att-pane-attendance"></div>
    <div id="att-pane-domains" style="display:none"></div>
    <div id="att-pane-summary" style="display:none"></div>
  `;

  attRenderTabs();
  if (isTeacher && userClass) { attUpdateArms(); }
}

/* ── Tabs ────────────────────────────────────────────────────────────────────── */
function attRenderTabs() {
  const tabs = [
    { id: 'attendance', label: 'Attendance Register' },
    { id: 'domains',    label: 'Domain Assessment'   },
    { id: 'summary',    label: 'Summary & Stats'      },
  ];
  document.getElementById('att-tabs').innerHTML = tabs.map(t =>
    `<button class="att-tab ${_attActiveTab === t.id ? 'active' : ''}" onclick="attSwitchTab('${t.id}')">${t.label}</button>`
  ).join('');
}

window.attSwitchTab = function(name) {
  _attActiveTab = name;
  attRenderTabs();
  ['attendance', 'domains', 'summary'].forEach(p => {
    const el = document.getElementById('att-pane-' + p);
    if (el) el.style.display = p === name ? '' : 'none';
  });
  if (name === 'summary') attRenderSummary();
};

/* ── Arm selector ─────────────────────────────────────────────────────────── */
window.attUpdateArms = function() {
  const cls = document.getElementById('att-class')?.value;
  const sel = document.getElementById('att-arm');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select arm —</option>';
  if (!cls) return;
  const cd = App.data.classes.find(c => c.name === cls);
  if (cd?.arms) sel.innerHTML += cd.arms.map(a => `<option>${a}</option>`).join('');
};

/* ── Date helpers ─────────────────────────────────────────────────────────── */
function attDateStr(d) { return d.toISOString().split('T')[0]; }
function attIsWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }

function attGetSchoolDays(term) {
  const range = ATT_TERM_DATES[term];
  if (!range) return [];
  const days = [];
  const d = new Date(...range.start);
  const end = new Date(...range.end);
  while (d <= end) {
    days.push({
      str:     attDateStr(d),
      day:     d.getDay(),
      date:    d.getDate(),
      month:   d.getMonth(),
      year:    d.getFullYear(),
      weekend: attIsWeekend(d),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function attGroupByMonth(days) {
  const groups = {};
  days.forEach(d => {
    const key = d.year + '-' + d.month;
    if (!groups[key]) groups[key] = {
      label: new Date(d.year, d.month, 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
      days: [],
    };
    groups[key].days.push(d);
  });
  return Object.values(groups);
}

/* ── Load register ─────────────────────────────────────────────────────────── */
window.attLoadRegister = function() {
  const cls     = document.getElementById('att-class')?.value;
  const arm     = document.getElementById('att-arm')?.value;
  const term    = document.getElementById('att-term')?.value;
  const session = document.getElementById('att-session')?.value;

  if (!cls || !arm || !term || !session) return toast('Please complete all fields.', 'warning');
  if (!priv.canTakeAttendance()) return denyAccess('No permission to take attendance.');
  if (!priv.canActOnClass(cls, arm)) return denyAccess('You can only manage your assigned class/arm.');

  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  if (!students.length) return toast('No students found in this class/arm.', 'warning');

  _attSchoolDays = attGetSchoolDays(term);
  if (!_attSchoolDays.length) return toast('Term date range not configured.', 'warning');

  // Store context on module for use by sub-renderers
  window._attCtx = { cls, arm, term, session, students };

  attRenderSheet();
  attRenderDomainSheet();
};

/* ── Attendance chip helper ────────────────────────────────────────────────── */
function attChipHTML(status, dstr, weekend, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const outline = dstr === today ? 'outline:2px solid #1e40af;outline-offset:-2px;' : '';
  const st = ATT_CHIP_STYLE[status] || ATT_CHIP_STYLE.H;
  return `<span class="att-chip" style="${st};${outline}" 
    onclick="${weekend ? '' : `attCycleCell(this,'${studentId}','${dstr}')`}"
    data-sid="${studentId}" data-dstr="${dstr}">${status}</span>`;
}

/* ── Render attendance sheet ───────────────────────────────────────────────── */
function attRenderSheet() {
  const { cls, arm, term, session, students } = window._attCtx;
  const months  = attGroupByMonth(_attSchoolDays);
  const today   = new Date().toISOString().split('T')[0];
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  /* ── Existing records lookup ── */
  const recMap = {};
  (App.data.attendanceRecords || [])
    .filter(r => r.class === cls && r.arm === arm && r.session === session)
    .forEach(r => { if (!recMap[r.studentId]) recMap[r.studentId] = {}; recMap[r.studentId][r.date] = r; });

  let html = `
    <div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--text2,#6b7280);">
      ${Object.entries({ P:'Present', A:'Absent', L:'Late', E:'Excused' }).map(([k,v]) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;">
          <span class="att-chip" style="${ATT_CHIP_STYLE[k]}">${k}</span> ${v}
        </span>`).join('')}
      <span style="margin-left:auto;font-size:11px;color:var(--text2,#6b7280);">Click a cell to cycle status</span>
    </div>
    <div class="att-sheet-wrap"><table class="att-reg" id="att-main-table">
    <thead>
      <tr style="background:#1e3a8a;color:#fff;">
        <th class="att-name" style="background:#1e3a8a;color:#fff;position:sticky;left:0;z-index:3;vertical-align:middle;padding:6px 10px;" rowspan="2">Student</th>`;

  months.forEach(m => {
    html += `<th colspan="${m.days.length}" style="text-align:center;padding:4px 2px;font-size:10px;font-weight:600;">${m.label}</th>`;
  });
  html += `<th style="text-align:center;padding:4px;background:#1e3a8a;font-size:10px;" rowspan="2">P</th>
            <th style="text-align:center;padding:4px;background:#1e3a8a;font-size:10px;" rowspan="2">A</th>
            <th style="text-align:center;padding:4px;background:#1e3a8a;font-size:10px;" rowspan="2">L</th>
            <th style="text-align:center;padding:4px;background:#1e3a8a;font-size:10px;min-width:48px;" rowspan="2">%</th>
          </tr>
          <tr style="background:#dbeafe;color:#1e40af;">`;

  _attSchoolDays.forEach(d => {
    const wkndStyle = d.weekend ? 'background:#f1f5f9;color:#94a3b8;' : '';
    const todayStyle = d.str === today ? 'background:#eff6ff;font-weight:700;' : '';
    html += `<th style="text-align:center;padding:3px 1px;font-size:10px;border:0.5px solid #93c5fd;min-width:26px;${wkndStyle}${todayStyle}"
               title="${d.str}">${d.date}<br>${DAY_NAMES[d.day]}</th>`;
  });
  html += '</tr></thead><tbody>';

  students.forEach((student, si) => {
    const studentRec = recMap[student.id] || {};
    let present = 0, absent = 0, late = 0, excused = 0;

    html += `<tr id="att-row-${si}">
      <td class="att-name">${student.name}</td>`;

    _attSchoolDays.forEach(d => {
      const rec = studentRec[d.str];
      let status = d.weekend ? 'H' : (rec?.status?.toUpperCase() || 'P');
      if (d.weekend) status = 'H';
      if (!d.weekend) {
        if (status === 'P') present++;
        else if (status === 'A') absent++;
        else if (status === 'L') late++;
        else if (status === 'E') excused++;
      }
      const todayCellStyle = d.str === today && !d.weekend ? 'background:#eff6ff;' : (d.weekend ? 'background:#f8fafc;' : '');
      html += `<td class="att-day-cell ${d.weekend ? 'att-wknd' : ''}" 
                  style="${todayCellStyle}" title="${d.str}" 
                  data-sid="${student.id}" data-dstr="${d.str}" data-weekend="${d.weekend}">
                ${attChipHTML(status, d.str, d.weekend, student.id)}
               </td>`;
    });

    const total = present + absent + late;
    const pct   = total ? Math.round(present / total * 100) : 100;
    const pcls  = pct >= 90 ? 'att-pct-good' : pct >= 75 ? 'att-pct-warn' : 'att-pct-bad';

    html += `<td class="att-sum" style="color:#166534" id="att-p-${si}">${present}</td>
             <td class="att-sum" style="color:#991b1b" id="att-a-${si}">${absent}</td>
             <td class="att-sum" style="color:#854d0e" id="att-l-${si}">${late}</td>
             <td class="att-sum ${pcls}" id="att-pct-${si}">${pct}%</td>
            </tr>`;
  });

  /* ── Footer: daily class total ── */
  html += `<tr style="background:var(--surface2,#f8fafc);font-weight:600;">
    <td class="att-name" style="background:var(--surface2,#f8fafc);font-size:11px;color:var(--text2,#6b7280);">
      Class total (present)
    </td>`;

  _attSchoolDays.forEach(d => {
    if (d.weekend) { html += `<td style="background:#f1f5f9;border:0.5px solid #e2e8f0;"></td>`; return; }
    const cnt = students.filter(s => {
      const rec = recMap[s.id]?.[d.str];
      return !rec || (rec.status || 'P').toUpperCase() === 'P';
    }).length;
    const bg = cnt === students.length ? '#dcfce7' : cnt < students.length * 0.7 ? '#fee2e2' : '#fefce8';
    html += `<td style="text-align:center;padding:2px;font-size:10px;background:${bg};border:0.5px solid #e2e8f0;">${cnt}</td>`;
  });

  html += `<td class="att-sum" colspan="4"></td></tr>`;
  html += '</tbody></table></div>';

  document.getElementById('att-pane-attendance').innerHTML = html;

  /* ── Bind click events ── */
  document.getElementById('att-main-table')?.addEventListener('click', function(e) {
    const chip = e.target.closest('.att-chip');
    const cell = e.target.closest('.att-day-cell');
    if (!chip || !cell || cell.dataset.weekend === 'true') return;
    const sid  = cell.dataset.sid;
    const dstr = cell.dataset.dstr;
    const cur  = chip.textContent.trim();
    const idx  = ATT_CYCLE.indexOf(cur);
    const next = ATT_CYCLE[(idx + 1) % ATT_CYCLE.length];
    chip.textContent = next;
    chip.style.cssText = ATT_CHIP_STYLE[next] +
      (dstr === new Date().toISOString().split('T')[0] ? ';outline:2px solid #1e40af;outline-offset:-2px' : '');
    attUpsertRecord(sid, dstr, next);
    attUpdateRowTotals(sid, si => document.getElementById('att-row-' + si));
  });
}

/* ── Cycle a cell value ─────────────────────────────────────────────────────── */
window.attCycleCell = function(chipEl, studentId, dstr) {
  const cur  = chipEl.textContent.trim();
  const idx  = ATT_CYCLE.indexOf(cur);
  const next = ATT_CYCLE[(idx + 1) % ATT_CYCLE.length];
  chipEl.textContent = next;
  chipEl.style.cssText = ATT_CHIP_STYLE[next] +
    (dstr === new Date().toISOString().split('T')[0] ? ';outline:2px solid #1e40af;outline-offset:-2px' : '');
  attUpsertRecord(studentId, dstr, next);
};

/* ── Upsert an attendance record ────────────────────────────────────────────── */
function attUpsertRecord(studentId, date, status) {
  const { cls, arm, session } = window._attCtx || {};
  if (!cls) return;
  const idx = App.data.attendanceRecords.findIndex(r =>
    r.studentId === studentId && r.date === date && r.class === cls && r.arm === arm && r.session === session
  );
  const rec = { studentId, date, class: cls, arm, session, status: status.toLowerCase(), savedAt: new Date().toISOString() };
  if (idx >= 0) Object.assign(App.data.attendanceRecords[idx], rec);
  else App.data.attendanceRecords.push(rec);
}

/* ── Update row totals ───────────────────────────────────────────────────────── */
function attUpdateRowTotals(studentId) {
  const { students } = window._attCtx || {};
  if (!students) return;
  const si = students.findIndex(s => s.id === studentId);
  if (si < 0) return;
  const { cls, arm, session } = window._attCtx;
  let p = 0, a = 0, l = 0;
  _attSchoolDays.filter(d => !d.weekend).forEach(d => {
    const rec = App.data.attendanceRecords.find(r => r.studentId === studentId && r.date === d.str && r.class === cls && r.arm === arm && r.session === session);
    const st = ((rec?.status) || 'p').toLowerCase();
    if (st === 'p') p++; else if (st === 'a') a++; else if (st === 'l') l++;
  });
  const total = p + a + l;
  const pct   = total ? Math.round(p / total * 100) : 100;
  const pcls  = pct >= 90 ? 'att-pct-good' : pct >= 75 ? 'att-pct-warn' : 'att-pct-bad';
  const ep = document.getElementById(`att-p-${si}`);
  const ea = document.getElementById(`att-a-${si}`);
  const el = document.getElementById(`att-l-${si}`);
  const epct = document.getElementById(`att-pct-${si}`);
  if (ep) ep.textContent = p;
  if (ea) ea.textContent = a;
  if (el) el.textContent = l;
  if (epct) { epct.textContent = pct + '%'; epct.className = 'att-sum ' + pcls; }
}

/* ── Mark all today ──────────────────────────────────────────────────────────── */
window.attMarkAllToday = function(status) {
  const { students } = window._attCtx || {};
  if (!students) return toast('Load a register first.', 'warning');
  const today = new Date().toISOString().split('T')[0];
  students.forEach(s => {
    attUpsertRecord(s.id, today, status);
    document.querySelectorAll(`.att-chip[data-sid="${s.id}"][data-dstr="${today}"]`).forEach(chip => {
      chip.textContent = status;
      chip.style.cssText = ATT_CHIP_STYLE[status] + ';outline:2px solid #1e40af;outline-offset:-2px';
    });
    attUpdateRowTotals(s.id);
  });
  toast(`All students marked ${status === 'P' ? 'Present' : 'Absent'} for today.`, 'success');
};

/* ── Domain Assessment Sheet ─────────────────────────────────────────────────── */
function attRenderDomainSheet() {
  const { students } = window._attCtx || {};
  if (!students) return;

  const domainSel = (studentId, key, current) => {
    const opts = [['', '—'], ...['1','2','3','4','5'].map(v=>[v,v])].map(
      ([v, l]) => `<option value="${v}" ${current == v ? 'selected' : ''}>${l}</option>`
    ).join('');
    return `<select onchange="attSaveDomain('${studentId}','${key}',this.value)"
      style="width:52px;font-size:11px;padding:2px 4px;border:0.5px solid var(--border,#e2e8f0);
             border-radius:4px;background:var(--surface,#fff);color:var(--text,#111);font-family:inherit">
      ${opts}</select>`;
  };

  let html = `<div class="att-sheet-wrap"><table class="att-reg"><thead>
    <tr style="background:#1e3a8a;color:#fff;">
      <th class="att-name" style="background:#1e3a8a;color:#fff;position:sticky;left:0;z-index:2;">Student</th>
      <th colspan="3" style="text-align:center;padding:5px;font-size:11px;">Domain Scores (1–5)</th>
      <th colspan="${ATT_BEHAVIORS.length}" style="text-align:center;padding:5px;font-size:11px;">Behaviour Assessment (1–5)</th>
    </tr>
    <tr style="background:#dbeafe;color:#1e40af;">
      <th class="att-name" style="background:#eff6ff;position:sticky;left:0;z-index:2;"></th>
      ${['Cognitive','Affective','Psychomotor'].map(d =>
        `<th style="min-width:70px;padding:5px;text-align:center;font-size:10px;font-weight:600;">${d}</th>`).join('')}
      ${ATT_BEHAVIORS.map(b =>
        `<th style="min-width:70px;padding:5px;text-align:center;font-size:10px;font-weight:500;">${b}</th>`).join('')}
    </tr></thead><tbody>`;

  students.forEach(student => {
    const { cls, arm, term, session } = window._attCtx;
    const existing = (App.data.domainAssessments || []).find(d =>
      d.studentId === student.id && d.term === term && d.session === session
    ) || {};

    html += `<tr>
      <td class="att-name">${student.name}</td>
      ${[['cognitive','#eff6ff'],['affective','#fdf2f8'],['psychomotor','#f0fdf4']].map(([k,bg]) =>
        `<td style="text-align:center;padding:4px;background:${bg};border:0.5px solid var(--border,#e2e8f0)">
          ${domainSel(student.id, k, existing[k]||'')}
        </td>`).join('')}
      ${ATT_BEHAVIORS.map((b, bi) =>
        `<td style="text-align:center;padding:4px;border:0.5px solid var(--border,#e2e8f0)">
          ${domainSel(student.id, 'behavior_' + bi, existing['behavior_'+bi]||'')}
        </td>`).join('')}
    </tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('att-pane-domains').innerHTML = html;
}

/* ── Save a single domain value ──────────────────────────────────────────────── */
window.attSaveDomain = function(studentId, key, value) {
  const { term, session } = window._attCtx || {};
  if (!term) return;
  if (!App.data.domainAssessments) App.data.domainAssessments = [];
  const idx = App.data.domainAssessments.findIndex(d => d.studentId === studentId && d.term === term && d.session === session);
  if (idx >= 0) App.data.domainAssessments[idx][key] = value ? Number(value) : null;
  else App.data.domainAssessments.push({ studentId, term, session, [key]: value ? Number(value) : null });
};

/* ── Summary & Stats ─────────────────────────────────────────────────────────── */
function attRenderSummary() {
  const { cls, arm, term, session, students } = window._attCtx || {};
  if (!students) { document.getElementById('att-pane-summary').innerHTML = '<p style="padding:2rem;color:var(--text2)">Load a register first.</p>'; return; }

  const schoolDayCount = _attSchoolDays.filter(d => !d.weekend).length;

  function countFor(sid, status) {
    return App.data.attendanceRecords.filter(r =>
      r.studentId === sid && r.class === cls && r.arm === arm && r.session === session &&
      !_attSchoolDays.find(d => d.str === r.date)?.weekend &&
      (r.status || 'p').toLowerCase() === status
    ).length;
  }

  const totals = students.map(s => ({
    name: s.name, id: s.id,
    p: countFor(s.id, 'p'), a: countFor(s.id, 'a'), l: countFor(s.id, 'l'), e: countFor(s.id, 'e'),
  })).map(s => ({ ...s, pct: Math.round((s.p / (s.p + s.a + s.l || 1)) * 100) }));

  const avgPct   = Math.round(totals.reduce((s, x) => s + x.pct, 0) / totals.length);
  const avgP     = Math.round(totals.reduce((s, x) => s + x.p, 0) / totals.length);
  const avgA     = Math.round(totals.reduce((s, x) => s + x.a, 0) / totals.length);
  const belowPct = totals.filter(s => s.pct < 75).length;

  document.getElementById('att-pane-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:1.25rem;">
      <div class="att-stat"><div class="sv" style="color:#1e40af">${schoolDayCount}</div><div class="sl">School days (term)</div></div>
      <div class="att-stat"><div class="sv" style="color:#166534">${avgP}</div><div class="sl">Avg days present</div></div>
      <div class="att-stat"><div class="sv" style="color:#991b1b">${avgA}</div><div class="sl">Avg days absent</div></div>
      <div class="att-stat"><div class="sv" style="color:${avgPct>=90?'#166534':avgPct>=75?'#854d0e':'#991b1b'}">${avgPct}%</div><div class="sl">Class avg attendance</div></div>
      <div class="att-stat"><div class="sv" style="color:#991b1b">${belowPct}</div><div class="sl">Below 75% threshold</div></div>
    </div>
    <div class="att-sheet-wrap"><table class="att-reg">
      <thead><tr style="background:#1e3a8a;color:#fff;">
        <th style="padding:7px 10px;text-align:left;min-width:160px">Student</th>
        <th style="padding:7px 8px;text-align:center">Days</th>
        <th style="padding:7px 8px;text-align:center;color:#86efac">Present</th>
        <th style="padding:7px 8px;text-align:center;color:#fca5a5">Absent</th>
        <th style="padding:7px 8px;text-align:center;color:#fde68a">Late</th>
        <th style="padding:7px 8px;text-align:center;color:#bae6fd">Excused</th>
        <th style="padding:7px 8px;text-align:center">%</th>
        <th style="padding:7px 8px;text-align:center">Status</th>
      </tr></thead>
      <tbody>
        ${totals.map(s => {
          const pcls = s.pct >= 90 ? 'att-pct-good' : s.pct >= 75 ? 'att-pct-warn' : 'att-pct-bad';
          const flag = s.pct < 75 ? `<span class="att-alert">Below 75%</span>` : '';
          const barW = s.pct;
          const barC = s.pct >= 90 ? '#22c55e' : s.pct >= 75 ? '#f59e0b' : '#ef4444';
          return `<tr>
            <td style="padding:5px 10px;border:0.5px solid var(--border,#e2e8f0);font-weight:500">${s.name}${flag}</td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0)">${schoolDayCount}</td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0);color:#166534;font-weight:600">${s.p}</td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0);color:#991b1b">${s.a}</td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0);color:#854d0e">${s.l}</td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0);color:#075985">${s.e}</td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0);">
              <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-bottom:2px">
                <div style="width:${barW}%;height:100%;background:${barC}"></div>
              </div>
              <span class="${pcls}" style="font-size:11px;font-weight:600">${s.pct}%</span>
            </td>
            <td style="padding:5px 8px;text-align:center;border:0.5px solid var(--border,#e2e8f0);">
              <span style="font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600;
                background:${s.pct>=90?'#dcfce7':s.pct>=75?'#fef9c3':'#fee2e2'};
                color:${s.pct>=90?'#166534':s.pct>=75?'#854d0e':'#991b1b'}">
                ${s.pct>=90?'Excellent':s.pct>=75?'Satisfactory':'Needs Attention'}
              </span>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
}

/* ── Save all ─────────────────────────────────────────────────────────────────── */
window.attSaveAll = function() {
  const { cls, arm } = window._attCtx || {};
  if (!cls) return toast('Load a register first.', 'warning');
  if (!priv.canTakeAttendance()) return denyAccess('No permission to save.');
  if (!priv.canActOnClass(cls, arm)) return denyAccess('Restricted to your class only.');
  toast('Attendance & domain marks saved successfully!', 'success');
};

/* ── Export CSV ───────────────────────────────────────────────────────────────── */
window.attExportCSV = function() {
  const { cls, arm, term, session, students } = window._attCtx || {};
  if (!students) return toast('Load a register first.', 'warning');
  const wkdays = _attSchoolDays.filter(d => !d.weekend);
  let csv = 'Student ID,Student Name,' + wkdays.map(d => d.str).join(',') + ',Present,Absent,Late,Excused,%\n';
  students.forEach(s => {
    const row = wkdays.map(d => {
      const rec = App.data.attendanceRecords.find(r => r.studentId === s.id && r.date === d.str && r.class === cls && r.session === session);
      return (rec?.status || 'p').toUpperCase();
    });
    const p = row.filter(v => v === 'P').length;
    const a = row.filter(v => v === 'A').length;
    const l = row.filter(v => v === 'L').length;
    const e = row.filter(v => v === 'E').length;
    const pct = Math.round(p / (p + a + l || 1) * 100);
    csv += `"${s.id}","${s.name}",${row.join(',')},${p},${a},${l},${e},${pct}%\n`;
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `attendance_${cls}_${arm}_${term.replace(/ /g,'_')}_${session.replace('/','_')}.csv`;
  a.click();
  toast('Exported attendance CSV.', 'success');
};

/* ── Clear ────────────────────────────────────────────────────────────────────── */
window.clearAttendanceForm = function() {
  if (!confirmDlg('Clear form? Unsaved changes will be lost.')) return;
  ['att-pane-attendance','att-pane-domains','att-pane-summary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  window._attCtx = null;
  _attSchoolDays = [];
};

/* ─────────────────────────────────────────
   15. FIXTURES & HONOURS
   All roles can view; only Admin can add/delete/record results
───────────────────────────────────────── */