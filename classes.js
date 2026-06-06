'use strict';
/**
 * classes.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Classes & Arms + Class Promotion
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
function renderClasses() {
  if (!priv.canManage()) { accessDeniedPage('classes'); return; }

  const section  = document.getElementById('classes');
  const classes  = App.data.classes || [];
  const students = App.data.students || [];

  /* Per-tier counts */
  const tierStats = {};
  TIER_ORDER.forEach(tier => {
    const tClasses  = classes.filter(c => c.level === tier);
    const tStudents = students.filter(s => tClasses.some(c => c.name === s.class));
    tierStats[tier] = {
      classes:  tClasses.length,
      arms:     tClasses.reduce((n, c) => n + (c.arms?.length || 0), 0),
      students: tStudents.length,
    };
  });

  const totalClasses  = classes.length;
  const totalArms     = classes.reduce((n, c) => n + (c.arms?.length || 0), 0);
  const totalStudents = students.length;

  section.innerHTML = `
    <!-- ── Page header ── -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h2 style="margin:0 0 .2rem;font-size:1.5rem;">Classes &amp; Arms</h2>
        <p style="margin:0;color:#6b7280;font-size:.875rem;">Manage all school levels, classes, and arm assignments</p>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
        <input id="class-search" placeholder="🔍 Search…" oninput="filterClassTable()"
          style="${inputStyle('sm')};max-width:180px;">
        <button onclick="openClassModal()" style="${btnStyle('primary')}">+ Add Class</button>
      </div>
    </div>

    <!-- ── Summary stat cards ── -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem;margin-bottom:1.75rem;">
      <div style="background:#1e3a5f;color:#fff;border-radius:12px;padding:1rem 1.1rem;">
        <div style="font-size:1.4rem;">🏫</div>
        <div style="font-size:1.6rem;font-weight:800;line-height:1.1;">${totalClasses}</div>
        <div style="font-size:.72rem;opacity:.8;margin-top:.15rem;">Total Classes</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:1rem 1.1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid #6366f1;">
        <div style="font-size:1.3rem;">🚪</div>
        <div style="font-size:1.5rem;font-weight:800;color:#6366f1;line-height:1.1;">${totalArms}</div>
        <div style="font-size:.72rem;color:#6b7280;margin-top:.15rem;">Total Arms</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:1rem 1.1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid #0891b2;">
        <div style="font-size:1.3rem;">👩‍🎓</div>
        <div style="font-size:1.5rem;font-weight:800;color:#0891b2;line-height:1.1;">${totalStudents}</div>
        <div style="font-size:.72rem;color:#6b7280;margin-top:.15rem;">Total Students</div>
      </div>
      ${TIER_ORDER.map(tier => {
        const t  = CLASS_TIERS[tier];
        const ts = tierStats[tier];
        if (ts.classes === 0) return '';
        return `
        <div style="background:#fff;border-radius:12px;padding:1rem 1.1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-top:3px solid ${t.color};">
          <div style="font-size:1.2rem;">${t.icon}</div>
          <div style="font-size:1.4rem;font-weight:800;color:${t.color};line-height:1.1;">${ts.classes}</div>
          <div style="font-size:.72rem;color:#6b7280;margin-top:.15rem;">${tier}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- ── Tier filter tabs ── -->
    <div id="tier-tabs" style="display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap;">
      <button class="tier-tab active" data-tier="all" onclick="setTierFilter('all')"
        style="${tierTabStyle(true)}">All Tiers</button>
      ${TIER_ORDER.filter(t => tierStats[t].classes > 0).map(tier => `
        <button class="tier-tab" data-tier="${tier}" onclick="setTierFilter('${tier}')"
          style="${tierTabStyle(false, tier)}">
          ${CLASS_TIERS[tier].icon} ${tier}
          <span style="background:rgba(0,0,0,.12);color:inherit;border-radius:999px;padding:.05rem .45rem;font-size:.7rem;margin-left:.3rem;">${tierStats[tier].classes}</span>
        </button>`).join('')}
    </div>

    <!-- ── Table or empty state ── -->
    ${classes.length === 0
      ? emptyClassState()
      : `<div style="overflow-x:auto;border-radius:12px;border:1px solid #e5e7eb;background:#fff;">
          <table id="classes-table" style="${tableStyle()};border-radius:12px;overflow:hidden;">
            <thead><tr style="${thRowStyle()}">
              <th style="${thStyle('40px')}">#</th>
              <th style="${thStyle()}">Class Name</th>
              <th style="${thStyle('130px')}">Level / Tier</th>
              <th style="${thStyle('80px')}">Age Range</th>
              <th style="${thStyle()}">Arms</th>
              <th style="${thStyle('110px')}">Students</th>
              <th style="${thStyle('140px')}">Actions</th>
            </tr></thead>
            <tbody id="classes-tbody">
              ${classes.map((c, i) => classRow(c, i)).join('')}
            </tbody>
          </table>
        </div>`
    }`;

  // Set the active filter state
  window._activeTierFilter = 'all';
}

/* ── TAB STYLE HELPER ────────────────────────────────────────── */
function tierTabStyle(active, tier = null) {
  const t = tier ? CLASS_TIERS[tier] : null;
  if (active && !tier) {
    return 'padding:.35rem .9rem;border-radius:9999px;font-size:.82rem;font-weight:700;cursor:pointer;background:#1e3a5f;color:#fff;border:none;transition:all .15s;';
  }
  if (t) {
    const isActive = false; // toggled via JS class swap
    return `padding:.35rem .9rem;border-radius:9999px;font-size:.82rem;font-weight:600;cursor:pointer;background:${t.surface};color:${t.text};border:1px solid ${t.border};transition:all .15s;`;
  }
  return 'padding:.35rem .9rem;border-radius:9999px;font-size:.82rem;font-weight:600;cursor:pointer;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;transition:all .15s;';
}

/* ── TIER FILTER ─────────────────────────────────────────────── */
window.setTierFilter = function(tier) {
  window._activeTierFilter = tier;

  // Update tab highlight
  document.querySelectorAll('.tier-tab').forEach(btn => {
    const btnTier = btn.dataset.tier;
    const t = CLASS_TIERS[btnTier];
    if (btnTier === tier) {
      if (btnTier === 'all') {
        btn.style.cssText = tierTabStyle(true);
      } else {
        btn.style.cssText = `padding:.35rem .9rem;border-radius:9999px;font-size:.82rem;font-weight:700;cursor:pointer;background:${t.color};color:#fff;border:1px solid ${t.color};transition:all .15s;`;
      }
    } else {
      btn.style.cssText = btnTier === 'all'
        ? 'padding:.35rem .9rem;border-radius:9999px;font-size:.82rem;font-weight:600;cursor:pointer;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;transition:all .15s;'
        : tierTabStyle(false, btnTier);
    }
  });

  // Show/hide rows
  filterClassTable();
};

/* ── SEARCH + TIER FILTER ────────────────────────────────────── */
window.filterClassTable = function() {
  const q    = (document.getElementById('class-search')?.value || '').toLowerCase();
  const tier = window._activeTierFilter || 'all';
  document.querySelectorAll('#classes-tbody tr').forEach(row => {
    const matchSearch = row.textContent.toLowerCase().includes(q);
    const matchTier   = tier === 'all' || row.dataset.tier === tier;
    row.style.display = (matchSearch && matchTier) ? '' : 'none';
  });
};

/* ── SINGLE ROW RENDERER ─────────────────────────────────────── */
function classRow(c, i) {
  const studentCount = (App.data.students || []).filter(s => s.class === c.name).length;
  const tier = CLASS_TIERS[c.level] || CLASS_TIERS['Junior'];
  const ageRange = tier.ageRange || '–';

  const armChips = (c.arms || []).map(a =>
    `<span style="display:inline-block;background:${tier.surface};border:1px solid ${tier.border};color:${tier.text};border-radius:6px;padding:.12rem .5rem;font-size:.75rem;font-weight:600;margin:.1rem .1rem;">${a}</span>`
  ).join('');

  const studentBadgeColor = studentCount === 0
    ? 'background:#f3f4f6;color:#9ca3af;border:1px solid #e5e7eb;'
    : `background:${tier.surface};color:${tier.text};border:1px solid ${tier.border};`;

  return `<tr id="class-row-${c.id}" data-tier="${c.level}" style="${trStyle()}">
    <td style="${tdStyle()};color:#9ca3af;font-size:.82rem;">${i + 1}</td>
    <td style="${tdStyle()};font-weight:700;font-size:.95rem;">${c.name}</td>
    <td style="${tdStyle()}">
      <span style="${tierBadgeStyle(c.level)}">${tier.icon} ${c.level}</span>
    </td>
    <td style="${tdStyle()};font-size:.78rem;color:#9ca3af;white-space:nowrap;">${ageRange}</td>
    <td style="${tdStyle()}">
      <div style="display:flex;flex-wrap:wrap;gap:.15rem;">
        ${armChips || `<span style="font-size:.78rem;color:#d1d5db;">—</span>`}
      </div>
    </td>
    <td style="${tdStyle()}">
      <span style="${studentBadgeColor}display:inline-block;padding:.2rem .6rem;border-radius:9999px;font-size:.75rem;font-weight:600;">
        ${studentCount} student${studentCount !== 1 ? 's' : ''}
      </span>
    </td>
    <td style="${tdStyle()}">
      <button onclick="editClass(${c.id})" style="${btnStyle('secondary', 'sm')}">✏ Edit</button>
      <button onclick="openPromoteClassModal('${c.name}')" style="${btnStyle('warning', 'sm')}" title="Move all students to next class">⬆ Promote</button>
      <button onclick="deleteClass(${c.id})" style="${btnStyle('danger', 'sm')}">🗑</button>
    </td>
  </tr>`;
}

/* ── EMPTY STATE ─────────────────────────────────────────────── */
function emptyClassState() {
  return `
    <div style="background:#fff;border-radius:12px;padding:4rem 2rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <div style="font-size:3.5rem;margin-bottom:1rem;">🏫</div>
      <h3 style="margin:0 0 .4rem;color:#374151;">No classes yet</h3>
      <p style="color:#9ca3af;margin:0 0 .75rem;max-width:360px;margin-inline:auto;font-size:.875rem;">
        Get started by adding your school tiers — Day Care, Nursery, Primary, Junior, or Senior.
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-bottom:1.5rem;">
        ${TIER_ORDER.map(tier => {
          const t = CLASS_TIERS[tier];
          return `<span style="background:${t.surface};color:${t.text};border:1px solid ${t.border};border-radius:9999px;padding:.25rem .75rem;font-size:.8rem;font-weight:600;">${t.icon} ${tier}</span>`;
        }).join('')}
      </div>
      <button onclick="openClassModal()" style="${btnStyle('primary')}">+ Add First Class</button>
    </div>`;
}

/* ── EDIT / DELETE ───────────────────────────────────────────── */
window.editClass = function(id) {
  if (!priv.canManage()) { denyAccess(); return; }
  openClassModal(App.data.classes.find(c => c.id === id));
};

window.deleteClass = function(id) {
  if (!priv.canManage()) { denyAccess(); return; }
  const cls = (App.data.classes || []).find(c => c.id === id);
  if (!cls) return;

  const enrolled = (App.data.students || []).filter(s => s.class === cls.name).length;
  const teachers = (App.data.teachers || []).filter(t => t.assignedClass === cls.name).length;

  if (enrolled > 0) {
    showModal(`
      <div style="text-align:center;padding:.5rem 0 1rem;">
        <div style="font-size:2.5rem;margin-bottom:.75rem;">⚠️</div>
        <h3 style="margin:0 0 .5rem;">Cannot Delete Class</h3>
        <p style="color:#6b7280;margin:0 0 1.5rem;">
          <strong>${cls.name}</strong> has <strong>${enrolled} enrolled student${enrolled !== 1 ? 's' : ''}</strong>.
          Re-assign or remove all students first.
        </p>
        <button onclick="closeModal()" style="${btnStyle('primary')}">OK, Got It</button>
      </div>`);
    return;
  }

  const teacherNote = teachers > 0
    ? `<div style="font-size:.85rem;color:#d97706;background:#fef3c7;border-radius:8px;padding:.6rem .9rem;margin:.75rem 0 0;text-align:left;">⚠ ${teachers} teacher assignment${teachers !== 1 ? 's' : ''} will also be cleared.</div>`
    : '';

  const tier = CLASS_TIERS[cls.level] || {};

  showModal(`
    <div style="text-align:center;padding:.5rem 0 1rem;">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">🗑️</div>
      <h3 style="margin:0 0 .5rem;">Delete Class?</h3>
      <div style="margin:.5rem auto .25rem;display:inline-flex;align-items:center;gap:.4rem;background:${tier.surface || '#f9fafb'};color:${tier.text || '#374151'};border:1px solid ${tier.border || '#e5e7eb'};padding:.3rem .8rem;border-radius:9999px;font-size:.85rem;font-weight:600;">
        ${tier.icon || ''} ${cls.name}
      </div>
      <p style="color:#6b7280;margin:.75rem 0 0;">This cannot be undone.</p>
      ${teacherNote}
      <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:center;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="confirmDeleteClass(${id})" style="${btnStyle('danger')}">Yes, Delete</button>
      </div>
    </div>`);
};

window.confirmDeleteClass = async function(id) {
  const cls = (App.data.classes || []).find(c => c.id === id);
  if (!cls) return;
  try {
    await Classes.delete(cls.name);
    if (App.data.teachers) {
      App.data.teachers.forEach(t => { if (t.assignedClass === cls.name) { t.assignedClass = ''; t.assignedArm = ''; } });
    }
    App.data.classes = App.data.classes.filter(c => c.id !== id);
    closeModal();
    renderClasses();
    toast(`"${cls.name}" deleted.`, 'warning');
  } catch (err) {
    closeModal();
    toast('Error deleting class: ' + (err.message || 'Unknown error'), 'error');
  }
};

/* ── PROMOTE CLASS ───────────────────────────────────────────── */
/* Standard Nigerian school promotion order                       */
const CLASS_PROMOTION_MAP = {
  // Day Care
  'Creche':    'Toddler',    'Toddler':   'Reception',
  // Nursery
  'Nursery 1': 'Nursery 2', 'Nursery 2': 'Nursery 3',
  'Nursery 3': 'Primary 1',
  // Primary
  'Primary 1': 'Primary 2', 'Primary 2': 'Primary 3',
  'Primary 3': 'Primary 4', 'Primary 4': 'Primary 5',
  'Primary 5': 'Primary 6', 'Primary 6': 'JSS 1',
  // Junior Secondary
  'JSS 1':  'JSS 2',  'JSS 2':  'JSS 3',
  'JSS 3':  'SS 1',
  // Senior Secondary
  'SS 1':  'SS 2',   'SS 2':  'SS 3',
  'SSS 1': 'SSS 2',  'SSS 2': 'SSS 3',
};

window.openPromoteClassModal = function(className) {
  const cls        = (App.data.classes || []).find(c => c.name === className);
  const nextName   = CLASS_PROMOTION_MAP[className];
  const nextClass  = nextName ? (App.data.classes || []).find(c => c.name === nextName) : null;
  const students   = (App.data.students || []).filter(s =>
    (s.class === className || s.class_name === className) && s.active !== false);
  const isGraduating = !nextName || className === 'SS 3' || className === 'SSS 3' || className === 'Primary 6';

  const classOpts  = (App.data.classes || []).map(c =>
    `<option value="${c.name}" ${c.name === nextName ? 'selected' : ''}>${c.name}</option>`).join('');

  showModal(`
    <h3 style="margin:0 0 .5rem;">⬆ Promote ${className}</h3>
    <p style="color:#6b7280;font-size:.85rem;margin:0 0 1.25rem;">
      Move <strong>${students.length} student${students.length !== 1 ? 's' : ''}</strong> from
      <strong>${className}</strong> to their next class.
    </p>

    ${isGraduating ? `
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:.9rem 1rem;margin-bottom:1rem;font-size:.85rem;color:#92400e;">
      <strong>⚠️ Final Year Class</strong><br>
      ${className} is the last class in the progression. Students will be
      <strong>archived as Graduated</strong> if you choose "Graduate & Archive".
      Or select a custom destination class below.
    </div>` : ''}

    <div style="display:flex;flex-direction:column;gap:.9rem;">
      <div>
        <label style="${labelStyle()}">Destination Class</label>
        <select id="promo-dest" style="${selectStyle()};width:100%;">
          <option value="">-- Select --</option>${classOpts}
        </select>
      </div>
      <div>
        <label style="${labelStyle()}">Session</label>
        <input id="promo-session" value="${App.data.schoolInfo?.session || ''}"
               placeholder="e.g. 2025/2026" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="${labelStyle()}">Arm (leave blank to keep each student's current arm)</label>
        <select id="promo-arm" style="${selectStyle()};width:100%;">
          <option value="">Keep current arm</option>
          ${['A','B','C','D','E'].map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>

      <div style="background:#eff6ff;border-radius:8px;padding:.75rem 1rem;font-size:.83rem;color:#1d4ed8;">
        <strong>${students.length}</strong> student${students.length !== 1 ? 's' : ''} will be moved.
        Their results, attendance and fee records remain linked to their ID.
      </div>

      <div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        ${isGraduating ? `<button onclick="graduateAndArchive('${className}')"
          style="${btnStyle('warning')}">🎓 Graduate & Archive</button>` : ''}
        <button onclick="submitPromoteClass('${className}')"
          style="${btnStyle('primary')}">⬆ Promote Students</button>
      </div>
    </div>`);
};

window.submitPromoteClass = async function(fromClass) {
  const destClass = document.getElementById('promo-dest')?.value;
  const session   = document.getElementById('promo-session')?.value || '';
  const arm       = document.getElementById('promo-arm')?.value     || null;

  if (!destClass) { toast('Select a destination class', 'error'); return; }
  if (destClass === fromClass) { toast('Destination must be different from current class', 'error'); return; }

  const students = (App.data.students || []).filter(s =>
    (s.class === fromClass || s.class_name === fromClass) && s.active !== false);
  if (!students.length) { toast('No active students in ' + fromClass, 'warning'); return; }

  if (!confirmDlg(`Promote ${students.length} student${students.length !== 1 ? 's' : ''} from ${fromClass} → ${destClass}?`)) return;

  try {
    let promoted = 0, failed = 0;
    const destCls = (App.data.classes || []).find(c => c.name === destClass);

    for (const s of students) {
      const newArm = arm || s.arm;
      try {
        await Students.update(s.id, { class: destClass, arm: newArm });
        s.class = destClass; s.class_name = destClass; s.arm = newArm;
        promoted++;
      } catch (e) { failed++; }
    }

    closeModal();
    if (promoted > 0) {
      toast(`✅ ${promoted} student${promoted !== 1 ? 's' : ''} promoted to ${destClass}${failed ? ` (${failed} failed)` : ''}`, 'success');
    } else {
      toast(`Promotion failed for all students.`, 'error');
    }
    renderClasses();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.graduateAndArchive = async function(fromClass) {
  const session = document.getElementById('promo-session')?.value || '';
  const students = (App.data.students || []).filter(s =>
    (s.class === fromClass || s.class_name === fromClass) && s.active !== false);
  if (!students.length) { toast('No active students in ' + fromClass, 'warning'); return; }

  if (!confirmDlg(`Archive ${students.length} student${students.length !== 1 ? 's' : ''} from ${fromClass} as Graduated? This cannot be easily undone.`)) return;

  let archived = 0, failed = 0;
  for (const s of students) {
    try {
      await Archive.archiveStudent(s.id, {
        exit_reason:  'Graduated',
        exit_session: session,
        exit_term:    'Third Term',
      });
      const idx = App.data.students.findIndex(st => st.id === s.id);
      if (idx > -1) App.data.students.splice(idx, 1);
      archived++;
    } catch(e) { failed++; }
  }

  closeModal();
  toast(`🎓 ${archived} student${archived !== 1 ? 's' : ''} graduated & archived${failed ? ` (${failed} failed)` : ''}`, 'success');
  renderClasses();
};

/* ── MODAL ───────────────────────────────────────────────────── */
function openClassModal(cls = null) {
  const isEdit   = !!cls;
  let modalArms  = cls ? [...(cls.arms || [])] : [];
  let activeLevel = cls?.level || 'Primary';

  /* ── ARM CHIP RENDERER ── */
  const renderArmChips = () => {
    const container = document.getElementById('arm-chips');
    if (!container) return;
    const tier = CLASS_TIERS[activeLevel] || CLASS_TIERS['Primary'];

    container.innerHTML = modalArms.map(a => `
      <span style="display:inline-flex;align-items:center;gap:.3rem;background:${tier.surface};border:1px solid ${tier.border};color:${tier.text};border-radius:8px;padding:.2rem .6rem;font-size:.84rem;font-weight:700;margin:.15rem;">
        ${a}
        <button type="button" onclick="removeArmChip('${a}')"
          style="background:none;border:none;cursor:pointer;color:${tier.text};font-size:.85rem;padding:0;line-height:1;opacity:.7;">✕</button>
      </span>`).join('') +
      `<button type="button" id="add-arm-btn" onclick="toggleAddArmInput()"
        style="${btnStyle('secondary', 'sm')};font-size:.78rem;">+ Arm</button>
       <span id="add-arm-inline" style="display:none;align-items:center;gap:.35rem;">
         <input id="new-arm-input" placeholder="e.g. D" maxlength="6"
           style="${inputStyle('sm')};width:80px;"
           onkeydown="if(event.key==='Enter'){event.preventDefault();addArmFromInput();}">
         <button type="button" onclick="addArmFromInput()" style="${btnStyle('primary', 'sm')}">Add</button>
       </span>`;
  };

  /* ── QUICK ARM PRESETS ── */
  const renderArmPresets = () => {
    const container = document.getElementById('arm-presets');
    if (!container) return;
    const tier = CLASS_TIERS[activeLevel] || CLASS_TIERS['Primary'];
    container.innerHTML = tier.armSuggestions.map(a => `
      <button type="button" onclick="quickAddArm('${a}')"
        style="background:${modalArms.includes(a) ? tier.color : tier.surface};color:${modalArms.includes(a) ? '#fff' : tier.text};border:1px solid ${tier.border};border-radius:6px;padding:.2rem .55rem;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .12s;">
        ${a}${modalArms.includes(a) ? ' ✓' : ''}
      </button>`).join('');
  };

  /* ── CLASS NAME PRESETS ── */
  const renderClassPresets = () => {
    const container = document.getElementById('class-presets');
    if (!container) return;
    const tier    = CLASS_TIERS[activeLevel] || CLASS_TIERS['Primary'];
    const existing = new Set((App.data.classes || []).filter(c => c.id !== cls?.id).map(c => c.name));
    container.innerHTML = `
      <div style="font-size:.75rem;color:#9ca3af;margin-bottom:.3rem;">Quick-fill:</div>
      <div style="display:flex;flex-wrap:wrap;gap:.35rem;">
        ${tier.presets.map(p => {
          const used = existing.has(p);
          return `<button type="button" onclick="${used ? '' : `fillClassName('${p}')`}"
            style="padding:.2rem .6rem;border-radius:6px;font-size:.78rem;font-weight:600;cursor:${used ? 'not-allowed' : 'pointer'};
                   background:${used ? '#f3f4f6' : tier.surface};color:${used ? '#d1d5db' : tier.text};border:1px solid ${used ? '#e5e7eb' : tier.border};
                   text-decoration:${used ? 'line-through' : 'none'};"
            title="${used ? 'Already exists' : `Add ${p}`}">
            ${p}${used ? ' ✓' : ''}
          </button>`;
        }).join('')}
      </div>`;
  };

  /* ── TIER DESCRIPTION HELPER ── */
  const renderTierDesc = () => {
    const container = document.getElementById('tier-desc');
    if (!container) return;
    const tier = CLASS_TIERS[activeLevel];
    if (!tier) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem;background:${tier.surface};border:1px solid ${tier.border};border-radius:8px;padding:.55rem .85rem;font-size:.82rem;color:${tier.text};">
        <span style="font-size:1.1rem;">${tier.icon}</span>
        <span><strong>${activeLevel}</strong> — ${tier.ageRange}</span>
      </div>`;
  };

  /* ── Expose arm helpers globally (inline onclick) ── */
  window.removeArmChip = (a) => { modalArms = modalArms.filter(x => x !== a); renderArmChips(); renderArmPresets(); };
  window.toggleAddArmInput = () => {
    const el = document.getElementById('add-arm-inline');
    el.style.display = el.style.display === 'none' ? 'inline-flex' : 'none';
    if (el.style.display !== 'none') document.getElementById('new-arm-input')?.focus();
  };
  window.addArmFromInput = () => {
    const val = (document.getElementById('new-arm-input')?.value || '').trim().toUpperCase();
    if (!val) return;
    if (modalArms.includes(val)) { toast(`Arm "${val}" already exists.`, 'warning'); return; }
    modalArms.push(val);
    document.getElementById('new-arm-input').value = '';
    document.getElementById('add-arm-inline').style.display = 'none';
    renderArmChips();
    renderArmPresets();
  };
  window.quickAddArm = (a) => {
    if (modalArms.includes(a)) {
      modalArms = modalArms.filter(x => x !== a);
    } else {
      modalArms.push(a);
    }
    renderArmChips();
    renderArmPresets();
  };
  window.fillClassName = (name) => {
    const inp = document.getElementById('cls-name');
    if (inp) { inp.value = name; }
  };

  /* ── MODAL HTML ── */
  showModal(`
    <div style="min-width:360px;max-width:520px;">
      <h3 style="margin:0 0 1.25rem;font-size:1.1rem;">
        ${isEdit ? `✏ Edit Class — ${cls.name}` : '➕ Add New Class'}
      </h3>
      <form id="class-form">

        <!-- Level / Tier selector -->
        <label style="${labelStyle()}">School Level / Tier <span style="color:#ef4444;">*</span></label>
        <div id="level-tiles" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:.5rem;margin-bottom:.75rem;">
          ${TIER_ORDER.map(tier => {
            const t = CLASS_TIERS[tier];
            const sel = activeLevel === tier;
            return `
              <button type="button" data-level="${tier}" onclick="selectTierTile('${tier}')"
                style="padding:.5rem .4rem;border-radius:10px;border:2px solid ${sel ? t.color : t.border};
                       background:${sel ? t.color : t.surface};color:${sel ? '#fff' : t.text};
                       cursor:pointer;font-size:.75rem;font-weight:700;text-align:center;
                       transition:all .15s;line-height:1.4;">
                <div style="font-size:1.3rem;">${t.icon}</div>
                ${tier}
              </button>`;
          }).join('')}
        </div>
        <div id="tier-desc" style="margin-bottom:1rem;"></div>

        <!-- Class name -->
        <label style="${labelStyle()}">Class Name <span style="color:#ef4444;">*</span></label>
        <input id="cls-name" value="${cls?.name || ''}" placeholder="e.g. Primary 3, JSS 1, Creche…"
          style="${inputStyle()}" required autocomplete="off">
        <div id="class-presets" style="margin-top:.4rem;margin-bottom:.25rem;"></div>
        <div id="cls-name-error" style="color:#ef4444;font-size:.8rem;margin-top:.25rem;display:none;"></div>

        <!-- Arms -->
        <label style="${labelStyle()};margin-top:.9rem;">Arms / Sections</label>
        <div id="arm-chips" style="display:flex;flex-wrap:wrap;align-items:center;gap:.25rem;padding:.5rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;min-height:46px;"></div>

        <div style="margin-top:.5rem;">
          <div style="font-size:.75rem;color:#9ca3af;margin-bottom:.3rem;">Quick-add arms:</div>
          <div id="arm-presets" style="display:flex;flex-wrap:wrap;gap:.35rem;"></div>
        </div>
        <p style="font-size:.75rem;color:#9ca3af;margin:.4rem 0 0;">At least one arm is required. Click to toggle.</p>

        <!-- Actions -->
        <div style="display:flex;gap:.75rem;margin-top:1.75rem;justify-content:flex-end;">
          <button type="button" onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
          <button type="submit" style="${btnStyle('primary')}">${isEdit ? '💾 Save Changes' : '✅ Add Class'}</button>
        </div>
      </form>
    </div>`);

  /* ── Tier tile switch (must be global for onclick) ── */
  window.selectTierTile = function(tier) {
    activeLevel = tier;

    // Visually update tiles
    document.querySelectorAll('#level-tiles button').forEach(btn => {
      const t   = CLASS_TIERS[btn.dataset.level];
      const sel = btn.dataset.level === tier;
      btn.style.borderColor  = sel ? t.color : t.border;
      btn.style.background   = sel ? t.color : t.surface;
      btn.style.color        = sel ? '#fff'  : t.text;
    });

    // If switching tier and not editing, pre-fill arm suggestions
    if (!isEdit && modalArms.length === 0) {
      modalArms = [...(CLASS_TIERS[tier]?.armSuggestions?.slice(0, 3) || ['A','B','C'])];
    }

    renderTierDesc();
    renderArmChips();
    renderArmPresets();
    renderClassPresets();
  };

  /* Initialise rendered sub-components */
  renderTierDesc();
  renderArmChips();
  renderArmPresets();
  renderClassPresets();

  /* ── Form default arms for new class ── */
  if (!isEdit && modalArms.length === 0) {
    modalArms = [...(CLASS_TIERS[activeLevel]?.armSuggestions?.slice(0, 3) || ['A','B','C'])];
    renderArmChips();
    renderArmPresets();
  }

  /* ── Form submit ── */
  document.getElementById('class-form').onsubmit = async (e) => {
    e.preventDefault();
    const name    = document.getElementById('cls-name').value.trim();
    const level   = activeLevel;
    const nameErr = document.getElementById('cls-name-error');

    if (!name) {
      nameErr.textContent = 'Class name is required.';
      nameErr.style.display = '';
      document.getElementById('cls-name').focus();
      return;
    }

    const duplicate = (App.data.classes || []).find(
      c => c.name.toLowerCase() === name.toLowerCase() && c.id !== cls?.id
    );
    if (duplicate) {
      nameErr.textContent = `A class named "${duplicate.name}" already exists (${duplicate.level}).`;
      nameErr.style.display = '';
      document.getElementById('cls-name').focus();
      return;
    }
    nameErr.style.display = 'none';

    if (modalArms.length === 0) {
      toast('Add at least one arm.', 'error');
      return;
    }

    try {
      if (isEdit) {
        const oldName = cls.name;
        // Call API using class NAME (not numeric id) as the key
        await Classes.update(oldName, { name, level });
        // Sync arms: post new set
        await Classes.addArm(name, { arms: modalArms }).catch(() => {});

        Object.assign(cls, { name, level, arms: [...modalArms] });
        if (oldName !== name) {
          (App.data.students || []).forEach(s => { if (s.class === oldName) s.class = name; });
          (App.data.teachers || []).forEach(t => { if (t.assignedClass === oldName) t.assignedClass = name; });
        }
        closeModal();
        renderClasses();
        setTimeout(() => {
          const row = document.getElementById(`class-row-${cls.id}`);
          if (row) {
            row.style.transition = 'background .15s';
            row.style.background = CLASS_TIERS[level]?.surface || '#d1fae5';
            setTimeout(() => { row.style.background = ''; }, 1500);
          }
        }, 80);
        toast('Class updated!', 'success');
      } else {
        // Create via API — response gives us the real DB id
        const resp = await Classes.create({ name, level, arms: modalArms });
        const saved = resp.data || resp;
        const newCls = { id: saved.id || Date.now(), name: saved.name || name, level: saved.level || level, arms: [...modalArms] };
        App.data.classes = App.data.classes || [];
        App.data.classes.push(newCls);
        closeModal();
        renderClasses();
        toast(`${CLASS_TIERS[level]?.icon || ''} ${name} added!`, 'success');
      }
    } catch (err) {
      toast('Error saving class: ' + (err.message || 'Unknown error'), 'error');
    }
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   8. CLASS ARMS  (Admin only)

   Improvements over original:
   ✦ Summary stats bar (total arms, avg size, largest arm, empty arms)
   ✦ Empty-state when no classes exist
   ✦ Per-class collapse / expand toggle
   ✦ Arm cards show: student count, teacher assignments, capacity bar
   ✦ Add arm: duplicate check, auto-uppercase, multi-add support
   ✦ Rename arm: updates all student + teacher records
   ✦ Delete arm: blocked if students enrolled; warns if teachers assigned
   ✦ Move Students: reassign all students from one arm to another in one click
   ✦ Reorder arms: drag handle or ▲▼ buttons (no external dep)
   ✦ View Students: quick popover listing enrolled students
   ✦ Fixtures: generateArmFixtures() seeds realistic starter data
─────────────────────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════════
   FORMER STUDENTS & FORMER STAFF  (Archive)
═══════════════════════════════════════════════════════════════════ */

async function renderFormerStudents() {
  const section = document.getElementById('former-students');
  if (!section) return;

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
      <div>
        <h2 style="margin:0 0 .2rem;color:#1e3a5f;">🎓 Former Students</h2>
        <p style="margin:0;font-size:.875rem;color:#6b7280;">Students who have left, graduated, or been removed from the school.</p>
      </div>
      <button onclick="renderFormerStudents()" style="${btnStyle('secondary')}">🔄 Refresh</button>
    </div>
    <div id="fs-loading" style="text-align:center;padding:3rem;color:#9ca3af;">Loading…</div>`;

  try {
    // Merge backend records + any local fallback records
    let students = [];
    try {
      const resp = await Archive.getStudents({ limit: 2000 });
      students   = resp.data || resp || [];
    } catch(apiErr) {
      console.warn('[FormerStudents] API failed:', apiErr.message);
    }
    // Also include locally archived students (fallback)
    const local = (App.data.archivedStudents || []).filter(
      loc => !students.some(s => s.id === loc.id)
    );
    students = [...students, ...local];

    const loadingEl = document.getElementById('fs-loading');
    if (!loadingEl) return;

    if (!students.length) {
      loadingEl.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:4rem;text-align:center;color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">
          <div style="font-size:3rem;margin-bottom:.75rem;">🎓</div>
          <h3 style="margin:0 0 .4rem;color:#374151;">No Former Students Yet</h3>
          <p style="margin:0;font-size:.875rem;">When students graduate, leave, or are removed they will appear here.</p>
        </div>`;
      return;
    }

    // ── Summarize by archive type ───────────────────────────────────────────
    const typeCounts = {};
    students.forEach(s => {
      const t = s.archive_type || s.reason || 'Other';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const typeColorMap = {
      'Graduated':      { bg:'#dcfce7', color:'#166534', border:'#86efac' },
      'Withdrawn':      { bg:'#fef3c7', color:'#92400e', border:'#fcd34d' },
      'Transferred':    { bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' },
      'Transferred Out':{ bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' },
      'Expelled':       { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' },
      'Suspended':      { bg:'#ffedd5', color:'#9a3412', border:'#fdba74' },
      'Medical Leave':  { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
      'Deceased':       { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' },
      'Administrative': { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd' },
    };
    function typeStyle(type) {
      const c = typeColorMap[type] || { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' };
      return `background:${c.bg};color:${c.color};border:1px solid ${c.border};padding:2px 8px;border-radius:5px;font-size:.75rem;font-weight:700;white-space:nowrap;`;
    }

    const allTypes = ['All', ...Object.keys(typeCounts).sort()];

    loadingEl.outerHTML = `
      <!-- Stats strip -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.75rem;margin-bottom:1.5rem;">
        <div style="background:#fff;border-radius:10px;padding:.9rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid #7c3aed;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#7c3aed;">${students.length}</div>
          <div style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Total Archived</div>
        </div>
        ${Object.entries(typeCounts).map(([type, count]) => {
          const c = typeColorMap[type] || { color:'#374151', border:'#d1d5db' };
          return `<div style="background:#fff;border-radius:10px;padding:.9rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid ${c.border};text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:${c.color};">${count}</div>
            <div style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${type}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Search & Filter bar -->
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;">
        <input id="fs-search" type="search" placeholder="🔍 Search name or ID…"
          style="border:1px solid #d1d5db;border-radius:8px;padding:.5rem .85rem;font-size:.875rem;flex:1;min-width:180px;outline:none;"
          oninput="filterFormerStudents()" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#d1d5db'">
        <select id="fs-type-filter" onchange="filterFormerStudents()"
          style="border:1px solid #d1d5db;border-radius:8px;padding:.5rem .85rem;font-size:.875rem;outline:none;background:#fff;">
          ${allTypes.map(t => `<option value="${t}">${t === 'All' ? '— All Types —' : t} ${t !== 'All' ? '('+typeCounts[t]+')' : ''}</option>`).join('')}
        </select>
        <select id="fs-year-filter" onchange="filterFormerStudents()"
          style="border:1px solid #d1d5db;border-radius:8px;padding:.5rem .85rem;font-size:.875rem;outline:none;background:#fff;">
          <option value="">— All Years —</option>
          ${[...new Set(students.map(s => s.archived_at ? new Date(s.archived_at).getFullYear() : null).filter(Boolean))].sort().reverse()
              .map(y => `<option value="${y}">${y}</option>`).join('')}
        </select>
      </div>

      <!-- Table -->
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
        <table id="fs-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:.75rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Student</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Last Class</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Archive Type</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Reason</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Session</th>
              <th style="padding:.75rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Date</th>
              ${priv.isAdmin() ? `<th style="padding:.75rem 1rem;text-align:center;font-size:.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;">Actions</th>` : ''}
            </tr>
          </thead>
          <tbody id="fs-tbody">
            ${buildFormerStudentRows(students, priv.isAdmin())}
          </tbody>
        </table>
        <div id="fs-empty" style="display:none;padding:2.5rem;text-align:center;color:#9ca3af;font-size:.9rem;">No records match your search.</div>
      </div>`;

    // Store for filtering
    window._fsAllStudents = students;

  } catch(e) {
    const el = document.getElementById('fs-loading');
    if (el) el.innerHTML = `<p style="color:#ef4444;padding:1rem;">Error loading archive: ${e.message}</p>`;
  }
}

function buildFormerStudentRows(students, isAdmin) {
  if (!students.length) return '';
  const typeColorMap = {
    'Graduated':       { bg:'#dcfce7', color:'#166534', border:'#86efac' },
    'Withdrawn':       { bg:'#fef3c7', color:'#92400e', border:'#fcd34d' },
    'Transferred':     { bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' },
    'Transferred Out': { bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' },
    'Expelled':        { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' },
    'Suspended':       { bg:'#ffedd5', color:'#9a3412', border:'#fdba74' },
    'Medical Leave':   { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
    'Deceased':        { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' },
    'Administrative':  { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd' },
    'Sponsored Away':  { bg:'#fdf4ff', color:'#7e22ce', border:'#d8b4fe' },
  };
  function typeStyle(type) {
    const c = typeColorMap[type] || { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' };
    return `background:${c.bg};color:${c.color};border:1px solid ${c.border};padding:2px 8px;border-radius:5px;font-size:.75rem;font-weight:700;white-space:nowrap;`;
  }
  return students.map(s => {
    const archiveType = s.archive_type || s.reason || '—';
    const notes       = s.notes || (s.archive_reason && s.archive_reason.includes(' — ') ? s.archive_reason.split(' — ').slice(1).join(' — ').trim() : '') || s.archive_reason || '';
    const lastClass   = (s.last_class || s.class_name || s.class || '—') + ' ' + (s.last_arm || s.arm || '');
    const sessionStr  = s.session || '—';
    const dateStr     = s.archived_at ? new Date(s.archived_at).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' }) : (s.effective_date || '—');
    const initials    = (s.name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    const colors      = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
    const avatarColor = colors[(s.id||'').charCodeAt(0) % colors.length] || '#6b7280';

    return `<tr style="border-bottom:1px solid #f3f4f6;transition:background .15s;" data-name="${(s.name||'').toLowerCase()}" data-id="${(s.id||'').toLowerCase()}" data-type="${archiveType}" data-year="${s.archived_at?new Date(s.archived_at).getFullYear():''}"
      onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
      <td style="padding:.7rem 1rem;">
        <div style="display:flex;align-items:center;gap:.65rem;">
          <div style="width:34px;height:34px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:.78rem;font-weight:700;flex-shrink:0;">${initials}</div>
          <div>
            <div style="font-weight:700;font-size:.9rem;color:#111;">${s.name || '—'}</div>
            <div style="font-size:.72rem;color:#9ca3af;">${s.id || ''}</div>
          </div>
        </div>
      </td>
      <td style="padding:.7rem 1rem;font-size:.85rem;color:#374151;white-space:nowrap;">${lastClass.trim()}</td>
      <td style="padding:.7rem 1rem;"><span style="${typeStyle(archiveType)}">${archiveType}</span></td>
      <td style="padding:.7rem 1rem;font-size:.82rem;color:#374151;max-width:260px;">
        ${notes
          ? `<div style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;" title="${notes.replace(/"/g,'&quot;')}">${notes}</div>`
          : `<span style="color:#d1d5db;font-style:italic;">—</span>`}
      </td>
      <td style="padding:.7rem 1rem;font-size:.82rem;color:#6b7280;white-space:nowrap;">${sessionStr}</td>
      <td style="padding:.7rem 1rem;font-size:.78rem;color:#9ca3af;white-space:nowrap;">${dateStr}</td>
      ${isAdmin ? `
        <td style="padding:.7rem 1rem;text-align:center;white-space:nowrap;">
          <button onclick="viewArchivedStudentDetail('${s.id}')" style="${btnStyle('info','sm')}" title="View full record">👁 View</button>
          <button onclick="restoreArchivedStudent('${s.id}')" style="${btnStyle('success','sm')}" title="Restore to active class">↩ Restore</button>
        </td>` : ''}
    </tr>`;
  }).join('');
}


window.filterFormerStudents = function() {
  const q        = (document.getElementById('fs-search')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('fs-type-filter')?.value || 'All';
  const yearFilter = document.getElementById('fs-year-filter')?.value || '';
  const all = window._fsAllStudents || [];

  const filtered = all.filter(s => {
    const archiveType = s.archive_type || s.reason || '—';
    const matchQ    = !q || (s.name||'').toLowerCase().includes(q) || (s.id||'').toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || archiveType === typeFilter;
    const matchYear = !yearFilter || (s.archived_at && new Date(s.archived_at).getFullYear() == yearFilter);
    return matchQ && matchType && matchYear;
  });

  const tbody = document.getElementById('fs-tbody');
  const empty = document.getElementById('fs-empty');
  if (tbody) tbody.innerHTML = buildFormerStudentRows(filtered, priv.isAdmin());
  if (empty) empty.style.display = filtered.length ? 'none' : 'block';
};

window.viewArchivedStudentDetail = function(id) {
  const all = window._fsAllStudents || [];
  const s   = all.find(x => x.id === id);
  if (!s) return;
  const archiveType = s.archive_type || s.reason || '—';
  const notes       = s.notes || (s.archive_reason && s.archive_reason.includes(' — ') ? s.archive_reason.split(' — ').slice(1).join(' — ').trim() : '') || s.archive_reason || '—';
  const lastClass   = s.last_class || s.class_name || s.class || '—';
  const lastArm     = s.last_arm   || s.arm || '';
  const session     = s.session || '—';
  const resCount    = (App.data.results || []).filter(r => r.studentId === id).length;
  const terms       = [...new Set((App.data.results || []).filter(r => r.studentId === id).map(r => r.term))];

  const typeColorMap = {
    'Graduated':       { bg:'#dcfce7', color:'#166534', border:'#86efac' },
    'Withdrawn':       { bg:'#fef3c7', color:'#92400e', border:'#fcd34d' },
    'Transferred':     { bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' },
    'Transferred Out': { bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' },
    'Expelled':        { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' },
    'Suspended':       { bg:'#ffedd5', color:'#9a3412', border:'#fdba74' },
    'Medical Leave':   { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
    'Deceased':        { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' },
    'Administrative':  { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd' },
    'Sponsored Away':  { bg:'#fdf4ff', color:'#7e22ce', border:'#d8b4fe' },
  };
  const tc = typeColorMap[archiveType] || { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' };

  showModal(`
    <div style="max-width:480px;">
      <div style="display:flex;align-items:center;gap:.85rem;margin-bottom:1.25rem;">
        <div style="width:52px;height:52px;border-radius:50%;background:${tc.bg};display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;border:2px solid ${tc.border};">
          ${archiveType==='Graduated'?'🎓':archiveType==='Expelled'?'🚫':archiveType==='Deceased'?'✝':'📦'}
        </div>
        <div>
          <h3 style="margin:0 0 .15rem;color:#111;">${s.name || '—'}</h3>
          <p style="margin:0;font-size:.875rem;color:#6b7280;">${lastClass} ${lastArm} · ID: ${s.id}</p>
        </div>
        <span style="margin-left:auto;background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};padding:3px 10px;border-radius:6px;font-size:.78rem;font-weight:700;white-space:nowrap;">${archiveType}</span>
      </div>

      <div style="background:#fff8f0;border:1.5px solid #fcd34d;border-radius:10px;padding:.85rem 1rem;margin-bottom:1.25rem;">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#92400e;margin-bottom:.35rem;">📋 Archive Reason</div>
        <div style="font-size:.9rem;color:#374151;line-height:1.55;">${notes !== '—' ? notes : '<em style="color:#9ca3af;">No detailed reason recorded.</em>'}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;font-size:.85rem;margin-bottom:1.25rem;">
        ${[
          ['Gender',           s.gender || '—'],
          ['Academic Session', session],
          ['Last Class',       (lastClass + ' ' + lastArm).trim()],
          ['Effective Date',   s.effective_date || '—'],
          ['Archived By',      s.archived_by || '—'],
          ['Archived At',      s.archived_at ? new Date(s.archived_at).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'}) : '—'],
        ].map(([k,v]) => `
          <div style="background:#f8fafc;border-radius:7px;padding:.6rem .75rem;">
            <div style="font-size:.7rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem;">${k}</div>
            <div style="font-weight:600;color:#374151;">${v}</div>
          </div>`).join('')}
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:.75rem 1rem;margin-bottom:1.5rem;font-size:.85rem;color:#0c4a6e;">
        📊 <strong>${resCount}</strong> result record(s) on file
        ${terms.length ? '— Terms: ' + terms.join(', ') : ''}
        ${resCount === 0 ? '<br><span style="color:#9ca3af;font-size:.78rem;">No academic results linked to this student.</span>' : ''}
      </div>

      <div style="display:flex;gap:.75rem;justify-content:flex-end;flex-wrap:wrap;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Close</button>
        ${priv.isAdmin() ? `<button onclick="closeModal();restoreArchivedStudent('${s.id}')" style="${btnStyle('success')}">↩ Restore to Active</button>` : ''}
      </div>
    </div>`);
};

window.restoreArchivedStudent = function(id) {
  const all = window._fsAllStudents || [];
  const s   = all.find(x => x.id === id);
  const lastClass = s?.last_class || s?.class_name || s?.class || '';
  const lastArm   = s?.last_arm   || s?.arm || 'A';

  showModal(`
    <div style="max-width:420px;">
      <div style="display:flex;align-items:center;gap:.85rem;margin-bottom:1.25rem;">
        <div style="width:48px;height:48px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">↩</div>
        <div>
          <h3 style="margin:0 0 .15rem;color:#111;">Restore Student</h3>
          <p style="margin:0;font-size:.875rem;color:#6b7280;">${s?.name || id} will be moved back to active rolls.</p>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:.75rem 1rem;margin-bottom:1.25rem;font-size:.85rem;color:#166534;">
        ✅ The student and all linked result records will be restored. Choose which class &amp; arm to place them in.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
        <div>
          <label style="font-size:.8rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:.4rem;">Restore to Class</label>
          <select id="restore-class" style="${inputStyle()}" onchange="updateRestoreArms()">
            ${(App.data.classes || []).map(c => `<option ${c.name===lastClass?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:.8rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:.4rem;">Arm</label>
          <select id="restore-arm" style="${inputStyle()}">
            ${(() => {
              const c = (App.data.classes||[]).find(x=>x.name===lastClass);
              return (c?.arms||['A']).map(a=>`<option ${a===lastArm?'selected':''}>${a}</option>`).join('');
            })()}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="confirmRestoreArchivedStudent('${id}')" style="${btnStyle('success')}">↩ Restore</button>
      </div>
    </div>
  `);
};

window.updateRestoreArms = function() {
  const cls = document.getElementById('restore-class')?.value;
  const sel = document.getElementById('restore-arm');
  if (!sel || !cls) return;
  const c = (App.data.classes||[]).find(x=>x.name===cls);
  sel.innerHTML = (c?.arms||['A']).map(a=>`<option>${a}</option>`).join('');
};

window.confirmRestoreArchivedStudent = async function(id) {
  const cls = document.getElementById('restore-class')?.value;
  const arm = document.getElementById('restore-arm')?.value;
  closeModal();
  try {
    await Archive.restoreStudent(id, { class: cls, arm });
    try {
      const fresh = await Students.getAll({ limit: 2000 });
      App.data.students = fresh.data || App.data.students;
    } catch(_) {
      const local = App.data.archivedStudents || [];
      const rec   = local.find(x => x.id === id);
      if (rec) {
        const { archive_type, archive_reason, notes, effective_date, session, last_class, last_arm, archived_by, archived_at, ...studentData } = rec;
        studentData.class = cls || studentData.class;
        studentData.arm   = arm || studentData.arm;
        App.data.students.push(studentData);
        App.data.archivedStudents = local.filter(x => x.id !== id);
      }
    }
    saveAppData?.();
    toast('✅ Student restored to ' + cls + ' ' + arm + '.', 'success');
    renderFormerStudents();
  } catch(e) {
    toast('Error restoring: ' + e.message, 'error');
  }
};

async function renderFormerStaff() {
  const section = document.getElementById('former-staff');
  if (!section) return;
  section.innerHTML = `<h2 style="margin:0 0 1.5rem;">Former Staff</h2>
    <div id="fst-loading" style="text-align:center;padding:3rem;color:#9ca3af;">Loading…</div>`;
  try {
    const resp  = await Archive.getStaff();
    const staff = resp.data || [];
    if (!staff.length) {
      document.getElementById('fst-loading').innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">
          <div style="font-size:2.5rem;margin-bottom:.5rem;">👨‍🏫</div>
          <p style="margin:0;">No former staff in the archive.</p>
        </div>`;
      return;
    }
    document.getElementById('fst-loading').outerHTML = `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">NAME</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">SUBJECT</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">CLASS</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">REASON</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">DATE</th>
            ${priv.isAdmin() ? `<th style="padding:.75rem 1rem;text-align:center;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTIONS</th>` : ''}
          </tr></thead>
          <tbody>
            ${staff.map(s => `
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:.65rem 1rem;font-weight:600;">${s.name}</td>
                <td style="padding:.65rem 1rem;font-size:.82rem;">${s.subject || '—'}</td>
                <td style="padding:.65rem 1rem;font-size:.82rem;">${s.class_name || s.class || '—'} ${s.arm || ''}</td>
                <td style="padding:.65rem 1rem;font-size:.82rem;">${s.archive_reason || s.reason || '—'}</td>
                <td style="padding:.65rem 1rem;font-size:.78rem;color:#9ca3af;">${s.archived_at ? new Date(s.archived_at).toLocaleDateString('en-NG') : '—'}</td>
                ${priv.isAdmin() ? `
                  <td style="padding:.65rem 1rem;text-align:center;">
                    <button onclick="restoreArchivedStaff('${s.id}')" style="${btnStyle('success','sm')}">↩ Restore</button>
                  </td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    section.innerHTML += `<p style="color:#ef4444;padding:1rem;">Error: ${e.message}</p>`;
  }
}

window.restoreArchivedStaff = async function(id) {
  if (!confirmDlg('Restore this staff member to the active list?')) return;
  try {
    await Archive.restoreStaff(id);
    toast('Staff member restored!', 'success');
    renderFormerStaff();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};