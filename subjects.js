'use strict';
/**
 * students.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Students (fixtures, sort, render, view, edit, bulk, print)
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
/* ── FIXTURES ─────────────────────────────────────────────────────────────── */

/**
 * generateArmFixtures()
 * Call once to ensure every class in App.data.classes has a sensible arms array.
 * Skips classes that already have arms defined.
 * Default pattern: ['A','B','C'] for Junior, ['A','B'] for Senior.
 */
window.generateArmFixtures = function () {
  let added = 0;
  (App.data.classes || []).forEach(cls => {
    if (!Array.isArray(cls.arms) || cls.arms.length === 0) {
      cls.arms = cls.level === 'Senior' ? ['A', 'B'] : ['A', 'B', 'C'];
      added++;
    }
  });
  if (added > 0) toast(`Arms fixtures generated for ${added} class${added !== 1 ? 'es' : ''}.`, 'success');
  else toast('All classes already have arms defined.', 'info');
  renderArms();
};

/**
 * seedDemoArmsData()
 * Heavier fixture: creates 3 demo classes with arms if App.data.classes is empty.
 */
window.seedDemoArmsData = function () {
  if (!App.data.classes) App.data.classes = [];
  if (!App.data.students) App.data.students = [];

  const demoClasses = [
    { id: 101, name: 'JSS 1', level: 'Junior',  arms: ['A', 'B', 'C'] },
    { id: 102, name: 'JSS 2', level: 'Junior',  arms: ['A', 'B'] },
    { id: 103, name: 'SSS 1', level: 'Senior',  arms: ['A', 'B'] },
  ];

  demoClasses.forEach(demo => {
    if (!App.data.classes.find(c => c.name === demo.name)) {
      App.data.classes.push(demo);
    }
  });

  toast('Demo class/arm data seeded.', 'success');
  renderArms();
};


/* ── HELPERS ──────────────────────────────────────────────────────────────── */

function armStudents(className, arm) {
  return (App.data.students || [])
    .filter(s => s.class === className && s.arm === arm)
    .sort((a, b) => String(a.name||'').localeCompare(String(b.name||'')));
}

function armTeachers(className, arm) {
  return (App.data.teachers || []).filter(t => t.assignedClass === className && t.assignedArm === arm);
}

/** Capacity bar HTML: filled / total students vs a configurable max */
function capacityBar(count, max = 40) {
  const pct  = Math.min(100, Math.round((count / max) * 100));
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return `
    <div style="margin-top:.5rem;">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#9ca3af;margin-bottom:.2rem;">
        <span>${count} enrolled</span><span>max ~${max}</span>
      </div>
      <div style="background:#f3f4f6;border-radius:99px;height:5px;overflow:hidden;">
        <div style="width:${pct}%;background:${color};height:100%;border-radius:99px;transition:width .4s;"></div>
      </div>
    </div>`;
}

/** A single arm card */
function armCard(cls, arm) {
  const students = armStudents(cls.name, arm);
  const teachers = armTeachers(cls.name, arm);
  const count    = students.length;

  return `
    <div id="arm-card-${cls.id}-${arm}"
      draggable="true"
      ondragstart="armDragStart(event,'${cls.id}','${arm}')"
      ondragover="event.preventDefault();"
      ondrop="armDrop(event,'${cls.id}','${arm}')"
      style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:1rem 1.1rem;
             min-width:160px;flex:1;max-width:220px;cursor:grab;transition:box-shadow .15s, border-color .15s;"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)';this.style.borderColor='#93c5fd';"
      onmouseout="this.style.boxShadow='';this.style.borderColor='#e5e7eb';">

      <!-- Drag handle + arm name -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem;">
        <div style="display:flex;align-items:center;gap:.4rem;">
          <span style="color:#d1d5db;font-size:1rem;cursor:grab;" title="Drag to reorder">⠿</span>
          <strong style="font-size:1rem;color:#1e3a5f;">${cls.name} ${arm}</strong>
        </div>
        <!-- Reorder buttons -->
        <div style="display:flex;gap:.15rem;">
          <button title="Move left" onclick="moveArmLeft(${cls.id},'${arm}')"
            style="background:none;border:1px solid #e5e7eb;border-radius:5px;width:22px;height:22px;cursor:pointer;font-size:.7rem;color:#6b7280;display:flex;align-items:center;justify-content:center;">◀</button>
          <button title="Move right" onclick="moveArmRight(${cls.id},'${arm}')"
            style="background:none;border:1px solid #e5e7eb;border-radius:5px;width:22px;height:22px;cursor:pointer;font-size:.7rem;color:#6b7280;display:flex;align-items:center;justify-content:center;">▶</button>
        </div>
      </div>

      <!-- Teacher badge -->
      <div style="font-size:.78rem;color:#6b7280;margin-bottom:.3rem;">
        ${teachers.length > 0
          ? `<span style="color:#059669;">👩‍🏫 ${teachers.map(t=>t.name).join(', ')}</span>`
          : `<span style="color:#d1d5db;">No teacher assigned</span>`}
      </div>

      ${capacityBar(count)}

      <!-- Action buttons -->
      <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.85rem;">
        <button onclick="viewArmStudents(${cls.id},'${arm}')"
          style="${btnStyle('secondary','sm')};font-size:.75rem;">👁 View</button>
        <button onclick="renameArm(${cls.id},'${arm}')"
          style="${btnStyle('secondary','sm')};font-size:.75rem;">✏ Rename</button>
        <button onclick="openMoveStudents(${cls.id},'${arm}')"
          style="${btnStyle('secondary','sm')};font-size:.75rem;">🔀 Move</button>
        <button onclick="printClassList('${cls.name}','${arm}')"
          style="${btnStyle('primary','sm')};font-size:.75rem;">🖨 List</button>
        <button onclick="printScoresheet('${cls.name}','${arm}')"
          style="${btnStyle('secondary','sm')};font-size:.75rem;">📋 Scoresheet</button>
        <button onclick="deleteArm(${cls.id},'${arm}')"
          style="${btnStyle('danger','sm')};font-size:.75rem;">🗑</button>
      </div>
    </div>`;
}


/* ── MAIN RENDER ──────────────────────────────────────────────────────────── */

function renderArms() {
  if (!priv.canManage()) { accessDeniedPage('arms'); return; }

  const section  = document.getElementById('arms');
  const classes  = App.data.classes || [];
  const students = App.data.students || [];

  /* Global stats */
  const totalArms    = classes.reduce((n, c) => n + (c.arms?.length || 0), 0);
  const allArmSizes  = classes.flatMap(c => (c.arms||[]).map(a => armStudents(c.name,a).length));
  const avgSize      = totalArms ? (allArmSizes.reduce((a,b)=>a+b,0)/totalArms).toFixed(1) : 0;
  const maxSize      = allArmSizes.length ? Math.max(...allArmSizes) : 0;
  const emptyArms    = allArmSizes.filter(n => n === 0).length;

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:1rem;">
      <h2 style="margin:0;">Class Arms</h2>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button onclick="generateArmFixtures()" style="${btnStyle('secondary')}">🔧 Generate Fixtures</button>
        ${classes.length === 0 ? `<button onclick="seedDemoArmsData()" style="${btnStyle('secondary')}">🌱 Seed Demo Data</button>` : ''}
      </div>
    </div>

    <!-- Stats bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1.75rem;">
      ${[
        ['🚪','Total Arms',    totalArms,  '#2563eb'],
        ['📊','Avg Class Size',avgSize,    '#0891b2'],
        ['🏆','Largest Arm',   maxSize,    '#7c3aed'],
        ['🟡','Empty Arms',    emptyArms,  emptyArms>0?'#d97706':'#059669'],
      ].map(([icon, label, val, color]) => `
        <div style="background:#fff;border-radius:12px;padding:.9rem 1.1rem;
                    box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid ${color};">
          <div style="font-size:1.2rem;">${icon}</div>
          <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2;">${val}</div>
          <div style="font-size:.75rem;color:#6b7280;margin-top:.1rem;">${label}</div>
        </div>`).join('')}
    </div>

    ${classes.length === 0
      ? `<div style="background:#fff;border-radius:12px;padding:4rem 2rem;text-align:center;
                     box-shadow:0 2px 8px rgba(0,0,0,.07);">
           <div style="font-size:3rem;margin-bottom:1rem;">🚪</div>
           <h3 style="margin:0 0 .5rem;color:#374151;">No classes found</h3>
           <p style="color:#9ca3af;margin:0 0 1.5rem;">
             Add classes first, or seed demo data to get started.
           </p>
           <button onclick="seedDemoArmsData()" style="${btnStyle('primary')}">🌱 Seed Demo Data</button>
         </div>`
      : classes.map(cls => renderClassArmsBlock(cls)).join('')
    }`;
}

/** Render the collapsible block for one class */
function renderClassArmsBlock(cls) {
  const collapseKey = `arms-collapsed-${cls.id}`;
  const collapsed   = window[collapseKey] || false;
  const total       = (cls.arms||[]).reduce((n,a) => n + armStudents(cls.name,a).length, 0);

  return `
    <div id="arms-block-${cls.id}"
      style="background:#fff;border-radius:14px;padding:1.25rem 1.5rem;
             margin-bottom:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.07);">

      <!-- Class header row -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  flex-wrap:wrap;gap:.5rem;margin-bottom:${collapsed?'0':'1rem'};">
        <div style="display:flex;align-items:center;gap:.65rem;cursor:pointer;"
          onclick="toggleArmsBlock(${cls.id})">
          <span style="font-size:1rem;color:#6b7280;transition:transform .2s;
                       display:inline-block;transform:rotate(${collapsed?'-90':'0'}deg);"
            id="chevron-${cls.id}">▾</span>
          <h3 style="margin:0;">${cls.name}</h3>
          <span style="${badgeStyle(cls.level==='Junior'?'info':'success')}">${cls.level}</span>
          <span style="${badgeStyle('secondary')}">${(cls.arms||[]).length} arm${(cls.arms||[]).length!==1?'s':''}</span>
          <span style="font-size:.8rem;color:#9ca3af;">${total} students</span>
        </div>
        <button onclick="addArm(${cls.id})" style="${btnStyle('primary','sm')}">+ Add Arm</button>
      </div>

      <!-- Arms grid (collapsible) -->
      <div id="arms-grid-${cls.id}" style="display:${collapsed?'none':'flex'};flex-wrap:wrap;gap:.85rem;">
        ${(cls.arms||[]).length === 0
          ? `<p style="color:#9ca3af;font-size:.875rem;padding:.5rem 0;">
               No arms for this class. Click "+ Add Arm" to create one.
             </p>`
          : (cls.arms||[]).map(arm => armCard(cls, arm)).join('')}
      </div>
    </div>`;
}


/* ── COLLAPSE / EXPAND ────────────────────────────────────────────────────── */

window.toggleArmsBlock = function (classId) {
  const key  = `arms-collapsed-${classId}`;
  window[key] = !window[key];
  const grid    = document.getElementById(`arms-grid-${classId}`);
  const chevron = document.getElementById(`chevron-${classId}`);
  if (grid)    grid.style.display    = window[key] ? 'none' : 'flex';
  if (chevron) chevron.style.transform = window[key] ? 'rotate(-90deg)' : 'rotate(0deg)';
};


/* ── DRAG-TO-REORDER ──────────────────────────────────────────────────────── */

let _dragArm = null, _dragClassId = null;

window.armDragStart = function (e, classId, arm) {
  _dragClassId = parseInt(classId);
  _dragArm     = arm;
  e.dataTransfer.effectAllowed = 'move';
};

window.armDrop = function (e, classId, targetArm) {
  e.preventDefault();
  if (_dragArm === null || parseInt(classId) !== _dragClassId || _dragArm === targetArm) return;
  const cls  = App.data.classes.find(c => c.id === _dragClassId);
  if (!cls) return;
  const from = cls.arms.indexOf(_dragArm);
  const to   = cls.arms.indexOf(targetArm);
  if (from < 0 || to < 0) return;
  cls.arms.splice(from, 1);
  cls.arms.splice(to, 0, _dragArm);
  _dragArm = null; _dragClassId = null;
  refreshArmsGrid(cls);
};


/* ── REORDER BUTTONS ──────────────────────────────────────────────────────── */

window.moveArmLeft = function (classId, arm) {
  const cls = App.data.classes.find(c => c.id === classId);
  if (!cls) return;
  const i = cls.arms.indexOf(arm);
  if (i <= 0) return;
  [cls.arms[i-1], cls.arms[i]] = [cls.arms[i], cls.arms[i-1]];
  refreshArmsGrid(cls);
};

window.moveArmRight = function (classId, arm) {
  const cls = App.data.classes.find(c => c.id === classId);
  if (!cls) return;
  const i = cls.arms.indexOf(arm);
  if (i < 0 || i >= cls.arms.length - 1) return;
  [cls.arms[i], cls.arms[i+1]] = [cls.arms[i+1], cls.arms[i]];
  refreshArmsGrid(cls);
};

/** Re-render only the arms grid inside a class block (no full page re-render) */
function refreshArmsGrid(cls) {
  const grid = document.getElementById(`arms-grid-${cls.id}`);
  if (!grid) { renderArms(); return; }
  grid.innerHTML = (cls.arms||[]).length === 0
    ? `<p style="color:#9ca3af;font-size:.875rem;padding:.5rem 0;">No arms for this class.</p>`
    : cls.arms.map(arm => armCard(cls, arm)).join('');
}


/* ── ADD ARM ──────────────────────────────────────────────────────────────── */

window.addArm = function (classId) {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls = App.data.classes.find(c => c.id === classId);
  if (!cls) return;

  showModal(`
    <h3 style="margin:0 0 .25rem;">Add Arm to ${cls.name}</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">
      Current arms: <strong>${cls.arms.join(', ') || 'none'}</strong>
    </p>
    <form id="arm-form">
      <label style="${labelStyle()}">Arm Letter(s) <span style="color:#9ca3af;font-weight:400;">(comma-separated for multiple)</span></label>
      <input id="arm-letter" placeholder="e.g. D  or  D, E, F"
        style="${inputStyle()}" autocomplete="off" required autofocus>
      <div id="arm-error" style="color:#ef4444;font-size:.8rem;margin-top:.3rem;display:none;"></div>
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
        <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button type="submit" style="${btnStyle('primary')}">Add Arm</button>
      </div>
    </form>`);

  document.getElementById('arm-form').onsubmit = (e) => {
    e.preventDefault();
    const raw     = document.getElementById('arm-letter').value;
    const letters = raw.split(',').map(l => l.trim().toUpperCase()).filter(Boolean);
    const errEl   = document.getElementById('arm-error');

    if (!letters.length) { errEl.textContent='Enter at least one arm letter.'; errEl.style.display=''; return; }

    const dupes = letters.filter(l => cls.arms.includes(l));
    if (dupes.length) { errEl.textContent=`Already exists: ${dupes.join(', ')}`; errEl.style.display=''; return; }
    errEl.style.display = 'none';

    const invalid = letters.filter(l => !/^[A-Z0-9]{1,3}$/.test(l));
    if (invalid.length) { errEl.textContent=`Invalid arm name(s): ${invalid.join(', ')}. Use 1-3 letters/digits.`; errEl.style.display=''; return; }

    Classes.addArm(cls.name, { arms: letters }).then(() => {
      letters.forEach(l => cls.arms.push(l));
      closeModal();
      refreshArmsGrid(cls);
      toast(`Arm${letters.length>1?'s':''} ${letters.map(l=>`${cls.name} ${l}`).join(', ')} added!`, 'success');
    }).catch(err => {
      toast('Error adding arm: ' + (err.message || 'Unknown error'), 'error');
    });
  };
};


/* ── RENAME ARM ───────────────────────────────────────────────────────────── */

window.renameArm = function (classId, arm) {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls      = App.data.classes.find(c => c.id === classId);
  const count    = armStudents(cls.name, arm).length;
  const teachers = armTeachers(cls.name, arm).length;

  showModal(`
    <h3 style="margin:0 0 .25rem;">Rename Arm — ${cls.name} ${arm}</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 ${count||teachers?'.75':'1.5'}rem;">
      This will update all records that reference this arm.
    </p>
    ${count > 0 ? `<div style="${infoNote('info')}">📌 ${count} student record${count!==1?'s':''} will be updated.</div>` : ''}
    ${teachers > 0 ? `<div style="${infoNote('warning')}">⚠ ${teachers} teacher assignment${teachers!==1?'s':''} will be updated.</div>` : ''}
    <form id="rename-arm-form" style="margin-top:1.25rem;">
      <label style="${labelStyle()}">New Arm Name</label>
      <input id="new-arm-name" value="${arm}" maxlength="5"
        style="${inputStyle()}" autocomplete="off" required>
      <div id="rename-error" style="color:#ef4444;font-size:.8rem;margin-top:.3rem;display:none;"></div>
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
        <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button type="submit" style="${btnStyle('primary')}">Rename</button>
      </div>
    </form>`);

  document.getElementById('rename-arm-form').onsubmit = (e) => {
    e.preventDefault();
    const newName = document.getElementById('new-arm-name').value.trim().toUpperCase();
    const errEl   = document.getElementById('rename-error');

    if (!newName)                  { errEl.textContent='Enter a name.'; errEl.style.display=''; return; }
    if (!/^[A-Z0-9]{1,5}$/.test(newName)) { errEl.textContent='Use 1-5 letters or digits.'; errEl.style.display=''; return; }
    if (newName === arm)           { closeModal(); return; }
    if (cls.arms.includes(newName)) { errEl.textContent=`Arm "${newName}" already exists.`; errEl.style.display=''; return; }

    /* Apply rename */
    cls.arms[cls.arms.indexOf(arm)] = newName;
    (App.data.students||[]).forEach(s => { if (s.class===cls.name && s.arm===arm) s.arm=newName; });
    (App.data.teachers||[]).forEach(t => { if (t.assignedClass===cls.name && t.assignedArm===arm) t.assignedArm=newName; });

    closeModal();
    refreshArmsGrid(cls);
    toast(`Arm renamed to ${cls.name} ${newName}.`, 'success');
  };
};


/* ── VIEW STUDENTS IN ARM ─────────────────────────────────────────────────── */

window.viewArmStudents = function (classId, arm) {
  const cls      = App.data.classes.find(c => c.id === classId);
  const students = armStudents(cls.name, arm);

  showModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:.5rem;">
      <h3 style="margin:0;">Students — ${cls.name} ${arm}</h3>
      <span style="${badgeStyle('info')}">${students.length} enrolled</span>
    </div>
    ${students.length === 0
      ? `<div style="text-align:center;padding:2rem;color:#9ca3af;">
           <div style="font-size:2rem;margin-bottom:.5rem;">🎒</div>
           <p style="margin:0;">No students enrolled in this arm yet.</p>
         </div>`
      : `<div style="overflow-x:auto;max-height:340px;overflow-y:auto;">
           <table style="${tableStyle()}font-size:.875rem;">
             <thead><tr style="${thRowStyle()}">
               <th style="${thStyle()}">#</th>
               <th style="${thStyle()}">Student ID</th>
               <th style="${thStyle()}">Name</th>
               <th style="${thStyle()}">Gender</th>
             </tr></thead>
             <tbody>
               ${students.map((s,i) => `
                 <tr style="${trStyle()}">
                   <td style="${tdStyle()}">${i+1}</td>
                   <td style="${tdStyle()};font-family:monospace;">${s.id}</td>
                   <td style="${tdStyle()};font-weight:500;">${s.name}</td>
                   <td style="${tdStyle()}"><span style="${badgeStyle(s.gender==='Female'?'info':'secondary')}">${s.gender||'—'}</span></td>
                 </tr>`).join('')}
             </tbody>
           </table>
         </div>`}
    <div style="text-align:right;margin-top:1.25rem;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Close</button>
    </div>`);
};


/* ── MOVE STUDENTS ────────────────────────────────────────────────────────── */

window.openMoveStudents = function (classId, arm) {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls      = App.data.classes.find(c => c.id === classId);
  const students = armStudents(cls.name, arm);
  const otherArms = cls.arms.filter(a => a !== arm);

  if (students.length === 0) { toast('No students in this arm to move.', 'info'); return; }
  if (otherArms.length === 0) { toast('No other arms to move students to.', 'warning'); return; }

  showModal(`
    <h3 style="margin:0 0 .25rem;">Move Students — ${cls.name} ${arm}</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">
      Move all <strong>${students.length}</strong> student${students.length!==1?'s':''} from ${arm} to another arm.
    </p>
    <label style="${labelStyle()}">Destination Arm</label>
    <select id="move-target-arm" style="${inputStyle()}">
      ${otherArms.map(a => `<option value="${a}">${cls.name} ${a} (${armStudents(cls.name,a).length} students)</option>`).join('')}
    </select>
    <div style="display:flex;gap:.75rem;margin-top:1.75rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="confirmMoveStudents(${cls.id},'${arm}')" style="${btnStyle('primary')}">Move Students</button>
    </div>`);
};

window.confirmMoveStudents = function (classId, fromArm) {
  const targetArm = document.getElementById('move-target-arm').value;
  const cls       = App.data.classes.find(c => c.id === classId);
  const moved     = armStudents(cls.name, fromArm);

  moved.forEach(s => { s.arm = targetArm; });
  closeModal();
  refreshArmsGrid(cls);
  toast(`${moved.length} student${moved.length!==1?'s':''} moved to ${cls.name} ${targetArm}.`, 'success');
};


/* ── DELETE ARM ───────────────────────────────────────────────────────────── */

window.deleteArm = function (classId, arm) {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls      = App.data.classes.find(c => c.id === classId);
  const enrolled = armStudents(cls.name, arm).length;
  const teachers = armTeachers(cls.name, arm).length;

  /* Block if students are enrolled */
  if (enrolled > 0) {
    showModal(`
      <div style="text-align:center;padding:.5rem 0 1rem;">
        <div style="font-size:2.5rem;margin-bottom:.75rem;">⛔</div>
        <h3 style="margin:0 0 .5rem;">Cannot Delete Arm</h3>
        <p style="color:#6b7280;margin:0 0 1.5rem;">
          <strong>${cls.name} ${arm}</strong> has <strong>${enrolled} enrolled student${enrolled!==1?'s':''}</strong>.
          Use "🔀 Move" to reassign students first.
        </p>
        <button onclick="closeModal()" style="${btnStyle('primary')}">OK</button>
      </div>`);
    return;
  }

  const teacherNote = teachers > 0
    ? `<div style="${infoNote('warning')}">⚠ ${teachers} teacher assignment${teachers!==1?'s':''} will be cleared.</div>`
    : '';

  showModal(`
    <div style="text-align:center;padding:.5rem 0 1rem;">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">🗑️</div>
      <h3 style="margin:0 0 .5rem;">Delete Arm?</h3>
      <p style="color:#6b7280;margin:0 0 .75rem;">
        Delete <strong>${cls.name} ${arm}</strong>? This cannot be undone.
      </p>
      ${teacherNote}
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:center;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="confirmDeleteArm(${classId},'${arm}')" style="${btnStyle('danger')}">Yes, Delete</button>
      </div>
    </div>`);
};

window.confirmDeleteArm = function (classId, arm) {
  const cls = App.data.classes.find(c => c.id === classId);
  if (!cls) return;

  Classes.deleteArm(cls.name, arm).then(() => {
    (App.data.teachers||[]).forEach(t => {
      if (t.assignedClass === cls.name && t.assignedArm === arm) { t.assignedArm = ''; }
    });
    cls.arms = cls.arms.filter(a => a !== arm);
    closeModal();
    refreshArmsGrid(cls);
    toast(`Arm ${cls.name} ${arm} removed.`, 'warning');
  }).catch(err => {
    toast('Error removing arm: ' + (err.message || 'Unknown error'), 'error');
  });
};


/* ── STYLE HELPERS (local) ────────────────────────────────────────────────── */

/** Subtle info/warning note box */
function infoNote(type) {
  const map = { info: '#eff6ff;border-left:3px solid #3b82f6;color:#1e40af',
                warning: '#fefce8;border-left:3px solid #f59e0b;color:#92400e' };
  return `background:${map[type]||map.info};border-radius:0 6px 6px 0;padding:.55rem .85rem;font-size:.82rem;margin:.5rem 0;`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. STUDENTS  (improved)
   Admin   → full CRUD + bulk import
   Teacher → view only
   Parent  → redirected to results

   Improvements:
   ✦ Rich fixture generator with 40 realistic Nigerian student names
   ✦ Stats dashboard (total, gender split, low attendance, class breakdown)
   ✦ Advanced filter bar: search + class + arm + gender + attendance filter
   ✦ Sortable table columns (click header)
   ✦ Avatar initials chip per student row
   ✦ View profile: tabbed (Info / Results / Attendance history)
   ✦ Smart ID generator (respects existing IDs, no collisions)
   ✦ Attendance quick-edit inline without opening modal
   ✦ Duplicate name warning on add
   ✦ Bulk add: Excel upload (SheetJS) + CSV textarea + template download
   ✦ Transfer student: move to different class/arm with one click
   ✦ Print student list button
   ✦ Cascade delete: removes linked results when student is deleted
   ✦ Confirm delete shows student name + linked data count
─────────────────────────────────────────────────────────────────────────────── */


/* ══════════════════════════════════════════════════════════════════════════════
   FIXTURES
══════════════════════════════════════════════════════════════════════════════ */

const STUDENT_FIXTURE_NAMES = {
  male: [
    'Emeka Okonkwo','Tunde Adeyemi','Chukwuemeka Eze','Biodun Adewale','Kelechi Obi',
    'Oluwaseun Afolabi','Aminu Bello','Suleiman Musa','Ifeanyi Nwosu','Gbenga Omotayo',
    'Chidubem Okeke','Yusuf Ibrahim','Babatunde Olawale','Nnamdi Chukwu','Segun Adebayo',
    'Chukwudi Nnadi','Kayode Oduola','Uche Onyekachi','Abdullahi Sani','Rotimi Adesanya',
  ],
  female: [
    'Adaeze Okonkwo','Funmilayo Adesanya','Ngozi Eze','Amara Obi','Bukola Adeyemi',
    'Chisom Nwosu','Fatima Al-Hassan','Blessing Omotayo','Ifeoma Okeke','Yetunde Bello',
    'Adunola Afolabi','Chiamaka Nnadi','Hafsat Ibrahim','Omowunmi Olawale','Chidinma Chukwu',
    'Oluwatoyin Adebayo','Nkechi Oduola','Zainab Musa','Ebele Onyekachi','Kehinde Rotimi',
  ],
};

const PARENT_NAMES = {
  male:   n => `Mr ${n.split(' ')[1]}`,
  female: n => `Mrs ${n.split(' ')[1]}`,
};

const PHONES = () => `080${Math.floor(10000000 + Math.random()*89999999)}`;

const NIGERIAN_DOBS = (minAge = 10, maxAge = 18) => {
  const year = new Date().getFullYear() - minAge - Math.floor(Math.random() * (maxAge - minAge));
  const month = String(Math.floor(Math.random()*12)+1).padStart(2,'0');
  const day   = String(Math.floor(Math.random()*28)+1).padStart(2,'0');
  return `${year}-${month}-${day}`;
};

/** Generate a collision-free student ID */
function genStudentId(prefix = 'SAHARCO') {
  const existing = new Set((App.data.students||[]).map(s => s.id));
  let n = (App.data.students||[]).length + 1;
  let id;
  do { id = `${prefix}/${String(n).padStart(3,'0')}`; n++; } while (existing.has(id));
  return id;
}

/**
 * seedStudentFixtures({ count, classFilter })
 * Generates realistic student records distributed across all classes/arms.
 * Skips if students already exist unless force=true.
 */
window.seedStudentFixtures = function ({ count = 40, force = false } = {}) {
  if (!App.data.students) App.data.students = [];
  if (App.data.students.length > 0 && !force) {
    toast(`${App.data.students.length} students already exist. Use force=true to re-seed.`, 'info');
    renderStudents(); return;
  }
  if (force) App.data.students = [];

  const classes = App.data.classes || [];
  if (!classes.length) { toast('No classes found. Add classes first.', 'warning'); return; }

  // Build a flat list of all class+arm slots and distribute evenly
  const slots = classes.flatMap(c => (c.arms||[]).map(a => ({ cls: c.name, arm: a })));
  if (!slots.length) { toast('No class arms found. Generate arm fixtures first.', 'warning'); return; }

  const maleNames   = [...STUDENT_FIXTURE_NAMES.male];
  const femaleNames = [...STUDENT_FIXTURE_NAMES.female];
  const shuffle     = arr => arr.sort(() => Math.random() - .5);
  shuffle(maleNames); shuffle(femaleNames);

  let mi = 0, fi = 0;
  for (let i = 0; i < count; i++) {
    const slot   = slots[i % slots.length];
    const gender = i % 2 === 0 ? 'Male' : 'Female';
    const name   = gender === 'Male'
      ? (maleNames[mi++ % maleNames.length])
      : (femaleNames[fi++ % femaleNames.length]);
    const parent = gender === 'Male' ? PARENT_NAMES.male(name) : PARENT_NAMES.female(name);
    App.data.students.push({
      id:         genStudentId(),
      name,
      class:      slot.cls,
      arm:        slot.arm,
      gender,
      dob:        NIGERIAN_DOBS(),
      parent,
      phone:      PHONES(),
      attendance: Math.floor(60 + Math.random() * 40), // 60–100%
    });
  }
  toast(`${count} student fixture${count!==1?'s':''} generated!`, 'success');
  renderStudents();
};

/** Thin fixture — just a handful of quick demo entries */
window.seedMinimalStudents = function () {
  window.seedStudentFixtures({ count: 12, force: false });
};


/* ══════════════════════════════════════════════════════════════════════════════
   SORT STATE
══════════════════════════════════════════════════════════════════════════════ */
let _sortCol = 'name', _sortDir = 1; // 1 = asc, -1 = desc

function sortStudents(list) {
  return [...list].sort((a, b) => {
    let va = a[_sortCol] ?? '', vb = b[_sortCol] ?? '';
    if (typeof va === 'number') return (va - vb) * _sortDir;
    return String(va).localeCompare(String(vb)) * _sortDir;
  });
}

window.setStudentSort = function (col) {
  if (_sortCol === col) _sortDir *= -1; else { _sortCol = col; _sortDir = 1; }
  renderStudents(_currentFilter, _currentFilters);
};

let _currentFilter  = '';
let _currentFilters = {};


/* ══════════════════════════════════════════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════════════════════════════════════════ */
function renderStudents(filter = '', filters = {}) {
  if (priv.isParent()) { navigate('results'); return; }

  _currentFilter  = filter;
  _currentFilters = filters;

  const section    = document.getElementById('students');
  const canManage  = priv.canManage();
  const all        = App.data.students || [];

  /* ── Apply filters ── */
  let list = all.filter(s => {
    const q = filter.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q) &&
             !s.class.toLowerCase().includes(q) && !(s.parent||'').toLowerCase().includes(q)) return false;
    if (filters.cls   && s.class  !== filters.cls)    return false;
    if (filters.arm   && s.arm    !== filters.arm)    return false;
    if (filters.gender&& s.gender !== filters.gender) return false;
    if (filters.attn === 'low'  && s.attendance >= 75) return false;
    if (filters.attn === 'good' && s.attendance <  75) return false;
    return true;
  });

  list = sortStudents(list);

  /* ── Stats ── */
  const male       = all.filter(s => s.gender === 'Male').length;
  const female     = all.filter(s => s.gender === 'Female').length;
  const lowAttn    = all.filter(s => s.attendance < 75).length;
  const avgAttn    = all.length ? (all.reduce((a,b) => a + b.attendance, 0) / all.length).toFixed(1) : 0;

  /* ── Dropdown options ── */
  const classOpts = ['', ...new Set(all.map(s => s.class))].map(c =>
    `<option value="${c}" ${filters.cls===c?'selected':''}>${c||'All Classes'}</option>`).join('');
  const armOpts   = ['', ...new Set(all.map(s => s.arm))].map(a =>
    `<option value="${a}" ${filters.arm===a?'selected':''}>${a||'All Arms'}</option>`).join('');

  /* ── Sort indicator ── */
  const si = col => _sortCol===col ? (_sortDir===1?' ↑':' ↓') : '';
  const th = (col, label) =>
    `<th style="${thStyle()};cursor:pointer;user-select:none;" onclick="setStudentSort('${col}')">${label}${si(col)}</th>`;

  section.innerHTML = `
    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1.5rem;">
      ${[
        ['🎒','Total Students', all.length,   '#2563eb'],
        ['👦','Male',           male,         '#0891b2'],
        ['👧','Female',         female,       '#7c3aed'],
        ['📉','Low Attendance', lowAttn,      lowAttn>0?'#ef4444':'#059669'],
        ['📊','Avg Attendance', avgAttn+'%',  '#d97706'],
      ].map(([icon,label,val,color]) => `
        <div style="background:#fff;border-radius:12px;padding:.9rem 1.1rem;
                    box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid ${color};cursor:default;">
          <div style="font-size:1.2rem;">${icon}</div>
          <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2;">${val}</div>
          <div style="font-size:.75rem;color:#6b7280;margin-top:.1rem;">${label}</div>
        </div>`).join('')}
    </div>

    <!-- Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;
                margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;">
      <h2 style="margin:0;">Students
        <span style="font-size:.9rem;font-weight:400;color:#9ca3af;">(${list.length} of ${all.length})</span>
      </h2>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        ${canManage ? `
          <button onclick="openStudentModal()" style="${btnStyle('primary')}">+ Add Student</button>
          <button onclick="openBulkStudentModal()" style="${btnStyle('info')}">⬆ Bulk Add</button>
          <button onclick="openParentEmailManager()" style="${btnStyle('secondary')}">📧 Parent Emails</button>
          <button onclick="openDuplicateDetector()" style="${btnStyle('warning')}">🔍 Find Duplicates</button>
          <button onclick="printStudentList()" style="${btnStyle('secondary')}">🖨 Print</button>
          <button onclick="seedStudentFixtures({count:40,force:false})" style="${btnStyle('secondary')}">🌱 Seed Fixtures</button>
        ` : ''}
      </div>
    </div>

    <!-- Filter bar -->
    <div style="background:#fff;border-radius:10px;padding:.85rem 1rem;
                box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1.25rem;
                display:flex;flex-wrap:wrap;gap:.65rem;align-items:center;">
      <input id="student-search" placeholder="🔍 Search name, ID, parent…"
        value="${filter}" style="${inputStyle()};max-width:220px;padding:.45rem .75rem;font-size:.875rem;"
        oninput="renderStudents(this.value, _currentFilters)">
      <select onchange="renderStudents(_currentFilter,{..._currentFilters,cls:this.value})"
        style="${inputStyle()};max-width:140px;padding:.45rem .65rem;font-size:.85rem;">${classOpts}</select>
      <select onchange="renderStudents(_currentFilter,{..._currentFilters,arm:this.value})"
        style="${inputStyle()};max-width:100px;padding:.45rem .65rem;font-size:.85rem;">${armOpts}</select>
      <select onchange="renderStudents(_currentFilter,{..._currentFilters,gender:this.value})"
        style="${inputStyle()};max-width:110px;padding:.45rem .65rem;font-size:.85rem;">
        <option value="">All Genders</option>
        <option value="Male" ${filters.gender==='Male'?'selected':''}>Male</option>
        <option value="Female" ${filters.gender==='Female'?'selected':''}>Female</option>
      </select>
      <select onchange="renderStudents(_currentFilter,{..._currentFilters,attn:this.value})"
        style="${inputStyle()};max-width:150px;padding:.45rem .65rem;font-size:.85rem;">
        <option value="">All Attendance</option>
        <option value="low"  ${filters.attn==='low'?'selected':''}>⚠ Below 75%</option>
        <option value="good" ${filters.attn==='good'?'selected':''}>✅ 75% &amp; above</option>
      </select>
      ${(filter || Object.values(filters).some(Boolean))
        ? `<button onclick="renderStudents('',{})" style="${btnStyle('secondary')};font-size:.8rem;padding:.35rem .75rem;">✕ Clear</button>` : ''}
    </div>

    ${!canManage ? `<div style="${infoBanner()}">👁 View-only mode — Teachers can view student records but cannot add, edit, or delete.</div>` : ''}

    <!-- Table -->
    ${list.length === 0 && all.length === 0
      ? `<div style="background:#fff;border-radius:12px;padding:4rem 2rem;text-align:center;
                     box-shadow:0 2px 8px rgba(0,0,0,.07);">
           <div style="font-size:3rem;margin-bottom:1rem;">🎒</div>
           <h3 style="margin:0 0 .5rem;color:#374151;">No students yet</h3>
           <p style="color:#9ca3af;margin:0 0 1.5rem;">Add students manually or seed fixture data to get started.</p>
           ${canManage ? `<div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
             <button onclick="openStudentModal()" style="${btnStyle('primary')}">+ Add Student</button>
             <button onclick="seedStudentFixtures({count:40})" style="${btnStyle('secondary')}">🌱 Seed 40 Fixtures</button>
           </div>` : ''}
         </div>`
      : `<div style="overflow-x:auto;">
         <table style="${tableStyle()}">
           <thead><tr style="${thRowStyle()}">
             ${th('id','ID')}
             ${th('name','Student')}
             ${th('class','Class')}
             ${th('arm','Arm')}
             ${th('gender','Gender')}
             ${th('attendance','Attendance')}
             <th style="${thStyle()}">Actions</th>
           </tr></thead>
           <tbody>
             ${list.length ? list.map(s => studentRow(s, canManage)).join('')
               : `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#9ca3af;">
                    No students match your filters.
                    <button onclick="renderStudents('',{})" style="margin-left:.5rem;${btnStyle('secondary')};font-size:.8rem;">Clear filters</button>
                  </td></tr>`}
           </tbody>
         </table></div>`
    }`;
}

/* ── Single table row ── */
function studentRow(s, canManage) {
  const initials = s.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const avatarColor = stringToColor(s.name);
  const attnColor = s.attendance < 75 ? '#ef4444' : s.attendance < 90 ? '#f59e0b' : '#22c55e';

  return `<tr id="student-row-${s.id}" style="${trStyle()}" data-sid="${s.id}">
    <td style="${tdStyle()};font-family:monospace;font-size:.8rem;color:#6b7280;">${s.id}</td>
    <td style="${tdStyle()}">
      <div style="display:flex;align-items:center;gap:.65rem;">
        <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor};
                    display:flex;align-items:center;justify-content:center;
                    font-size:.7rem;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
        <div>
          <div style="font-weight:600;color:#1e3a5f;">${s.name}</div>
          <div style="font-size:.75rem;color:#9ca3af;">${s.parent||''}</div>
        </div>
      </div>
    </td>
    <td style="${tdStyle()}">${s.class}</td>
    <td style="${tdStyle()}"><span style="${badgeStyle('secondary')}">${s.arm}</span></td>
    <td style="${tdStyle()}">
      <span style="${badgeStyle(s.gender==='Female'?'info':'secondary')}">${s.gender}</span>
    </td>
    <td style="${tdStyle()};min-width:120px;">
      <div style="display:flex;align-items:center;gap:.5rem;">
        <div style="flex:1;background:#e5e7eb;border-radius:4px;height:7px;min-width:60px;">
          <div style="width:${s.attendance}%;height:100%;border-radius:4px;background:${attnColor};transition:width .3s;"></div>
        </div>
        <span style="font-size:.8rem;font-weight:700;color:${attnColor};min-width:36px;">${s.attendance}%</span>
      </div>
    </td>
    <td style="${tdStyle()}">
      <button onclick="viewStudent('${s.id}')" style="${btnStyle('info','sm')}">👁 View</button>
      <button onclick="window.open('student-finance.html?studentId=${encodeURIComponent(s.id)}','_blank')" style="${btnStyle('secondary','sm')}" title="Student Finance Portal">💰</button>
      ${canManage ? `
        <button onclick="editStudent('${s.id}')" style="${btnStyle('secondary','sm')}">✏ Edit</button>
        <button onclick="transferStudent('${s.id}')" style="${btnStyle('secondary','sm')}">🔀</button>
        <button onclick="deleteStudent('${s.id}')" style="${btnStyle('danger','sm')}">🗑</button>
      ` : ''}
    </td>
  </tr>`;
}

/** Deterministic pastel color from a string */
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea','#16a34a'];
  return colors[Math.abs(hash) % colors.length];
}


/* ══════════════════════════════════════════════════════════════════════════════
   VIEW STUDENT (tabbed profile)
══════════════════════════════════════════════════════════════════════════════ */
window.viewStudent = function (id) {
  const s       = App.data.students.find(st => st.id === id);
  const results = App.data.results.filter(r => r.studentId === id);
  const terms   = [...new Set(results.map(r => r.term))];

  const infoTab = () => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      ${[
        ['Student ID', s.id],
        ['Full Name',  s.name],
        ['Class',      `${s.class} ${s.arm}`],
        ['Gender',     s.gender],
        ['Date of Birth', s.dob || '—'],
        ['Age',        s.dob ? calcAge(s.dob)+' years' : '—'],
        ['Parent/Guardian', s.parent || '—'],
        ['Phone',      s.phone || '—'],
        ['Attendance', s.attendance + '%'],
      ].map(([k,v]) => `
        <div style="background:#f9fafb;border-radius:8px;padding:.65rem .9rem;">
          <div style="font-size:.75rem;color:#9ca3af;margin-bottom:.15rem;">${k}</div>
          <div style="font-weight:600;color:#1e3a5f;">${v}</div>
        </div>`).join('')}
    </div>`;

  const resultsTab = () => results.length === 0
    ? `<div style="text-align:center;padding:2.5rem;color:#9ca3af;">
         <div style="font-size:2rem;margin-bottom:.5rem;">📋</div>
         <p style="margin:0;">No results recorded yet.</p>
       </div>`
    : terms.map(term => {
        const tr   = results.filter(r => r.term === term);
        const avg  = (tr.reduce((a,b)=>a+b.total,0)/tr.length).toFixed(1);
        return `
          <div style="margin-bottom:1.25rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.65rem;flex-wrap:wrap;gap:.5rem;">
              <strong style="color:#1e3a5f;">${term}</strong>
              <span style="${badgeStyle(parseFloat(avg)>=50?'success':'danger')}">Avg: ${avg}%</span>
            </div>
            <div style="overflow-x:auto;">
            <table style="${tableStyle()}font-size:.82rem;">
              <thead><tr style="${thRowStyle()}">
                <th style="${thStyle()}">Subject</th><th style="${thStyle()}">CA</th>
                <th style="${thStyle()}">Exam</th><th style="${thStyle()}">Total</th><th style="${thStyle()}">Grade</th>
              </tr></thead>
              <tbody>${tr.map(r=>`<tr style="${trStyle()}">
                <td style="${tdStyle()}">${r.subject}</td><td style="${tdStyle()}">${r.ca}</td>
                <td style="${tdStyle()}">${r.exam}</td><td style="${tdStyle()}"><strong>${r.total}</strong></td>
                <td style="${tdStyle()}"><span style="${badgeStyle(r.total>=50?'success':'danger')}">${grade(r.total).letter}</span></td>
              </tr>`).join('')}</tbody>
            </table></div>
          </div>`;
      }).join('');

  showModal(`
    <!-- Avatar header -->
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #f3f4f6;">
      <div style="width:52px;height:52px;border-radius:50%;background:${stringToColor(s.name)};
                  display:flex;align-items:center;justify-content:center;font-size:1.1rem;
                  font-weight:700;color:#fff;flex-shrink:0;">
        ${s.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
      </div>
      <div>
        <h3 style="margin:0;">${s.name}</h3>
        <p style="margin:.2rem 0 0;font-size:.85rem;color:#6b7280;">${s.id} &nbsp;·&nbsp; ${s.class} ${s.arm}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:.35rem;margin-bottom:1.25rem;">
      <button id="ptab-info"    onclick="switchProfileTab('info')"    style="${btnStyle('primary','sm')}">📋 Info</button>
      <button id="ptab-results" onclick="switchProfileTab('results')" style="${btnStyle('secondary','sm')}">📊 Results (${results.length})</button>
    </div>

    <div id="profile-info-panel">${infoTab()}</div>
    <div id="profile-results-panel" style="display:none;">${resultsTab()}</div>

    <div style="display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem;">
      <button onclick="window.open('student-finance.html?studentId=${encodeURIComponent(s.id)}','_blank')" style="${btnStyle('warning')}">💰 Finance Portal</button>
      ${priv.canManage() ? `<button onclick="closeModal();editStudent('${s.id}')" style="${btnStyle('secondary')}">✏ Edit</button>` : ''}
      <button onclick="closeModal()" style="${btnStyle('primary')}">Close</button>
    </div>`);
};

window.switchProfileTab = function (tab) {
  const panels = { info: 'profile-info-panel', results: 'profile-results-panel' };
  const btns   = { info: 'ptab-info', results: 'ptab-results' };
  Object.keys(panels).forEach(k => {
    document.getElementById(panels[k]).style.display = k === tab ? '' : 'none';
    document.getElementById(btns[k]).style.cssText   = btnStyle(k===tab?'primary':'secondary','sm');
  });
};

function calcAge(dob) {
  const d = new Date(dob), n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth()===d.getMonth() && n.getDate()<d.getDate())) age--;
  return age;
}


/* ══════════════════════════════════════════════════════════════════════════════
   ADD / EDIT STUDENT
══════════════════════════════════════════════════════════════════════════════ */
function openStudentModal(s = null) {
  if (!priv.canManage()) { denyAccess(); return; }
  const isEdit      = !!s;
  const classOpts   = App.data.classes.map(c =>
    `<option ${s?.class===c.name?'selected':''}>${c.name}</option>`).join('');
  const currentArms = (s ? App.data.classes.find(c=>c.name===s.class)?.arms
                         : App.data.classes[0]?.arms) || [];

  showModal(`
    <h3 style="margin:0 0 1.5rem;">${isEdit ? `✏ Edit — ${s.name}` : '➕ Add New Student'}</h3>
    <form id="student-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

        <div style="grid-column:1/-1;">
          <label style="${labelStyle()}">Full Name <span style="color:#ef4444;">*</span></label>
          <input id="st-name" value="${s?.name||''}" placeholder="First Last"
            style="${inputStyle()}" required autocomplete="off">
          <div id="st-name-warn" style="color:#d97706;font-size:.8rem;margin-top:.2rem;display:none;"></div>
        </div>

        <div>
          <label style="${labelStyle()}">Class <span style="color:#ef4444;">*</span></label>
          <select id="st-class" style="${inputStyle()}" onchange="updateStudentModalArms()">${classOpts}</select>
        </div>
        <div>
          <label style="${labelStyle()}">Arm <span style="color:#ef4444;">*</span></label>
          <select id="st-arm" style="${inputStyle()}">
            ${currentArms.map(a=>`<option ${s?.arm===a?'selected':''}>${a}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="${labelStyle()}">Gender</label>
          <select id="st-gender" style="${inputStyle()}">
            <option ${s?.gender==='Male'?'selected':''}>Male</option>
            <option ${s?.gender==='Female'?'selected':''}>Female</option>
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Date of Birth</label>
          <input type="date" id="st-dob" value="${s?.dob||''}" style="${inputStyle()}">
        </div>

        <div>
          <label style="${labelStyle()}">Parent / Guardian</label>
          <input id="st-parent" value="${s?.parent||''}" placeholder="Name" style="${inputStyle()}">
        </div>
        <div>
          <label style="${labelStyle()}">Phone</label>
          <input id="st-phone" value="${s?.phone||''}" placeholder="080xxxxxxxx" style="${inputStyle()}">
        </div>

        <div style="grid-column:1/-1;">
          <label style="${labelStyle()}">
            Parent / Guardian Email
            <span style="font-size:.73rem;color:#6b7280;font-weight:400;"> — used for report card delivery &amp; notifications</span>
          </label>
          <input type="email" id="st-parent-email" value="${s?.parent_email||''}"
            placeholder="parent@example.com" style="${inputStyle()}">
          ${s?.parent_email ? '<div style="font-size:.73rem;color:#16a34a;margin-top:.2rem;">✓ Email on file</div>' : '<div style="font-size:.73rem;color:#f59e0b;margin-top:.2rem;">⚠ No email — add one to enable notifications</div>'}
        </div>

        ${isEdit ? `
        <div>
          <label style="${labelStyle()}">Attendance (%)</label>
          <input type="number" id="st-attendance" min="0" max="100"
            value="${s?.attendance??100}" style="${inputStyle()}">
        </div>` : ''}

        <div style="grid-column:1/-1;display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem;">
          <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
          <button type="submit" style="${btnStyle('primary')}">${isEdit?'💾 Save Changes':'✅ Add Student'}</button>
        </div>
      </div>
    </form>`);

  /* Duplicate name check on blur */
  document.getElementById('st-name').addEventListener('blur', function() {
    const val     = this.value.trim().toLowerCase();
    const warnEl  = document.getElementById('st-name-warn');
    const dupes   = (App.data.students||[]).filter(st =>
      st.name.toLowerCase() === val && st.id !== s?.id);
    if (dupes.length) {
      warnEl.textContent = `⚠ A student named "${dupes[0].name}" already exists (${dupes[0].id}).`;
      warnEl.style.display = '';
    } else { warnEl.style.display = 'none'; }
  });

  document.getElementById('student-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('st-name').value.trim();
    if (!name) return toast('Full name is required.', 'error');

    const data = {
      name,
      class:      document.getElementById('st-class').value,
      arm:        document.getElementById('st-arm').value,
      gender:     document.getElementById('st-gender').value,
      dob:        document.getElementById('st-dob').value    || null,
      parent:     document.getElementById('st-parent').value.trim()  || null,
      phone:        document.getElementById('st-phone').value.trim()        || null,
      parent_email: document.getElementById('st-parent-email')?.value.trim() || null,
    };

    if (!data.class) return toast('Class is required.', 'error');
    if (!data.arm)   return toast('Arm is required.', 'error');

    try {
      if (isEdit) {
        data.attendance = parseInt(document.getElementById('st-attendance').value) || s.attendance;
        await Students.update(s.id, data);
        Object.assign(s, data);
        toast('Student updated!', 'success');
      } else {
        data.attendance = 100;
        const resp = await Students.create(data);
        const saved = resp.data || resp;
        saved.class = saved.class || data.class;
        saved.arm   = saved.arm   || data.arm;
        App.data.students.push(saved);
        toast(`Student added! ID: ${saved.id}`, 'success');
      }
      closeModal();
      renderStudents(_currentFilter, _currentFilters);
      if (isEdit) {
        const row = document.getElementById(`student-row-${s.id}`);
        if (row) { row.style.background='#d1fae5'; setTimeout(()=>row.style.background='',1400); }
      }
    } catch (err) {
      toast('Error saving student: ' + (err.message || 'Unknown error'), 'error');
    }
  };
}

window.updateStudentModalArms = function () {
  const cls     = document.getElementById('st-class')?.value;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel  = document.getElementById('st-arm');
  if (armSel && classData) armSel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
};

window.editStudent = function (id) {
  if (!priv.canManage()) { denyAccess('Only Admins can edit students.'); return; }
  openStudentModal(App.data.students.find(st => st.id === id));
};


/* ══════════════════════════════════════════════════════════════════════════════
   TRANSFER STUDENT
══════════════════════════════════════════════════════════════════════════════ */
window.transferStudent = function (id) {
  if (!priv.canManage()) { denyAccess(); return; }
  const s        = App.data.students.find(st => st.id === id);
  const classOpts = App.data.classes.map(c =>
    `<option ${s.class===c.name?'selected':''}>${c.name}</option>`).join('');
  const currentArms = App.data.classes.find(c=>c.name===s.class)?.arms || [];

  showModal(`
    <h3 style="margin:0 0 .25rem;">Transfer Student</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">
      Moving <strong>${s.name}</strong> from <strong>${s.class} ${s.arm}</strong>
    </p>
    <label style="${labelStyle()}">New Class</label>
    <select id="transfer-class" style="${inputStyle()}" onchange="updateTransferArms()">${classOpts}</select>
    <label style="${labelStyle()}">New Arm</label>
    <select id="transfer-arm" style="${inputStyle()}">
      ${currentArms.map(a=>`<option ${s.arm===a?'selected':''}>${a}</option>`).join('')}
    </select>
    <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="confirmTransfer('${id}')" style="${btnStyle('primary')}">🔀 Transfer</button>
    </div>`);
};

window.updateTransferArms = function () {
  const cls     = document.getElementById('transfer-class')?.value;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel  = document.getElementById('transfer-arm');
  if (armSel && classData) armSel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
};

window.confirmTransfer = function (id) {
  const s      = App.data.students.find(st => st.id === id);
  const newCls = document.getElementById('transfer-class').value;
  const newArm = document.getElementById('transfer-arm').value;
  if (newCls === s.class && newArm === s.arm) { closeModal(); return; }
  const oldLabel = `${s.class} ${s.arm}`;
  s.class = newCls; s.arm = newArm;
  closeModal();
  renderStudents(_currentFilter, _currentFilters);
  toast(`${s.name} transferred from ${oldLabel} → ${newCls} ${newArm}.`, 'success');
};


/* ══════════════════════════════════════════════════════════════════════════════
   DELETE STUDENT
══════════════════════════════════════════════════════════════════════════════ */
window.deleteStudent = function (id) {
  if (!priv.canManage()) { denyAccess('Only Admins can delete students.'); return; }
  const s        = App.data.students.find(st => st.id === id);
  const resCount = (App.data.results||[]).filter(r => r.studentId === id).length;

  showModal(`
    <div style="text-align:center;padding:.5rem 0 1rem;">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">🗑️</div>
      <h3 style="margin:0 0 .5rem;">Delete Student?</h3>
      <p style="color:#6b7280;margin:0;">
        Delete <strong>${s.name}</strong> (${s.id})?
      </p>
      ${resCount > 0 ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;
                    padding:.6rem .9rem;margin:.85rem 0 0;font-size:.85rem;color:#991b1b;">
          ⚠ This will also delete <strong>${resCount} result record${resCount!==1?'s':''}</strong>.
        </div>` : ''}
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:center;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="confirmDeleteStudent('${id}')" style="${btnStyle('danger')}">Yes, Delete</button>
      </div>
    </div>`);
};

window.confirmDeleteStudent = function (id) {
  const s = App.data.students.find(st => st.id === id);
  App.data.students = App.data.students.filter(st => st.id !== id);
  if (App.data.results) App.data.results = App.data.results.filter(r => r.studentId !== id);
  closeModal();
  renderStudents(_currentFilter, _currentFilters);
  toast(`${s?.name||'Student'} deleted.`, 'warning');
};


/* ══════════════════════════════════════════════════════════════════════════════
   BULK ADD (CSV textarea + Excel upload)
══════════════════════════════════════════════════════════════════════════════ */
window.openBulkStudentModal = function () {
  if (!priv.canManage()) { denyAccess(); return; }
  const classOpts = App.data.classes.map(c => `<option>${c.name}</option>`).join('');

  showModal(`
    <h3 style="margin:0 0 .25rem;">Bulk Add Students</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.25rem;">
      Choose an import method below.
    </p>

    <!-- Method tabs -->
    <div style="display:flex;gap:.35rem;margin-bottom:1.25rem;">
      <button id="btab-csv"   onclick="switchBulkTab('csv')"   style="${btnStyle('primary','sm')}">📋 CSV Text</button>
      <button id="btab-excel" onclick="switchBulkTab('excel')" style="${btnStyle('secondary','sm')}">📊 Excel File</button>
    </div>

    <!-- Class + Arm selectors (shared) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
      <div><label style="${labelStyle()}">Class</label>
        <select id="bulk-class" style="${inputStyle()}" onchange="updateBulkArms()">${classOpts}</select>
      </div>
      <div><label style="${labelStyle()}">Arm</label>
        <select id="bulk-arm" style="${inputStyle()}">
          ${App.data.classes[0]?.arms.map(a=>`<option>${a}</option>`).join('')||''}
        </select>
      </div>
    </div>

    <!-- CSV tab -->
    <div id="bulk-tab-csv">
      <p style="font-size:.82rem;color:#6b7280;margin:0 0 .6rem;">
        Format: <code style="background:#f3f4f6;padding:.15rem .4rem;border-radius:4px;">
        Full Name, Gender, DOB (YYYY-MM-DD), Parent Name, Phone</code>
      </p>
      <textarea id="bulk-students-text" rows="9"
        style="${inputStyle()};resize:vertical;font-family:monospace;font-size:.83rem;"
        placeholder="Adaeze Okonkwo, Female, 2009-03-14, Mrs Okonkwo, 08012345678&#10;Emeka Eze, Male, 2010-07-22, Mr Eze, 08099887766"></textarea>
      <div id="bulk-csv-preview" style="margin-top:.65rem;"></div>
      <div style="display:flex;gap:.65rem;margin-top:1rem;justify-content:flex-end;flex-wrap:wrap;">
        <button onclick="previewBulkStudents()" style="${btnStyle('secondary')}">👁 Preview</button>
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="saveBulkStudents()" style="${btnStyle('primary')}">✅ Import</button>
      </div>
    </div>

    <!-- Excel tab -->
    <div id="bulk-tab-excel" style="display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  flex-wrap:wrap;gap:.75rem;margin-bottom:1rem;">
        <p style="margin:0;font-size:.85rem;color:#6b7280;">Upload a .xlsx file with columns:<br>
          <code style="background:#f3f4f6;padding:.15rem .4rem;border-radius:4px;font-size:.8rem;">
          Name | Gender | DOB | Parent | Phone</code>
        </p>
        <button onclick="downloadStudentTemplate()" style="${btnStyle('secondary')};font-size:.82rem;">⬇ Template</button>
      </div>
      <div id="student-excel-drop"
        ondragover="event.preventDefault();this.style.borderColor='#2563eb';"
        ondragleave="this.style.borderColor='#d1d5db';"
        ondrop="handleStudentExcelDrop(event)"
        onclick="document.getElementById('student-excel-input').click()"
        style="border:2px dashed #d1d5db;border-radius:10px;padding:2rem;text-align:center;
               background:#f9fafb;cursor:pointer;transition:border-color .2s;">
        <div style="font-size:2rem;margin-bottom:.4rem;">📊</div>
        <p style="margin:0;font-weight:600;color:#374151;font-size:.9rem;">Click or drag &amp; drop Excel file</p>
        <p style="margin:.2rem 0 0;font-size:.78rem;color:#9ca3af;">.xlsx / .xls only</p>
      </div>
      <input type="file" id="student-excel-input" accept=".xlsx,.xls"
        style="display:none" onchange="handleStudentExcelSelect(this)">
      <div id="student-excel-info" style="margin-top:.65rem;"></div>
      <div id="student-excel-preview" style="margin-top:.65rem;"></div>
      <div style="display:flex;gap:.65rem;margin-top:1rem;justify-content:flex-end;flex-wrap:wrap;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button id="btn-import-students" onclick="saveExcelStudents()"
          style="${btnStyle('primary')}" disabled>✅ Import</button>
      </div>
    </div>`);

  /* initialise arm dropdown */
  updateBulkArms();
};

window.switchBulkTab = function (tab) {
  document.getElementById('bulk-tab-csv').style.display   = tab==='csv'   ? '' : 'none';
  document.getElementById('bulk-tab-excel').style.display = tab==='excel' ? '' : 'none';
  document.getElementById('btab-csv').style.cssText   = btnStyle(tab==='csv'?'primary':'secondary','sm');
  document.getElementById('btab-excel').style.cssText = btnStyle(tab==='excel'?'primary':'secondary','sm');
};

window.updateBulkArms = function () {
  const cls = document.getElementById('bulk-class')?.value;
  const classData = App.data.classes.find(c => c.name === cls);
  const armSel = document.getElementById('bulk-arm');
  if (armSel && classData) armSel.innerHTML = classData.arms.map(a=>`<option>${a}</option>`).join('');
};

window.previewBulkStudents = function () {
  const lines   = document.getElementById('bulk-students-text').value.trim().split('\n').filter(Boolean);
  const preview = document.getElementById('bulk-csv-preview');
  const parsed  = lines.map((line, i) => {
    const p = line.split(',').map(x=>x.trim());
    return { ok: !!p[0], num: i+1, name: p[0]||'', gender: p[1]||'Male', dob: p[2]||'' };
  });
  const valid = parsed.filter(p=>p.ok).length;
  preview.innerHTML = `
    <div style="background:#f9fafb;border-radius:8px;padding:.85rem 1rem;max-height:180px;overflow-y:auto;">
      <p style="margin:0 0 .4rem;font-size:.82rem;font-weight:600;">${parsed.length} row(s) — ${valid} valid, ${parsed.length-valid} invalid:</p>
      ${parsed.map(p=>`<div style="font-size:.8rem;color:${p.ok?'#374151':'#ef4444'};">
        ${p.ok?'✔':'✘'} ${p.num}. ${p.name||'(empty)'} &nbsp;·&nbsp; ${p.gender}
      </div>`).join('')}
    </div>`;
};

window.saveBulkStudents = async function () {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls  = document.getElementById('bulk-class')?.value?.trim();
  const arm  = document.getElementById('bulk-arm')?.value?.trim();
  const text = document.getElementById('bulk-students-text')?.value?.trim();

  if (!cls)  { toast('Select a class first.', 'error'); return; }
  if (!arm)  { toast('Select an arm first.', 'error'); return; }
  if (!text) { toast('Enter student names first.', 'error'); return; }

  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) { toast('No student data entered.', 'error'); return; }

  const students = [];
  lines.forEach(line => {
    const p = line.split(',').map(x => x.trim());
    if (!p[0]) return;
    students.push({
      name:   p[0],
      gender: (['Male','Female'].includes(p[1]) ? p[1] : 'Male'),
      dob:    p[2] || null,
      parent: p[3] || '',
      phone:  p[4] || '',
    });
  });

  if (!students.length) { toast('No valid rows found.', 'error'); return; }

  const btn = document.querySelector('[onclick="saveBulkStudents()"]');
  const origText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }

  try {
    const payload = { class: cls, arm, students };
    console.log('[bulk] sending:', payload);
    const resp = await Students.bulkCreate(payload);
    console.log('[bulk] response:', resp);

    const imported = resp.imported ?? resp.data?.length ?? students.length;
    const skipped  = resp.skipped ?? 0;

    // Refresh from server
    const fresh = await Students.getAll({ limit: 2000 });
    if (fresh.data?.length) App.data.students = fresh.data;

    closeModal();
    renderStudents(_currentFilter, _currentFilters);
    toast(`✅ ${imported} student${imported !== 1 ? 's' : ''} imported!${skipped ? ` (${skipped} skipped)` : ''}`, 'success');
  } catch (e) {
    console.error('[bulk] error:', e);
    toast('Import failed: ' + (e.message || 'Unknown error — check console'), 'error');
    if (btn) { btn.disabled = false; btn.textContent = origText || '✅ Import'; }
  }
};


/* ── Excel student import ── */
window.handleStudentExcelDrop = function (e) {
  e.preventDefault();
  document.getElementById('student-excel-drop').style.borderColor='#d1d5db';
  if (e.dataTransfer.files[0]) processStudentExcel(e.dataTransfer.files[0]);
};
window.handleStudentExcelSelect = function (input) {
  if (input.files[0]) processStudentExcel(input.files[0]);
};

function processStudentExcel(file) {
  const info = document.getElementById('student-excel-info');
  if (typeof XLSX === 'undefined') {
    info.innerHTML = `<p style="color:#ef4444;font-size:.85rem;">⚠ SheetJS (XLSX) library not loaded.</p>`; return;
  }
  info.innerHTML = `<p style="color:#6b7280;font-size:.83rem;">⏳ Reading ${file.name}…</p>`;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb    = XLSX.read(e.target.result, { type:'array' });
      const ws    = wb.Sheets[wb.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(ws, { defval:'' });

      const get = (row, ...keys) => {
        for (const k of keys) {
          const match = Object.keys(row).find(rk=>rk.toLowerCase().includes(k.toLowerCase()));
          if (match) return String(row[match]).trim();
        } return '';
      };

      const parsed = rows.map((row,i) => {
        const name = get(row,'name','full');
        return { ok: !!name, num:i+2, name, gender: get(row,'gender')||'Male',
                 dob: get(row,'dob','birth','date'), parent: get(row,'parent','guardian'),
                 phone: get(row,'phone','tel') };
      });
      window._parsedStudentExcel = parsed;

      const valid = parsed.filter(p=>p.ok).length;
      info.innerHTML = `<p style="font-size:.83rem;color:#374151;">✅ ${file.name} — ${parsed.length} row(s) found.</p>`;
      document.getElementById('btn-import-students').disabled = valid === 0;

      document.getElementById('student-excel-preview').innerHTML = `
        <div style="background:#f9fafb;border-radius:8px;padding:.85rem;max-height:200px;overflow-y:auto;">
          <p style="margin:0 0 .4rem;font-size:.82rem;font-weight:600;">${valid} valid · ${parsed.length-valid} invalid</p>
          ${parsed.map(p=>`<div style="font-size:.8rem;color:${p.ok?'#374151':'#ef4444'};">
            ${p.ok?'✔':'✘'} ${p.num}. ${p.name||'(empty)'} &nbsp;·&nbsp; ${p.gender}
          </div>`).join('')}
        </div>`;
    } catch(err) {
      info.innerHTML = `<p style="color:#ef4444;font-size:.83rem;">⚠ ${err.message}</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

window.saveExcelStudents = async function () {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls  = document.getElementById('bulk-class')?.value;
  const arm  = document.getElementById('bulk-arm')?.value;
  const rows = (window._parsedStudentExcel || []).filter(p => p.ok);

  if (!cls || !arm) { toast('Select a class and arm first.', 'error'); return; }
  if (!rows.length) { toast('No valid rows to import.', 'warning'); return; }

  const students = rows.map(p => ({
    name:   p.name,
    gender: p.gender || 'Male',
    dob:    p.dob    || '',
    parent: p.parent || '',
    phone:  p.phone  || '',
  }));

  const btn = document.getElementById('btn-import-students');
  if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }

  try {
    const resp = await Students.bulkCreate({ class: cls, arm, students });
    const imported = resp.imported || resp.data?.length || students.length;
    const skipped  = resp.skipped || 0;

    // Refresh local student list from server
    const fresh = await Students.getAll({ limit: 2000 });
    App.data.students = fresh.data || App.data.students;

    window._parsedStudentExcel = null;
    closeModal();
    renderStudents(_currentFilter, _currentFilters);
    toast(`✅ ${imported} student${imported !== 1 ? 's' : ''} imported!${skipped ? ` (${skipped} skipped)` : ''}`, 'success');
  } catch (e) {
    toast('Import failed: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Import Students'; }
  }
};

/** Download a minimal Excel template for bulk student import */
window.downloadStudentTemplate = function () {
  if (typeof XLSX === 'undefined') {
    toast('SheetJS not loaded.', 'error'); return;
  }
  const wb  = XLSX.utils.book_new();
  const ws  = XLSX.utils.aoa_to_sheet([
    ['Name *','Gender','DOB (YYYY-MM-DD)','Parent / Guardian','Phone'],
    ['Adaeze Okonkwo','Female','2009-03-14','Mrs Okonkwo','08012345678'],
    ['Emeka Eze','Male','2010-07-22','Mr Eze','08099887766'],
  ]);
  ws['!cols'] = [{wch:24},{wch:10},{wch:18},{wch:22},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'students_template.xlsx');
  toast('Template downloaded!', 'success');
};


/* ══════════════════════════════════════════════════════════════════════════════
   PRINT
══════════════════════════════════════════════════════════════════════════════ */
window.printStudentList = function () {
  const students = App.data.students || [];
  const rows     = students.map((s,i) => `
    <tr>
      <td>${i+1}</td><td>${s.id}</td><td>${s.name}</td>
      <td>${s.class} ${s.arm}</td><td>${s.gender}</td><td>${s.attendance}%</td>
    </tr>`).join('');

  const win = window.open('','_blank');
  win.document.write(`
    <html><head><title>Student List</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;}
      h2{margin-bottom:4px;} p{color:#666;margin:0 0 16px;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;}
      th{background:#f3f4f6;font-weight:600;}
      tr:nth-child(even){background:#fafafa;}
      @media print{button{display:none;}}
    </style></head><body>
    <h2>Student List — ${App.data.schoolInfo?.name||'School'}</h2>
    <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${students.length}</p>
    <button onclick="window.print()" style="margin-bottom:12px;padding:6px 14px;cursor:pointer;">🖨 Print</button>
    <table>
      <thead><tr><th>#</th><th>ID</th><th>Name</th><th>Class</th><th>Gender</th><th>Attendance</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </body></html>`);
  win.document.close();
};

/* ─────────────────────────────────────────
   10. TEACHERS / STAFF  (Admin only)
───────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   STAFF MANAGEMENT MODULE
   Handles: Teachers, Admin, Support, Leadership staff
   Features: CRUD, Credential Uploads, Positions, Departments, Filters, Export
   ───────────────────────────────────────────────────────────────────────────── */

// ── Constants ──────────────────────────────────────────────────────────────────
const STAFF_POSITIONS = {
  Academic:       ['Class Teacher','Subject Teacher','Form Master/Mistress','Head of Department','Assistant HOD','Remedial Teacher','Laboratory Technician'],
  Administrative: ['Principal Secretary','School Registrar','Admissions Officer','Examination Officer','Account Officer','Bursar','Records Officer','Data Entry Clerk'],
  Support:        ['Librarian','Library Assistant','ICT Technician','Lab Assistant','Nurse/Health Officer','Counsellor','Driver','Security Officer','Cleaner','Gardener','Canteen Attendant'],
  Leadership:     ['Principal','Vice Principal (Academics)','Vice Principal (Administration)','Dean of Students','Head of Junior School','Head of Senior School','Chaplain/Welfare Officer']
};

const STAFF_CATEGORIES = ['All', 'Academic', 'Administrative', 'Support', 'Leadership'];

const STAFF_DEPARTMENTS = [
  'Mathematics','English Language','Sciences','Social Sciences','Humanities',
  'Languages','Business Studies','Technical','Arts','Physical Education',
  'ICT / Computer Studies','Religious Studies','Home Economics',
  'Administration','Bursary / Finance','Library','Health / Medical',
  'Security','Maintenance','Catering'
];

// STAFF_SUBJECTS and STAFF_CLASSES are computed dynamically from App.data
// so they always reflect whatever subjects/classes the admin has set up.
// Fallback to common defaults only if App.data hasn't loaded yet.
const DEFAULT_SUBJECTS = [
  'Mathematics','English Language','Biology','Chemistry','Physics',
  'Economics','Government','Literature','Accounting','Geography',
  'CRS / MRS','Social Studies','Basic Technology','Agricultural Sci.',
  'Computer Studies','French','Civic Education','Fine Arts','Music',
  'Physical Education','Home Economics','Further Mathematics','Data Processing'
];

function getStaffSubjects() {
  const fromDB = (App?.data?.subjects || []).map(s => s.name || s).filter(Boolean);
  return fromDB.length ? fromDB : DEFAULT_SUBJECTS;
}

function getStaffClasses() {
  const fromDB = (App?.data?.classes || []).map(c => c.name || c).filter(Boolean);
  return fromDB.length ? fromDB : ['JSS 1','JSS 2','JSS 3','SS 1','SS 2','SS 3'];
}

// Keep backward-compatible array references (used in staff.js via STAFF_SUBJECTS / STAFF_CLASSES)
// These are computed at call time so always fresh
Object.defineProperty(window, 'STAFF_SUBJECTS', { get: getStaffSubjects, configurable: true });
Object.defineProperty(window, 'STAFF_CLASSES',  { get: getStaffClasses,  configurable: true });

const STAFF_STATUS_COLORS = {
  Active: 'success',
  'On Leave': 'warning',
  Suspended: 'danger',
  Resigned: 'gray'
};

// ── Module State ───────────────────────────────────────────────────────────────
let _activeStaffCategory = 'All';
let _currentEditStaffId = null;
let _pendingStaffFiles = [];

// ── Inject CSS ─────────────────────────────────────────────────────────────────
(function injectStaffStyles() {
  if (document.getElementById('staff-module-styles')) return;
  const style = document.createElement('style');
  style.id = 'staff-module-styles';
  style.textContent = `
    .sm-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:.75rem; margin-bottom:1.5rem; }
    .sm-stat { background:var(--surface,#181c27); border:1px solid var(--border,#2a2f42); border-radius:10px; padding:.9rem 1rem; }
    .sm-stat-num { font-size:1.6rem; font-weight:700; font-family:monospace; line-height:1; }
    .sm-stat-label { font-size:.72rem; color:var(--text2,#8892a4); text-transform:uppercase; letter-spacing:.05em; margin-top:.3rem; }
    .sm-tabs { display:flex; gap:.4rem; background:var(--surface,#181c27); border-radius:10px; padding:.3rem; margin-bottom:1.2rem; flex-wrap:wrap; }
    .sm-tab { padding:.4rem .9rem; border-radius:7px; font-size:.8rem; font-weight:500; cursor:pointer; transition:all .15s; color:var(--text2,#8892a4); border:none; background:none; font-family:inherit; }
    .sm-tab.active { background:var(--accent,#4f8ef7); color:#fff; }
    .sm-filters { display:flex; gap:.6rem; flex-wrap:wrap; margin-bottom:1.2rem; align-items:center; }
    .sm-search-wrap { position:relative; flex:1; min-width:200px; }
    .sm-search-wrap input { width:100%; padding:.55rem .9rem .55rem 2.2rem; background:var(--surface,#181c27); border:1px solid var(--border,#2a2f42); border-radius:8px; color:var(--text,#e2e8f0); font-size:.85rem; font-family:inherit; outline:none; transition:border-color .15s; }
    .sm-search-wrap input:focus { border-color:var(--accent,#4f8ef7); }
    .sm-search-icon { position:absolute; left:.65rem; top:50%; transform:translateY(-50%); color:var(--text3,#4a5568); font-size:.85rem; pointer-events:none; }
    .sm-filter-sel { padding:.52rem .8rem; background:var(--surface,#181c27); border:1px solid var(--border,#2a2f42); border-radius:8px; color:var(--text,#e2e8f0); font-size:.82rem; font-family:inherit; outline:none; cursor:pointer; }
    .sm-table-wrap { overflow-x:auto; background:var(--surface,#181c27); border:1px solid var(--border,#2a2f42); border-radius:10px; }
    .sm-table { width:100%; border-collapse:collapse; font-size:.83rem; }
    .sm-table thead tr { background:var(--surface2,#1e2333); }
    .sm-table th { padding:.7rem 1rem; text-align:left; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text2,#8892a4); font-weight:600; white-space:nowrap; }
    .sm-table td { padding:.7rem 1rem; border-top:1px solid var(--border,#2a2f42); vertical-align:middle; }
    .sm-table tr:hover td { background:rgba(79,142,247,.04); }
    .sm-avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#4f8ef7,#7c3aed); display:inline-flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; color:#fff; flex-shrink:0; }
    .sm-name-cell { display:flex; align-items:center; gap:.6rem; }
    .sm-badge { display:inline-block; padding:.2rem .55rem; border-radius:99px; font-size:.7rem; font-weight:600; }
    .sm-badge-success { background:rgba(16,185,129,.15); color:#10b981; }
    .sm-badge-warning { background:rgba(245,158,11,.15); color:#f59e0b; }
    .sm-badge-danger  { background:rgba(239,68,68,.15); color:#ef4444; }
    .sm-badge-blue    { background:rgba(79,142,247,.15); color:#4f8ef7; }
    .sm-badge-purple  { background:rgba(124,58,237,.15); color:#a78bfa; }
    .sm-badge-gray    { background:rgba(148,163,184,.1); color:#94a3b8; }
    .sm-cred-badge { display:inline-flex; align-items:center; gap:.3rem; background:rgba(79,142,247,.12); border:1px solid rgba(79,142,247,.25); color:#4f8ef7; border-radius:6px; padding:.15rem .45rem; font-size:.68rem; font-weight:600; cursor:pointer; }
    .sm-upload-zone { border:2px dashed var(--border,#2a2f42); border-radius:10px; padding:1.2rem; text-align:center; cursor:pointer; transition:border-color .2s, background .2s; position:relative; }
    .sm-upload-zone:hover, .sm-upload-zone.drag { border-color:var(--accent,#4f8ef7); background:rgba(79,142,247,.05); }
    .sm-upload-zone input[type=file] { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
    .sm-cred-list { display:flex; flex-direction:column; gap:.4rem; margin-top:.7rem; }
    .sm-cred-item { display:flex; align-items:center; gap:.6rem; background:var(--bg,#0f1117); border:1px solid var(--border,#2a2f42); border-radius:7px; padding:.45rem .75rem; font-size:.78rem; }
    .sm-cred-item .ci-name { flex:1; color:var(--text,#e2e8f0); }
    .sm-cred-item .ci-size { color:var(--text3,#4a5568); font-size:.7rem; }
    .sm-cred-item .ci-del { cursor:pointer; color:#ef4444; font-size:.85rem; border:none; background:none; padding:0; }
    .sm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .sm-span2 { grid-column:1/-1; }
    .sm-form-group label { display:block; font-size:.75rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--text2,#8892a4); margin-bottom:.4rem; }
    .sm-form-group input, .sm-form-group select, .sm-form-group textarea { width:100%; padding:.6rem .85rem; background:var(--bg,#0f1117); border:1px solid var(--border,#2a2f42); border-radius:8px; color:var(--text,#e2e8f0); font-size:.85rem; font-family:inherit; outline:none; transition:border-color .15s; }
    .sm-form-group input:focus, .sm-form-group select:focus, .sm-form-group textarea:focus { border-color:var(--accent,#4f8ef7); }
    .sm-form-group textarea { resize:vertical; min-height:70px; }
    .sm-form-section { grid-column:1/-1; padding:.5rem 0 .3rem; border-top:1px solid var(--border,#2a2f42); margin-top:.3rem; }
    .sm-form-section span { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--accent,#4f8ef7); }
    .sm-empty { text-align:center; padding:3rem; color:var(--text3,#4a5568); }
    .sm-empty-icon { font-size:2rem; margin-bottom:.6rem; }
  `;
  document.head.appendChild(style);
})();

// ── Helpers ────────────────────────────────────────────────────────────────────
function smMakeId() {
  const num = (App.data.staff || App.data.teachers || []).length + 1;
  return 'S' + String(num).padStart(3, '0');
}

function smGetInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function smAvatarColor(id) {
  const colors = ['#4f8ef7', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
  const num = parseInt((id || '0').replace(/\D/g, '')) || 0;
  return colors[num % colors.length];
}

function smFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const icons = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', doc: '📝', docx: '📝' };
  return icons[ext] || '📎';
}

function smFormatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Render Entry Point ─────────────────────────────────────────────────────────

/* ════════════════════════════════════════════════════════════════
   PRINT — CLASS LIST
   Purpose options: Register / Attendance / Payment / Exam
════════════════════════════════════════════════════════════════ */
window.printClassList = function(className, arm) {
  const students = armStudents(className, arm);
  if (!students.length) { alert('No students in this class/arm.'); return; }

  const school = App.data.schoolInfo || {};
  const schoolName = school.name || school.school_name || 'Sacred Heart College Eziukwu Aba';
  const session    = school.session || school.current_session || '____/____';
  const term       = school.term    || school.current_term    || '__________ Term';
  const principal  = school.principal || '';

  // Prompt for purpose — shown as modal
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:grid;place-items:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:1.75rem;max-width:420px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.22)">
      <h3 style="margin:0 0 1rem;color:#1e3a5f;font-size:1rem;font-weight:700">🖨 Print Class List — ${className} ${arm}</h3>
      <p style="font-size:.85rem;color:#6b7280;margin-bottom:1.1rem">Select the purpose for this list:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1.1rem">
        ${[
          ['📋','Register / Roll Call', 'register'],
          ['✅','Daily Attendance',     'attendance'],
          ['💰','Fee Payment List',     'payment'],
          ['📝','Exam / Score Entry',   'exam'],
          ['📞','Contact / Phone List', 'contact'],
          ['🏆','Results / Awards',     'results'],
        ].map(([ico, label, type]) => `
          <button onclick="window._doPrintList('${className}','${arm}','${type}');this.closest('div').parentElement.remove()"
            style="padding:.65rem .75rem;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;
                   background:#f8fafc;font-size:.82rem;font-weight:600;text-align:left;display:flex;align-items:center;gap:.5rem;
                   transition:all .15s"
            onmouseover="this.style.background='#eff6ff';this.style.borderColor='#93c5fd'"
            onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb'">
            <span>${ico}</span><span>${label}</span>
          </button>`).join('')}
      </div>
      <button onclick="this.closest('div').parentElement.remove()"
        style="width:100%;padding:.5rem;border:1.5px solid #e5e7eb;border-radius:8px;
               background:#fff;color:#6b7280;font-size:.85rem;font-weight:600;cursor:pointer">
        Cancel
      </button>
    </div>`;
  document.body.appendChild(modal);
};

window._doPrintList = function(className, arm, purpose) {
  const students = armStudents(className, arm);
  const school   = App.data.schoolInfo || {};
  const schoolName = school.name || school.school_name || 'Sacred Heart College Eziukwu Aba';
  const session    = school.session || school.current_session || '____/____';
  const term       = school.term    || school.current_term    || '__________ Term';

  const purposes = {
    register:   { title:'Class Register',          cols:['S/N','Student Name','Student ID','Signature'] },
    attendance: { title:'Attendance Sheet',         cols:['S/N','Student Name','Student ID','Mon','Tue','Wed','Thu','Fri','Mon','Tue','Wed','Thu','Fri','Mon','Tue','Wed','Thu','Fri'] },
    payment:    { title:'Fee Payment Register',     cols:['S/N','Student Name','Student ID','Fee Type','Amount','Payment Date','Status','Collector\'s Initials'] },
    exam:       { title:'Examination Score Sheet',  cols:['S/N','Student Name','Student ID','CA (___/20)','Exam (___/80)','Total','Grade','Remark'] },
    contact:    { title:'Parent / Guardian Contact',cols:['S/N','Student Name','Student ID','Parent Name','Phone','Email','Address'] },
    results:    { title:'Academic Results Sheet',   cols:['S/N','Student Name','Student ID','1st Term','2nd Term','3rd Term','Avg','Pos','Remark'] },
  };
  const cfg = purposes[purpose] || purposes.register;

  const rows = students.map((s, i) => {
    const cells = cfg.cols.map((col, ci) => {
      if (ci === 0) return `<td style="text-align:center">${i+1}</td>`;
      if (ci === 1) return `<td style="font-weight:600">${s.name}</td>`;
      if (ci === 2) return `<td style="font-family:monospace;font-size:.78rem">${s.id}</td>`;
      return `<td></td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const colW = Math.floor(100 / cfg.cols.length);
  const headerRow = cfg.cols.map(h => `<th style="width:${colW}%">${h}</th>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${cfg.title} — ${className} ${arm}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
    .header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; }
    .header h1 { font-size: 14px; font-weight: 800; color: #1e3a5f; }
    .header h2 { font-size: 12px; font-weight: 700; margin: 3px 0; }
    .header .meta { display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px; color: #374151; }
    .logo { width: 50px; height: 50px; object-fit: contain; float: left; margin-right: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #1e3a5f; color: #fff; padding: 4px 5px; font-size: 9px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; border: 1px solid #1e3a5f; }
    td { padding: 5px 5px; border: 1px solid #d1d5db; height: 22px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    tr:first-child td { font-weight: 700; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 18px; font-size: 10px; }
    .sign-box { text-align: center; }
    .sign-line { border-top: 1px solid #111; width: 160px; margin: 18px auto 2px; }
    @media print { .no-print { display: none; } }
    .no-print { text-align: center; margin-bottom: 10px; }
    .no-print button { background: #1e3a5f; color: #fff; border: none; padding: 6px 18px; border-radius: 6px; cursor: pointer; font-weight: 700; margin-right: 8px; }
  </style></head><body>
  <div class="no-print">
    <button onclick="window.print()">🖨 Print</button>
    <button onclick="window.close()" style="background:#6b7280!important">✕ Close</button>
  </div>
  <div class="header">
    <img class="logo" src="images/sahaco logo.jpg" onerror="this.style.display='none'">
    <h1>${schoolName}</h1>
    <h2>${cfg.title} — ${className} ${arm}</h2>
    <div class="meta">
      <span><strong>Class:</strong> ${className} ${arm} &nbsp;&nbsp; <strong>No. of Students:</strong> ${students.length}</span>
      <span><strong>Session:</strong> ${session} &nbsp;&nbsp; <strong>Term:</strong> ${term}</span>
      <span><strong>Date Printed:</strong> ${new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}</span>
    </div>
  </div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sign-row">
    <div class="sign-box"><div class="sign-line"></div><span>Class Teacher's Signature</span></div>
    <div class="sign-box"><div class="sign-line"></div><span>Form Master's Signature</span></div>
    <div class="sign-box"><div class="sign-line"></div><span>Principal's Signature</span></div>
  </div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=750,scrollbars=yes');
  if (w) { w.document.write(html); w.document.close(); }
};


/* ════════════════════════════════════════════════════════════════
   PRINT — EMPTY SCORESHEET
   Prints a subject × student grid for manual score entry
════════════════════════════════════════════════════════════════ */
window.printScoresheet = function(className, arm) {
  const students = armStudents(className, arm);
  if (!students.length) { alert('No students in this class/arm.'); return; }

  const school   = App.data.schoolInfo || {};
  const schoolName = school.name || school.school_name || 'Sacred Heart College Eziukwu Aba';
  const session    = school.session || school.current_session || '____/____';
  const term       = school.term    || school.current_term    || '__________ Term';

  // Get allocated subjects for this class/arm
  const allocKey   = `${className}_${arm}`;
  const rawAlloc   = App.data.subjectAllocations?.[allocKey]
                  || App.data.subjectAllocations?.[className]
                  || [];
  const subjects   = rawAlloc.length
    ? rawAlloc.map(s => typeof s === 'string' ? s : (s.name || s.subject_name || '')).filter(Boolean)
    : (App.data.subjects || []).map(s => s.name || s.subject_name || '').filter(Boolean);

  const maxCA   = typeof getMaxCA   === 'function' ? getMaxCA()   : 20;
  const maxExam = typeof getMaxExam === 'function' ? getMaxExam() : 80;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:grid;place-items:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:1.75rem;max-width:460px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.22)">
      <h3 style="margin:0 0 .75rem;color:#1e3a5f;font-size:1rem;font-weight:700">📋 Print Scoresheet — ${className} ${arm}</h3>
      <p style="font-size:.84rem;color:#6b7280;margin-bottom:1rem">Select scoresheet type:</p>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem">
        <button onclick="window._doPrintScoresheet('${className}','${arm}','single');this.closest('div').parentElement.remove()"
          style="padding:.65rem 1rem;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;
                 background:#f8fafc;font-size:.84rem;font-weight:600;text-align:left;display:flex;align-items:center;gap:.6rem"
          onmouseover="this.style.background='#eff6ff';this.style.borderColor='#93c5fd'"
          onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb'">
          <span>📄</span>
          <div><strong>Single Subject Sheet</strong>
            <div style="font-size:.75rem;color:#6b7280">One sheet per subject — CA + Exam columns</div>
          </div>
        </button>
        <button onclick="window._doPrintScoresheet('${className}','${arm}','all');this.closest('div').parentElement.remove()"
          style="padding:.65rem 1rem;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;
                 background:#f8fafc;font-size:.84rem;font-weight:600;text-align:left;display:flex;align-items:center;gap:.6rem"
          onmouseover="this.style.background='#eff6ff';this.style.borderColor='#93c5fd'"
          onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb'">
          <span>📊</span>
          <div><strong>All Subjects Grid</strong>
            <div style="font-size:.75rem;color:#6b7280">All subjects across top — students down the side</div>
          </div>
        </button>
      </div>
      <button onclick="this.closest('div').parentElement.remove()"
        style="width:100%;padding:.5rem;border:1.5px solid #e5e7eb;border-radius:8px;
               background:#fff;color:#6b7280;font-size:.85rem;font-weight:600;cursor:pointer">Cancel</button>
    </div>`;
  document.body.appendChild(modal);
};

window._doPrintScoresheet = function(className, arm, type) {
  const students   = armStudents(className, arm);
  const school     = App.data.schoolInfo || {};
  const schoolName = school.name || school.school_name || 'Sacred Heart College Eziukwu Aba';
  const session    = school.session || school.current_session || '____/____';
  const term       = school.term    || school.current_term    || '__________ Term';

  const allocKey = `${className}_${arm}`;
  const rawAlloc = App.data.subjectAllocations?.[allocKey] || App.data.subjectAllocations?.[className] || [];
  const subjects = rawAlloc.length
    ? rawAlloc.map(s => typeof s === 'string' ? s : (s.name || s.subject_name || '')).filter(Boolean)
    : (App.data.subjects || []).map(s => s.name || s.subject_name || '').filter(Boolean);

  const maxCA   = typeof getMaxCA   === 'function' ? getMaxCA()   : 20;
  const maxExam = typeof getMaxExam === 'function' ? getMaxExam() : 80;

  const baseStyle = `
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
    .hdr { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-bottom: 6px; }
    .hdr h1 { font-size: 13px; font-weight: 800; color: #1e3a5f; }
    .hdr h2 { font-size: 11px; font-weight: 700; margin: 2px 0; }
    .meta { display: flex; justify-content: space-between; font-size: 9px; margin-top: 3px; }
    .logo { width: 44px; height: 44px; object-fit: contain; float: left; margin-right: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e3a5f; color: #fff; padding: 3px 4px; font-size: 8.5px; text-align: center; border: 1px solid #1e3a5f; font-weight: 700; text-transform: uppercase; }
    th.subj { background: #2563eb; }
    td { padding: 4px 4px; border: 1px solid #d1d5db; height: 20px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    .sn { text-align: center; width: 28px; }
    .name { font-weight: 600; min-width: 140px; }
    .sid { font-family: monospace; font-size: 8.5px; min-width: 110px; }
    .score { text-align: center; min-width: 36px; }
    .total { text-align: center; min-width: 36px; font-weight: 700; background: #f0fdf4 !important; }
    .sign { display: flex; justify-content: space-between; margin-top: 14px; font-size: 9px; }
    .sbox { text-align: center; }
    .sline { border-top: 1px solid #111; width: 140px; margin: 14px auto 2px; }
    .no-print { text-align: center; margin-bottom: 8px; }
    .no-print button { background: #1e3a5f; color: #fff; border: none; padding: 5px 16px; border-radius: 5px; cursor: pointer; font-weight: 700; margin-right: 6px; }
    @media print { .no-print { display: none; } .page-break { page-break-after: always; } }`;

  let body = '';

  if (type === 'single') {
    // One scoresheet per subject
    subjects.forEach((subj, si) => {
      const rows = students.map((s, i) => `
        <tr>
          <td class="sn">${i+1}</td>
          <td class="name">${s.name}</td>
          <td class="sid">${s.id}</td>
          <td class="score"></td>
          <td class="score"></td>
          <td class="total"></td>
          <td class="score"></td>
          <td class="score"></td>
        </tr>`).join('');
      body += `
        <div class="${si < subjects.length-1 ? 'page-break' : ''}">
          <div class="hdr">
            <img class="logo" src="images/sahaco logo.jpg" onerror="this.style.display='none'">
            <h1>${schoolName}</h1>
            <h2>Score Sheet — ${subj} — ${className} ${arm}</h2>
            <div class="meta">
              <span><strong>Class:</strong> ${className} ${arm}</span>
              <span><strong>Subject:</strong> ${subj} &nbsp; <strong>Max CA:</strong> ${maxCA} &nbsp; <strong>Max Exam:</strong> ${maxExam}</span>
              <span><strong>${session} — ${term}</strong></span>
            </div>
          </div>
          <table>
            <thead><tr>
              <th class="sn">S/N</th>
              <th style="min-width:140px">Student Name</th>
              <th style="min-width:110px">Student ID</th>
              <th class="score">CA 1<br>(${Math.round(maxCA/2)})</th>
              <th class="score">CA 2<br>(${maxCA - Math.round(maxCA/2)})</th>
              <th class="total">CA Total<br>(${maxCA})</th>
              <th class="score">Exam<br>(${maxExam})</th>
              <th class="score">Total<br>(100)</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="sign">
            <div class="sbox"><div class="sline"></div><span>Subject Teacher</span></div>
            <div class="sbox"><div class="sline"></div><span>HOD / Coordinator</span></div>
            <div class="sbox"><div class="sline"></div><span>Principal</span></div>
          </div>
        </div>`;
    });
  } else {
    // All-subjects grid
    const subjectCols = subjects.map(s => `<th class="subj score" title="${s}">${s.length > 12 ? s.slice(0,11)+'…' : s}<br>(100)</th>`).join('');
    const rows = students.map((s, i) => {
      const scoreCells = subjects.map(() => `<td class="score"></td>`).join('');
      return `<tr>
        <td class="sn">${i+1}</td>
        <td class="name">${s.name}</td>
        <td class="sid">${s.id}</td>
        ${scoreCells}
        <td class="total"></td>
        <td class="score"></td>
        <td class="score"></td>
      </tr>`;
    }).join('');
    body = `
      <div class="hdr">
        <img class="logo" src="images/sahaco logo.jpg" onerror="this.style.display='none'">
        <h1>${schoolName}</h1>
        <h2>Class Score Sheet — ${className} ${arm} — All Subjects</h2>
        <div class="meta">
          <span><strong>Class:</strong> ${className} ${arm} &nbsp; <strong>Students:</strong> ${students.length}</span>
          <span><strong>Session:</strong> ${session} &nbsp; <strong>Term:</strong> ${term}</span>
          <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}</span>
        </div>
      </div>
      <div style="overflow-x:auto">
      <table>
        <thead><tr>
          <th class="sn">S/N</th>
          <th style="min-width:150px">Student Name</th>
          <th style="min-width:100px">Student ID</th>
          ${subjectCols}
          <th class="total">Total<br>Score</th>
          <th class="score">Avg</th>
          <th class="score">Pos</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="sign">
        <div class="sbox"><div class="sline"></div><span>Class Teacher</span></div>
        <div class="sbox"><div class="sline"></div><span>Form Master</span></div>
        <div class="sbox"><div class="sline"></div><span>Principal</span></div>
      </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Scoresheet — ${className} ${arm}</title>
    <style>${baseStyle}</style></head><body>
    <div class="no-print">
      <button onclick="window.print()">🖨 Print</button>
      <button onclick="window.close()" style="background:#6b7280!important">✕ Close</button>
    </div>
    ${body}
  </body></html>`;

  const w = window.open('', '_blank', 'width=1150,height=780,scrollbars=yes');
  if (w) { w.document.write(html); w.document.close(); }
};


/* ════════════════════════════════════════════════════════════════
   PARENT EMAIL MANAGER
   Bulk tool to add / update parent email addresses
════════════════════════════════════════════════════════════════ */
window.openParentEmailManager = function(filterClass, filterArm) {
  const classes = App.data.classes || [];
  const classOpts = `<option value="">All Classes</option>` +
    classes.map(c => `<option value="${c.name}" ${filterClass===c.name?'selected':''}>${c.name}</option>`).join('');

  const allStudents = App.data.students || [];
  let list = [...allStudents].sort((a,b)=>a.name.localeCompare(b.name));
  if (filterClass) list = list.filter(s => s.class === filterClass);
  if (filterArm)   list = list.filter(s => s.arm   === filterArm);

  const missing   = list.filter(s => !s.parent_email);
  const hasEmail  = list.filter(s =>  s.parent_email);

  const rows = list.map(s => {
    const hasMail = !!s.parent_email;
    return `<tr id="per-row-${s.id.replace(/[^a-z0-9]/gi,'-')}">
      <td style="font-weight:600">${s.name}</td>
      <td style="font-size:.78rem;color:#6b7280">${s.class||''} ${s.arm||''}</td>
      <td style="font-size:.75rem;font-family:monospace">${s.id}</td>
      <td style="font-size:.8rem;color:#6b7280">${s.parent||'—'}</td>
      <td>
        <div style="display:flex;gap:.4rem;align-items:center;">
          <input type="email" id="pem-${s.id.replace(/[^a-z0-9]/gi,'-')}"
            value="${s.parent_email||''}" placeholder="email@example.com"
            style="flex:1;min-width:180px;padding:.38rem .65rem;border:1.5px solid ${hasMail?'#86efac':'#fca5a5'};
                   border-radius:7px;font-size:.82rem;outline:none;"
            onfocus="this.style.borderColor='#93c5fd'"
            onblur="this.style.borderColor=this.value?'#86efac':'#fca5a5'">
          <button onclick="saveSingleParentEmail('${s.id}')"
            style="padding:.38rem .75rem;background:#1e3a5f;color:#fff;border:none;border-radius:7px;
                   font-size:.78rem;font-weight:600;cursor:pointer;white-space:nowrap;">
            💾 Save
          </button>
        </div>
        ${hasMail?`<div style="font-size:.7rem;color:#16a34a;margin-top:.2rem;">✓ ${s.parent_email}</div>`:''}
      </td>
    </tr>`;
  }).join('');

  showModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
      <h3 style="margin:0;color:#1e3a5f;font-size:1rem;font-weight:800;">📧 Parent Email Manager</h3>
      <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;">
        <span style="font-size:.78rem;color:#16a34a;font-weight:600;">✓ ${hasEmail.length} have email</span>
        <span style="font-size:.78rem;color:#dc2626;font-weight:600;">⚠ ${missing.length} missing</span>
      </div>
    </div>

    <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
      <select id="pem-filter-class" onchange="openParentEmailManager(this.value,document.getElementById('pem-filter-arm')?.value)"
        style="padding:.42rem .7rem;border:1.5px solid #e5e7eb;border-radius:8px;font-size:.83rem;outline:none">
        ${classOpts}
      </select>
      <select id="pem-filter-arm" onchange="openParentEmailManager(document.getElementById('pem-filter-class')?.value,this.value)"
        style="padding:.42rem .7rem;border:1.5px solid #e5e7eb;border-radius:8px;font-size:.83rem;outline:none">
        <option value="">All Arms</option>
        ${filterClass ? (classes.find(c=>c.name===filterClass)?.arms||[]).map(a=>`<option value="${a}" ${filterArm===a?'selected':''}>${a}</option>`).join('') : ''}
      </select>
      <label style="display:flex;align-items:center;gap:.3rem;font-size:.82rem;color:#374151;cursor:pointer;">
        <input type="checkbox" id="pem-show-missing" ${!filterClass?'checked':''} onchange="
          const rows = document.querySelectorAll('#pem-table tr[id]');
          rows.forEach(r=>{ if(this.checked){ r.style.display=r.dataset.hasMail==='0'?'':'none'; }else{r.style.display='';} })
        ">
        Show only missing
      </label>
    </div>

    <div style="max-height:480px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:10px;">
      <table id="pem-table" style="width:100%;border-collapse:collapse;font-size:.83rem;">
        <thead style="position:sticky;top:0;z-index:1;">
          <tr>
            <th style="padding:.55rem .75rem;background:#1e3a5f;color:#fff;text-align:left;font-size:.73rem;font-weight:700;text-transform:uppercase">Student</th>
            <th style="padding:.55rem .75rem;background:#1e3a5f;color:#fff;text-align:left;font-size:.73rem;font-weight:700;text-transform:uppercase">Class</th>
            <th style="padding:.55rem .75rem;background:#1e3a5f;color:#fff;text-align:left;font-size:.73rem;font-weight:700;text-transform:uppercase">ID</th>
            <th style="padding:.55rem .75rem;background:#1e3a5f;color:#fff;text-align:left;font-size:.73rem;font-weight:700;text-transform:uppercase">Parent</th>
            <th style="padding:.55rem .75rem;background:#1e3a5f;color:#fff;text-align:left;font-size:.73rem;font-weight:700;text-transform:uppercase">Email Address</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="display:flex;gap:.5rem;margin-top:.85rem;justify-content:space-between;align-items:center;flex-wrap:wrap;">
      <div style="font-size:.78rem;color:#6b7280;">
        Tip: Press <kbd style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;padding:.1rem .4rem;font-size:.73rem;">Tab</kbd>
        to move between fields, then click 💾 Save.
      </div>
      <div style="display:flex;gap:.5rem;">
        <button onclick="saveAllParentEmails()" style="padding:.48rem 1.1rem;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;">
          💾 Save All
        </button>
        <button onclick="closeModal()" style="padding:.48rem 1rem;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;">
          Close
        </button>
      </div>
    </div>`);

  // Mark rows with data attr for "show missing" filter
  requestAnimationFrame(() => {
    list.forEach(s => {
      const row = document.getElementById(`per-row-${s.id.replace(/[^a-z0-9]/gi,'-')}`);
      if (row) row.dataset.hasMail = s.parent_email ? '1' : '0';
    });
  });
};

window.saveSingleParentEmail = async function(studentId) {
  const safeId  = studentId.replace(/[^a-z0-9]/gi,'-');
  const input   = document.getElementById(`pem-${safeId}`);
  const email   = input?.value?.trim() || null;
  const row     = document.getElementById(`per-row-${safeId}`);

  // Basic validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    input.style.borderColor = '#dc2626';
    toast('Please enter a valid email address.', 'error');
    return;
  }

  try {
    await Students.update(studentId, { parent_email: email });
    // Update local cache
    const s = (App.data.students||[]).find(x=>x.id===studentId);
    if (s) s.parent_email = email;
    if (input) { input.style.borderColor = email ? '#86efac' : '#fca5a5'; }
    if (row)   { row.dataset.hasMail = email ? '1' : '0'; }
    toast(`✅ Email ${email ? 'saved' : 'removed'} for ${s?.name||studentId}`, 'success');
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
};

window.saveAllParentEmails = async function() {
  const inputs = document.querySelectorAll('#pem-table input[type="email"]');
  let saved = 0, errors = 0;
  for (const input of inputs) {
    const email = input.value.trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors++; continue; }
    // Extract student ID from input id: pem-SAHARCO-20250115-0001 -> SAHARCO/20250115/0001
    const rawId = input.id.replace(/^pem-/, '');
    // Find matching student by safe ID
    const s = (App.data.students||[]).find(st => st.id.replace(/[^a-z0-9]/gi,'-') === rawId);
    if (!s) continue;
    if (s.parent_email === email) continue; // no change
    try {
      await Students.update(s.id, { parent_email: email });
      s.parent_email = email;
      saved++;
    } catch(e) { errors++; }
  }
  if (errors) toast(`${saved} saved, ${errors} failed (check email formats)`, 'warning');
  else toast(`✅ ${saved} email(s) saved successfully`, 'success');
  if (saved > 0) closeModal();
};


/* ════════════════════════════════════════════════════════════════
   DUPLICATE STUDENT DETECTOR
   Finds duplicates by: exact name, similar name (≥85%), same
   class+arm+parent combo, or same phone number.
   Prompts: Keep All / Remove Duplicates / Merge Records
════════════════════════════════════════════════════════════════ */
window.openDuplicateDetector = function() {
  const students = App.data.students || [];
  if (!students.length) { toast('No students loaded.', 'warning'); return; }

  // ── Similarity: Levenshtein distance normalised ──────────────────
  function similarity(a, b) {
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    if (a === b) return 1;
    const la = a.length, lb = b.length;
    if (!la || !lb) return 0;
    const dp = Array.from({ length: la + 1 }, (_, i) =>
      Array.from({ length: lb + 1 }, (_, j) => j === 0 ? i : j === 0 ? i : 0)
    );
    for (let i = 1; i <= la; i++)
      for (let j = 1; j <= lb; j++)
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return 1 - dp[la][lb] / Math.max(la, lb);
  }

  // ── Find all duplicate groups ────────────────────────────────────
  const groups  = [];
  const matched = new Set();

  for (let i = 0; i < students.length; i++) {
    if (matched.has(students[i].id)) continue;
    const group = [students[i]];
    const reasons = {};

    for (let j = i + 1; j < students.length; j++) {
      if (matched.has(students[j].id)) continue;
      const si = students[i], sj = students[j];
      const reasons_ij = [];

      // Exact name match (case-insensitive)
      if (si.name.toLowerCase().trim() === sj.name.toLowerCase().trim())
        reasons_ij.push('exact name match');

      // Similar name (≥85% similarity)
      else if (similarity(si.name, sj.name) >= 0.85)
        reasons_ij.push(`similar name (${Math.round(similarity(si.name, sj.name)*100)}%)`);

      // Same class + arm + parent (same household)
      if (si.class === sj.class && si.arm === sj.arm && si.parent &&
          si.parent.toLowerCase().trim() === (sj.parent||'').toLowerCase().trim())
        reasons_ij.push('same class, arm & parent');

      // Same phone
      if (si.phone && si.phone === sj.phone)
        reasons_ij.push('same phone number');

      if (reasons_ij.length) {
        group.push(sj);
        reasons[sj.id] = reasons_ij;
        matched.add(sj.id);
      }
    }

    if (group.length > 1) {
      matched.add(students[i].id);
      groups.push({ students: group, reasons });
    }
  }

  if (!groups.length) {
    showModal(`
      <h3 style="color:#16a34a;margin:0 0 1rem;">✅ No Duplicates Found</h3>
      <p style="color:#6b7280;font-size:.9rem;margin-bottom:1.5rem;">
        No duplicate or similar student records were detected across ${students.length} students.
      </p>
      <div style="text-align:right;">
        <button onclick="closeModal()" style="${btnStyle('primary')}">Close</button>
      </div>`);
    return;
  }

  _renderDupModal(groups, 0);
};

function _dupCard(s, isFirst, groupId) {
  const school = App.data.schoolInfo || {};
  return `
    <div id="dup-card-${s.id.replace(/[^a-z0-9]/gi,'-')}"
      style="background:${isFirst?'#eff6ff':'#fff'};border:2px solid ${isFirst?'#93c5fd':'#e5e7eb'};
             border-radius:12px;padding:1rem 1.1rem;position:relative;">
      ${isFirst ? '<div style="position:absolute;top:.5rem;right:.5rem;background:#2563eb;color:#fff;border-radius:5px;padding:.15rem .5rem;font-size:.68rem;font-weight:700;">FIRST RECORD</div>' : ''}
      <div style="font-weight:700;font-size:.95rem;color:#111;margin-bottom:.25rem;">${s.name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.25rem .75rem;font-size:.8rem;color:#374151;margin-bottom:.75rem;">
        <span>🆔 ${s.id}</span>
        <span>🏫 ${s.class||'—'} ${s.arm||''}</span>
        <span>👤 ${s.gender||'—'}</span>
        <span>🎂 ${s.dob ? s.dob.slice(0,10) : '—'}</span>
        <span>👨‍👩‍👧 ${s.parent||'—'}</span>
        <span>📞 ${s.phone||'—'}</span>
        <span>📧 ${s.parent_email||'—'}</span>
        <span>📊 ${s.attendance||100}% attendance</span>
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;">
        <button onclick="_dupAction('keep','${s.id}','${groupId}')"
          style="padding:.3rem .75rem;background:#16a34a;color:#fff;border:none;border-radius:7px;font-size:.78rem;font-weight:700;cursor:pointer;">
          ✓ Keep
        </button>
        <button onclick="_dupAction('remove','${s.id}','${groupId}')"
          style="padding:.3rem .75rem;background:#dc2626;color:#fff;border:none;border-radius:7px;font-size:.78rem;font-weight:700;cursor:pointer;">
          🗑 Remove
        </button>
        <button onclick="_dupAction('edit','${s.id}','${groupId}')"
          style="padding:.3rem .75rem;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:7px;font-size:.78rem;font-weight:600;cursor:pointer;">
          ✏ Edit
        </button>
      </div>
    </div>`;
}

function _renderDupModal(groups, idx) {
  const group = groups[idx];
  const groupId = `grp${idx}`;
  // Store groups on window for action handlers
  window._dupGroups = groups;
  window._dupGroupIdx = idx;

  const reasonLines = group.students.slice(1).map(s => {
    const r = group.reasons[s.id] || [];
    return `<li><strong>${s.name}</strong> — ${r.join(', ')}</li>`;
  }).join('');

  showModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem;">
      <h3 style="margin:0;color:#1e3a5f;font-size:1rem;font-weight:800;">
        🔍 Duplicate Group ${idx+1} of ${groups.length}
        <span style="font-size:.78rem;color:#6b7280;font-weight:400;margin-left:.5rem;">(${group.students.length} records)</span>
      </h3>
      <div style="display:flex;gap:.4rem;">
        ${idx > 0 ? `<button onclick="_renderDupModal(window._dupGroups,${idx-1})" style="padding:.3rem .65rem;border:1px solid #e5e7eb;border-radius:7px;background:#f9fafb;font-size:.8rem;cursor:pointer;">← Prev</button>` : ''}
        ${idx < groups.length-1 ? `<button onclick="_renderDupModal(window._dupGroups,${idx+1})" style="padding:.3rem .65rem;border:1px solid #e5e7eb;border-radius:7px;background:#f9fafb;font-size:.8rem;cursor:pointer;">Next →</button>` : ''}
      </div>
    </div>

    <!-- Why flagged -->
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:.65rem 1rem;margin-bottom:1rem;font-size:.82rem;color:#92400e;">
      <strong>⚠ Why flagged:</strong>
      <ul style="margin:.35rem 0 0 1.1rem;line-height:1.8;">${reasonLines}</ul>
    </div>

    <!-- Cards -->
    <div style="display:flex;flex-direction:column;gap:.75rem;max-height:420px;overflow-y:auto;margin-bottom:1rem;">
      ${group.students.map((s,i) => _dupCard(s, i===0, groupId)).join('')}
    </div>

    <!-- Bulk actions -->
    <div style="background:#f8fafc;border-radius:10px;padding:.75rem 1rem;margin-bottom:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
      <span style="font-size:.8rem;font-weight:600;color:#374151;flex:1;">Quick actions for this group:</span>
      <button onclick="_dupKeepFirst('${groupId}')"
        style="padding:.38rem .85rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;">
        ✓ Keep First, Remove Rest
      </button>
      <button onclick="_dupKeepAll('${groupId}')"
        style="padding:.38rem .85rem;background:#6b7280;color:#fff;border:none;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;">
        Keep All (Skip)
      </button>
    </div>

    <!-- Progress -->
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:.78rem;color:#6b7280;">
      <span>Group ${idx+1} of ${groups.length} · ${groups.reduce((n,g)=>n+g.students.length,0)} total flagged records</span>
      <button onclick="closeModal()" style="padding:.3rem .75rem;border:1px solid #e5e7eb;border-radius:7px;background:#fff;font-size:.8rem;cursor:pointer;">Close</button>
    </div>`);
}

window._dupAction = async function(action, studentId, groupId) {
  const groups = window._dupGroups;
  const idx    = window._dupGroupIdx;
  const safeId = studentId.replace(/[^a-z0-9]/gi,'-');

  if (action === 'remove') {
    if (!confirm(`Remove student ${studentId}? This will delete all their records.`)) return;
    try {
      await Students.delete(studentId);
      // Remove from App.data.students
      const i = App.data.students.findIndex(s => s.id === studentId);
      if (i >= 0) App.data.students.splice(i, 1);
      // Remove from group
      groups[idx].students = groups[idx].students.filter(s => s.id !== studentId);
      toast(`Removed ${studentId}`, 'warning');
      // Remove card from modal
      const card = document.getElementById(`dup-card-${safeId}`);
      if (card) card.remove();
      // If only one left in group, advance
      if (groups[idx].students.length <= 1) {
        groups.splice(idx, 1);
        if (!groups.length) {
          closeModal();
          toast('✅ All duplicate groups resolved!', 'success');
          renderStudents(_currentFilter, _currentFilters);
          return;
        }
        _renderDupModal(groups, Math.min(idx, groups.length - 1));
      }
    } catch(e) { toast('Error: ' + e.message, 'error'); }
  }

  if (action === 'keep') {
    const card = document.getElementById(`dup-card-${safeId}`);
    if (card) {
      card.style.border = '2px solid #86efac';
      card.style.background = '#f0fdf4';
      const btn = [...card.querySelectorAll('button')].find(b => b.textContent.includes('Keep'));
      if (btn) { btn.textContent = '✓ Kept'; btn.style.background = '#16a34a'; btn.disabled = true; }
    }
    toast(`✓ ${studentId} marked to keep`, 'success');
  }

  if (action === 'edit') {
    closeModal();
    editStudent(studentId);
  }
};

window._dupKeepFirst = async function(groupId) {
  const groups = window._dupGroups;
  const idx    = window._dupGroupIdx;
  const group  = groups[idx];
  const toRemove = group.students.slice(1);
  if (!confirm(`Remove ${toRemove.length} duplicate record(s) and keep "${group.students[0].name}" (${group.students[0].id})?`)) return;

  let removed = 0;
  for (const s of toRemove) {
    try {
      await Students.delete(s.id);
      const i = App.data.students.findIndex(x => x.id === s.id);
      if (i >= 0) App.data.students.splice(i, 1);
      removed++;
    } catch(e) { toast(`Failed to remove ${s.id}: ${e.message}`, 'error'); }
  }

  toast(`✅ Kept "${group.students[0].name}" — removed ${removed} duplicate(s)`, 'success');
  groups.splice(idx, 1);

  if (!groups.length) {
    closeModal();
    toast('✅ All duplicate groups resolved!', 'success');
    renderStudents(_currentFilter, _currentFilters);
    return;
  }
  _renderDupModal(groups, Math.min(idx, groups.length - 1));
};

window._dupKeepAll = function(groupId) {
  const groups = window._dupGroups;
  const idx    = window._dupGroupIdx;
  groups.splice(idx, 1);
  if (!groups.length) {
    closeModal();
    toast('Done — all groups reviewed.', 'success');
    return;
  }
  _renderDupModal(groups, Math.min(idx, groups.length - 1));
};