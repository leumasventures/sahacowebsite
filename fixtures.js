'use strict';
/**
 * fixtures.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Sports Fixtures
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
function renderFixtures() {
  const section = document.getElementById('fixtures');
  if (!section) return;

  // Safe data access
  const schoolInfo        = App.data.schoolInfo || {};
  const term              = schoolInfo.term    || '';
  const sessionStr        = schoolInfo.session || '';
  const fixturesList      = App.data.fixtures  || [];
  const canAdmin          = priv.isAdmin();

  const honoursPerSubject = computeSubjectHonours();
  const overallBest       = computeOverallBest();

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
      <h2 style="margin:0;">🏆 Fixtures &amp; Honours</h2>
      ${canAdmin ? `<button onclick="openFixtureModal()" style="${btnStyle('primary')}">+ Add Fixture</button>` : ''}
    </div>

    <!-- Honours Board -->
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 60%,#7c3aed 100%);border-radius:16px;padding:2rem;margin-bottom:2.5rem;color:#fff;box-shadow:0 8px 32px rgba(30,58,95,.35);">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.5rem;">
        <span style="font-size:1.75rem;">🏆</span>
        <div>
          <h3 style="margin:0;font-size:1.1rem;text-transform:uppercase;letter-spacing:.1em;">Honours Board</h3>
          <p style="margin:0;opacity:.7;font-size:.85rem;">${term}${sessionStr ? ' • ' + sessionStr : ''}</p>
        </div>
      </div>
      ${overallBest ? `
        <div style="background:rgba(255,255,255,.12);border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <div style="font-size:2.5rem;">👑</div>
          <div>
            <div style="font-size:.75rem;opacity:.7;text-transform:uppercase;letter-spacing:.08em;">Best Overall Student</div>
            <div style="font-size:1.4rem;font-weight:800;">${overallBest.name}</div>
            <div style="font-size:.875rem;opacity:.8;">${overallBest.class} ${overallBest.arm} · Average: <strong>${overallBest.avg}%</strong> · Grade: <strong>${grade(parseFloat(overallBest.avg)).letter}</strong></div>
          </div>
        </div>` : `
        <div style="background:rgba(255,255,255,.08);border-radius:12px;padding:1rem 1.5rem;margin-bottom:1.5rem;opacity:.7;font-size:.9rem;">
          No result data yet. Enter results to see the honours board.
        </div>`}
      ${honoursPerSubject.length ? `
        <h4 style="margin:0 0 1rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;opacity:.8;">Best Student Per Subject</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:.75rem;">
          ${honoursPerSubject.map(h => `
            <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:.875rem 1rem;display:flex;align-items:center;gap:.75rem;">
              <div style="font-size:1.5rem;">${subjectEmoji(h.subject)}</div>
              <div>
                <div style="font-size:.7rem;opacity:.65;text-transform:uppercase;">${h.subject}</div>
                <div style="font-weight:700;font-size:.95rem;">${h.name}</div>
                <div style="font-size:.8rem;opacity:.75;">${h.class} ${h.arm} · ${h.total}/100 (${grade(h.total).letter})</div>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>

    <!-- Fixtures list -->
    <h3 style="margin-bottom:1rem;">Scheduled Fixtures</h3>
    ${fixturesList.length === 0 ? `
      <div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="font-size:2.5rem;margin-bottom:.5rem;">🏅</div>
        <p style="margin:0;">No fixtures scheduled yet.</p>
        ${canAdmin ? `<button onclick="openFixtureModal()" style="${btnStyle('primary')};margin-top:1rem;">+ Add First Fixture</button>` : ''}
      </div>` :
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.25rem;">
      ${fixturesList.map(f => `
        <div style="background:#fff;border-radius:12px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:4px solid ${f.status==='Completed'?'#22c55e':'#3b82f6'};">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">
            <span style="${badgeStyle('info')}">${f.type}</span>
            <span style="${badgeStyle(f.status==='Completed'?'success':'info')}">${f.status}</span>
          </div>
          ${f.status === 'Completed' ? `
            <div style="text-align:center;padding:.75rem 0;">
              <div style="font-size:1rem;font-weight:700;">${f.teamA||f.team_a} vs ${f.teamB||f.team_b}</div>
              <div style="font-size:2.5rem;font-weight:900;color:#1f2937;margin:.5rem 0;">${f.scoreA??f.score_a??'—'} – ${f.scoreB??f.score_b??'—'}</div>
              <div style="${badgeStyle((f.scoreA??f.score_a)>(f.scoreB??f.score_b)?'success':(f.scoreA??f.score_a)<(f.scoreB??f.score_b)?'danger':'warning')}">
                ${(f.scoreA??f.score_a)>(f.scoreB??f.score_b)?(f.teamA||f.team_a)+' Wins':(f.scoreA??f.score_a)<(f.scoreB??f.score_b)?(f.teamB||f.team_b)+' Wins':'Draw'}
              </div>
            </div>` : `
            <div style="text-align:center;padding:.5rem 0;">
              <div style="font-size:1.1rem;font-weight:700;">${f.teamA||f.team_a} vs ${f.teamB||f.team_b}</div>
            </div>`}
          <div style="font-size:.85rem;color:#6b7280;margin-top:.75rem;">
            <div>📅 ${f.date||'TBD'} ${f.time ? 'at '+f.time : ''}</div>
            <div>📍 ${f.venue||'TBD'}</div>
          </div>
          ${canAdmin ? `
            <div style="display:flex;gap:.5rem;margin-top:1rem;">
              ${f.status === 'Upcoming' ? `<button onclick="recordResult(${f.id})" style="${btnStyle('success','sm')}">Record Result</button>` : ''}
              <button onclick="deleteFixture(${f.id})" style="${btnStyle('danger','sm')}">Delete</button>
            </div>` : ''}
        </div>`).join('')}
    </div>`}`;
}

function subjectEmoji(subject) {
  const map = { 'Mathematics':'📐','English Language':'📝','Biology':'🧬','Chemistry':'⚗️','Physics':'⚛️','Economics':'📊','Government':'🏛️','Literature':'📚','Fine Art':'🎨','Music':'🎵','Computer Studies':'💻','Geography':'🌍','Accounting':'📈','French':'🇫🇷','Further Maths':'🔢' };
  return map[subject] || '🏅';
}

function computeSubjectHonours() {
  const { term, session } = App.data.schoolInfo;
  return [...new Set(App.data.results.filter(r=>r.term===term&&r.session===session).map(r=>r.subject))]
    .map(subject => {
      const entries = App.data.results.filter(r=>r.subject===subject&&r.term===term&&r.session===session);
      if (!entries.length) return null;
      const best = entries.reduce((a,b)=>b.total>a.total?b:a);
      const student = App.data.students.find(s=>s.id===best.studentId);
      return student ? { subject, name: student.name, class: student.class, arm: student.arm, total: best.total } : null;
    }).filter(Boolean).sort((a,b)=>a.subject.localeCompare(b.subject));
}

function computeOverallBest() {
  const { term, session } = App.data.schoolInfo;
  if (!App.data.students.length || !App.data.results.length) return null;
  const withScores = App.data.students.map(s => {
    const results = App.data.results.filter(r=>r.studentId===s.id&&r.term===term&&r.session===session);
    if (!results.length) return null;
    const avg = (results.reduce((a,b)=>a+b.total,0)/results.length).toFixed(1);
    return { ...s, avg: parseFloat(avg), avgStr: avg };
  }).filter(Boolean);
  if (!withScores.length) return null;
  const best = withScores.reduce((a,b)=>b.avg>a.avg?b:a);
  return { name: best.name, class: best.class, arm: best.arm, avg: best.avgStr };
}

window.openFixtureModal = function() {
  if (!priv.isAdmin()) { denyAccess(); return; }
  const teams = [...new Set((App.data.classes || []).flatMap(c => (c.arms||[]).map(a => `${c.name} ${a}`)))];
  const teamOpts = teams.map(t => `<option>${t}</option>`).join('');
  showModal(`
    <h3 style="margin:0 0 1.5rem;">Add Fixture</h3>
    <div style="display:flex;flex-direction:column;gap:.75rem;">
      <div>
        <label style="${labelStyle()}">Type</label>
        <select id="fix-type" style="${selectStyle()};width:100%;">
          <option>Football</option><option>Athletics</option><option>Debate</option>
          <option>Quiz Competition</option><option>Basketball</option><option>Volleyball</option><option>Other</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
        <div><label style="${labelStyle()}">Team A</label><select id="fix-teamA" style="${selectStyle()};width:100%;">${teamOpts}</select></div>
        <div><label style="${labelStyle()}">Team B</label><select id="fix-teamB" style="${selectStyle()};width:100%;">${teamOpts}</select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;">
        <div><label style="${labelStyle()}">Date</label><input type="date" id="fix-date" style="${inputStyle()};width:100%;"></div>
        <div><label style="${labelStyle()}">Time</label><input type="time" id="fix-time" style="${inputStyle()};width:100%;" value="10:00"></div>
      </div>
      <div>
        <label style="${labelStyle()}">Venue</label>
        <input id="fix-venue" placeholder="e.g. School Field" style="${inputStyle()};width:100%;">
      </div>
      <div style="display:flex;gap:.75rem;margin-top:.5rem;justify-content:flex-end;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="submitFixture()" style="${btnStyle('primary')}">Add Fixture</button>
      </div>
    </div>`);
};

window.submitFixture = async function() {
  const type  = document.getElementById('fix-type')?.value;
  const teamA = document.getElementById('fix-teamA')?.value;
  const teamB = document.getElementById('fix-teamB')?.value;
  const date  = document.getElementById('fix-date')?.value;
  const time  = document.getElementById('fix-time')?.value  || '10:00';
  const venue = document.getElementById('fix-venue')?.value || 'School Field';
  if (teamA === teamB) { toast('Teams must be different.', 'error'); return; }
  try {
    const resp = await Fixtures.create({ type, team_a: teamA, team_b: teamB, date, time, venue, status: 'Upcoming' });
    const newFixture = resp.data || { id: Date.now(), type, teamA, teamB, date, time, venue, status: 'Upcoming' };
    App.data.fixtures.push(newFixture);
    closeModal(); renderFixtures(); toast('Fixture added!', 'success');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.recordResult = async function(id) {
  if (!priv.isAdmin()) { denyAccess(); return; }
  const f = (App.data.fixtures || []).find(x => x.id === id);
  if (!f) return;
  const teamA = f.teamA || f.team_a;
  const teamB = f.teamB || f.team_b;
  showModal(`
    <h3 style="margin:0 0 1.5rem;">Record Result</h3>
    <div style="text-align:center;margin-bottom:1.5rem;font-size:1.2rem;font-weight:700;">${teamA} vs ${teamB}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div>
        <label style="${labelStyle()}">${teamA} Score</label>
        <input type="number" id="scoreA" min="0" style="${inputStyle()};width:100%;" required>
      </div>
      <div>
        <label style="${labelStyle()}">${teamB} Score</label>
        <input type="number" id="scoreB" min="0" style="${inputStyle()};width:100%;" required>
      </div>
    </div>
    <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="submitResult(${id})" style="${btnStyle('primary')}">Save Result</button>
    </div>`);
};

window.submitResult = async function(id) {
  const scoreA = parseInt(document.getElementById('scoreA')?.value);
  const scoreB = parseInt(document.getElementById('scoreB')?.value);
  if (isNaN(scoreA) || isNaN(scoreB)) { toast('Enter valid scores', 'error'); return; }
  try {
    await Fixtures.update(id, { score_a: scoreA, score_b: scoreB, status: 'Completed' });
    const f = (App.data.fixtures || []).find(x => x.id === id);
    if (f) { f.scoreA = scoreA; f.score_a = scoreA; f.scoreB = scoreB; f.score_b = scoreB; f.status = 'Completed'; }
    closeModal(); renderFixtures(); toast('Result recorded!', 'success');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.deleteFixture = async function(id) {
  if (!priv.isAdmin()) { denyAccess(); return; }
  if (!confirmDlg('Delete this fixture?')) return;
  try {
    await Fixtures.remove(id);
    App.data.fixtures = (App.data.fixtures || []).filter(f => f.id !== id);
    renderFixtures(); toast('Fixture deleted.', 'warning');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

/* ─────────────────────────────────────────
   SETTINGS PAGE – Comprehensive Enhanced Version
   New additions:
   • Attendance Settings tab: school calendar, holidays, half-days, off-days, breaks
   • General Settings tab: notification prefs, result display options, report card config,
     auto-grade thresholds, score entry modes, portal access toggles, date/time formats
   • Improved tab UI with icons and active indicator
   • Full validation and feedback throughout
─────────────────────────────────────────── */