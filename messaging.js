/**
 * messaging.js — Sacred Heart College Eziukwu Aba
 * Communications Centre — Admin only
 * ─────────────────────────────────────────────────
 * Four tabs:
 *   1. By Class    — send to all parents in a class/arm
 *   2. Individual  — search & pick specific students
 *   3. Applicants  — message prospective families
 *   4. Message Log — full send history
 *
 * No ES modules. Depends on: App, priv, API,
 *   toast(), btnStyle(), inputStyle(), labelStyle(),
 *   tableStyle(), thStyle(), tdStyle(), thRowStyle()
 */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
const MSG = {
  activeTab:        'class',
  selectedStudents: new Map(),   // id → {id, name, class, arm}
  previewCache:     {},
  sending:          false,
  previewTimer:     null,
};

/* ═══════════════════════════════════════════════════════════════
   ENTRY POINT
═══════════════════════════════════════════════════════════════ */
window.renderMessaging = function () {
  const section = document.getElementById('messaging');
  if (!section) return;

  if (!priv.isAdmin()) {
    section.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  min-height:320px;gap:1rem;text-align:center;">
        <div style="font-size:3.5rem;">🔒</div>
        <h3 style="color:#1e3a5f;margin:0;font-size:1.1rem;">Admin Access Only</h3>
        <p style="color:#6b7280;margin:0;font-size:.875rem;max-width:320px;">
          The Communications Centre is restricted to Administrators.
        </p>
      </div>`;
    return;
  }

  section.innerHTML = msgShell();
  msgLoadStatus();
  msgAutoPreview('class');
};

/* ── Full shell HTML ──────────────────────────────────────────── */
function msgShell() {
  const C   = TOKENS.color;
  const cls = (App.data.classes || [])
    .map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  return `
  <style>
    .msg-card {
      background:#fff;
      border-radius:14px;
      padding:1.5rem;
      box-shadow:0 2px 10px rgba(0,0,0,.07);
      margin-bottom:1.25rem;
    }
    .msg-tab-bar {
      display:flex;gap:.35rem;
      background:#f1f5f9;
      border-radius:10px;
      padding:.3rem;
      width:fit-content;
      flex-wrap:wrap;
      margin-bottom:1.5rem;
    }
    .msg-tab {
      padding:.45rem 1.05rem;
      border-radius:7px;
      font-size:.82rem;
      font-weight:500;
      cursor:pointer;
      border:none;
      background:transparent;
      color:#6b7280;
      transition:all .18s ease;
      white-space:nowrap;
    }
    .msg-tab.active {
      background:#1e3a5f;
      color:#fff;
      font-weight:600;
      box-shadow:0 2px 6px rgba(30,58,95,.3);
    }
    .msg-label {
      display:block;
      font-size:.78rem;
      font-weight:600;
      color:#374151;
      margin-bottom:.35rem;
      letter-spacing:.01em;
    }
    .msg-input, .msg-select, .msg-textarea {
      width:100%;
      padding:.55rem .85rem;
      border:1.5px solid #e5e7eb;
      border-radius:8px;
      font-size:.875rem;
      color:#111827;
      background:#fff;
      outline:none;
      transition:border-color .15s ease, box-shadow .15s ease;
      box-sizing:border-box;
    }
    .msg-input:focus, .msg-select:focus, .msg-textarea:focus {
      border-color:#1e3a5f;
      box-shadow:0 0 0 3px rgba(30,58,95,.12);
    }
    .msg-textarea { resize:vertical; min-height:130px; line-height:1.6; }
    .msg-chip {
      display:inline-flex;align-items:center;gap:.35rem;
      background:#eff6ff;color:#1d4ed8;
      border:1px solid #bfdbfe;
      border-radius:6px;
      padding:.18rem .6rem;
      font-size:.75rem;
      font-weight:500;
    }
    .msg-chip button {
      background:none;border:none;cursor:pointer;
      color:#6b7280;padding:0;font-size:.75rem;
      line-height:1;display:flex;align-items:center;
    }
    .msg-chip button:hover { color:#dc2626; }
    .msg-preview-bar {
      font-size:.8rem;
      min-height:1.6rem;
      padding:.35rem .65rem;
      border-radius:6px;
      background:#f8fafc;
      color:#6b7280;
      border:1px solid #f1f5f9;
      margin-bottom:.85rem;
      display:flex;align-items:center;gap:.5rem;
    }
    .msg-result {
      margin-top:.85rem;
      border-radius:10px;
      padding:.9rem 1.1rem;
      font-size:.84rem;
      display:none;
    }
    .msg-result.show { display:block; }
    .msg-result.success { background:#f0fdf4;border:1px solid #86efac;color:#166534; }
    .msg-result.warn    { background:#fffbeb;border:1px solid #fde68a;color:#92400e; }
    .msg-result.error   { background:#fef2f2;border:1px solid #fca5a5;color:#991b1b; }
    .msg-send-btn { position:relative; }
    .msg-send-btn .spinner {
      display:none;width:14px;height:14px;
      border:2px solid rgba(255,255,255,.35);
      border-top-color:#fff;border-radius:50%;
      animation:msg-spin .6s linear infinite;
      flex-shrink:0;
    }
    .msg-send-btn.sending .spinner { display:inline-block; }
    .msg-send-btn.sending .label   { display:none; }
    @keyframes msg-spin { to { transform:rotate(360deg); } }
    .msg-dropdown {
      display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;
      background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;
      box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:200;
      max-height:220px;overflow-y:auto;
    }
    .msg-dropdown-item {
      padding:.6rem .9rem;cursor:pointer;font-size:.83rem;
      border-bottom:1px solid #f3f4f6;transition:background .1s;
    }
    .msg-dropdown-item:last-child { border-bottom:none; }
    .msg-dropdown-item:hover { background:#eff6ff; }
    .msg-log-table { width:100%;border-collapse:collapse; }
    .msg-log-table th {
      padding:.55rem .9rem;background:#1e3a5f;color:#fff;
      font-size:.75rem;text-align:left;font-weight:600;
    }
    .msg-log-table td {
      padding:.55rem .9rem;border-bottom:1px solid #f1f5f9;
      font-size:.82rem;vertical-align:middle;
    }
    .msg-log-table tr:hover td { background:#f8fafc; }
    .msg-badge {
      display:inline-block;padding:.1rem .55rem;border-radius:4px;
      font-size:.72rem;font-weight:700;
    }
    .msg-grid2 { display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem; }
    @media(max-width:480px){ .msg-grid2 { grid-template-columns:1fr; } }
  </style>

  <div style="padding:1.5rem 0;">

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;
                flex-wrap:wrap;gap:.75rem;margin-bottom:1.25rem;">
      <div>
        <h2 style="margin:0 0 .2rem;color:#1e3a5f;font-size:1.2rem;font-weight:800;
                   letter-spacing:-.02em;">📨 Communications Centre</h2>
        <p style="margin:0;color:#6b7280;font-size:.82rem;">
          Send emails to parents, guardians, and prospective families
        </p>
      </div>
      <button onclick="msgLoadStatus(true)"
        style="background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:8px;
               padding:.4rem .85rem;font-size:.78rem;cursor:pointer;color:#374151;
               display:flex;align-items:center;gap:.4rem;">
        ⚙️ Email Status
      </button>
    </div>

    <!-- Status banner -->
    <div id="msg-status-banner" style="margin-bottom:1.1rem;"></div>

    <!-- Tab bar -->
    <div class="msg-tab-bar">
      <button class="msg-tab active" id="msg-tab-class"
        onclick="msgSwitchTab('class')">🏫 By Class</button>
      <button class="msg-tab" id="msg-tab-individual"
        onclick="msgSwitchTab('individual')">👤 Individual</button>
      <button class="msg-tab" id="msg-tab-applicants"
        onclick="msgSwitchTab('applicants')">📋 Applicants</button>
      <button class="msg-tab" id="msg-tab-log"
        onclick="msgSwitchTab('log')">📜 Message Log</button>
    </div>

    <!-- ══════════════ TAB: BY CLASS ══════════════ -->
    <div id="msg-panel-class">

      <div class="msg-card">
        <div style="font-weight:700;font-size:.9rem;color:#1e3a5f;margin-bottom:1rem;
                    display:flex;align-items:center;gap:.5rem;">
          🏫 Select Recipients
        </div>

        <div class="msg-grid2">
          <div>
            <label class="msg-label">Class</label>
            <select class="msg-select" id="msg-cls-class"
              onchange="msgArmOptions('msg-cls-arm','msg-cls-class');msgAutoPreview('class')">
              <option value="">All Classes</option>
              ${cls}
            </select>
          </div>
          <div>
            <label class="msg-label">Arm <span style="font-weight:400;color:#9ca3af;">(all arms if blank)</span></label>
            <select class="msg-select" id="msg-cls-arm"
              onchange="msgAutoPreview('class')">
              <option value="">All Arms</option>
              <option>A</option><option>B</option>
              <option>C</option><option>D</option>
            </select>
          </div>
        </div>

        <div id="msg-class-preview" class="msg-preview-bar">
          <span id="msg-class-preview-text">Select a class to preview recipients…</span>
        </div>
      </div>

      ${msgComposeCard('class')}
    </div>

    <!-- ══════════════ TAB: INDIVIDUAL ══════════════ -->
    <div id="msg-panel-individual" style="display:none;">

      <div class="msg-card">
        <div style="font-weight:700;font-size:.9rem;color:#1e3a5f;margin-bottom:1rem;">
          👤 Search &amp; Select Students
        </div>

        <label class="msg-label">Search by name or student ID</label>
        <div style="position:relative;">
          <input class="msg-input" id="msg-ind-search"
            placeholder="e.g. Okonkwo Chukwuemeka or SHC/001…"
            oninput="msgSearch(this.value)"
            autocomplete="off">
          <div class="msg-dropdown" id="msg-ind-dropdown"></div>
        </div>

        <div id="msg-ind-chips"
          style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.75rem;
                 min-height:28px;padding:.1rem 0;">
          <span style="color:#9ca3af;font-size:.78rem;font-style:italic;">
            No students selected — search above
          </span>
        </div>

        <div id="msg-individual-preview" class="msg-preview-bar" style="margin-top:.75rem;">
          <span>0 students selected</span>
        </div>
      </div>

      ${msgComposeCard('individual')}
    </div>

    <!-- ══════════════ TAB: APPLICANTS ══════════════ -->
    <div id="msg-panel-applicants" style="display:none;">

      <div class="msg-card">
        <div style="font-weight:700;font-size:.9rem;color:#1e3a5f;margin-bottom:1rem;">
          📋 Select Applicants
        </div>

        <div style="max-width:280px;margin-bottom:.85rem;">
          <label class="msg-label">Applicant Status</label>
          <select class="msg-select" id="msg-app-status"
            onchange="msgAutoPreview('applicants')">
            <option value="Pending">Pending — awaiting review</option>
            <option value="Approved">Approved — accepted applicants</option>
            <option value="Rejected">Rejected applicants</option>
            <option value="All">All applicants</option>
          </select>
        </div>

        <div id="msg-applicants-preview" class="msg-preview-bar">
          <span id="msg-applicants-preview-text">Loading applicant count…</span>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
                    padding:.65rem 1rem;font-size:.8rem;color:#92400e;display:flex;
                    align-items:flex-start;gap:.5rem;">
          <span>💡</span>
          <span>Messages go to the <strong>parent email</strong> provided on the application form.
          Applicants without an email address will be skipped.</span>
        </div>
      </div>

      ${msgComposeCard('applicants')}
    </div>

    <!-- ══════════════ TAB: LOG ══════════════ -->
    <div id="msg-panel-log" style="display:none;">
      <div class="msg-card">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
          <div style="font-weight:700;font-size:.9rem;color:#1e3a5f;">📜 Message History</div>
          <div style="display:flex;gap:.5rem;align-items:center;">
            <input class="msg-input" id="msg-log-search" placeholder="Filter by subject or recipient…"
              style="max-width:220px;padding:.4rem .7rem;font-size:.78rem;"
              oninput="msgFilterLog(this.value)">
            <button onclick="msgLoadLog()"
              style="${btnStyle('secondary','sm')}">🔄 Refresh</button>
          </div>
        </div>
        <div id="msg-log-body">
          <div style="text-align:center;padding:2.5rem;color:#9ca3af;font-size:.875rem;">
            Click Refresh to load message history
          </div>
        </div>
      </div>
    </div>

  </div>`;
}

/* ── Compose card (shared by all three send tabs) ─────────────── */
function msgComposeCard(type) {
  const ph = {
    class:      'e.g. Second Term Resumption — Monday 13th January at 8:00am sharp.',
    individual: 'e.g. Please be informed that your ward\u2019s report card is ready for collection.',
    applicants: 'e.g. We are pleased to inform you that admissions are now open for the 2025/2026 session…',
  }[type] || '';

  const subjectPh = {
    class:      'e.g. Important Notice — Second Term Resumption',
    individual: 'e.g. Report Card Collection Notice',
    applicants: 'e.g. Admissions Update — Sacred Heart College',
  }[type] || '';

  return `
  <div class="msg-card">
    <div style="font-weight:700;font-size:.9rem;color:#1e3a5f;margin-bottom:1rem;
                display:flex;align-items:center;gap:.5rem;">
      ✍️ Compose Message
    </div>

    <div style="margin-bottom:.85rem;">
      <label class="msg-label">Subject *</label>
      <input class="msg-input" id="msg-${type}-subject"
        placeholder="${subjectPh}">
    </div>

    <div style="margin-bottom:.85rem;">
      <label class="msg-label">Message Body *</label>
      <textarea class="msg-textarea" id="msg-${type}-body"
        placeholder="${ph}"
        rows="6"></textarea>
      <div style="font-size:.72rem;color:#9ca3af;margin-top:.3rem;">
        Line breaks are preserved. The school header and principal signature are added automatically.
        Recipient's name is personalised on each email.
      </div>
    </div>

    <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
      <button class="msg-send-btn" id="msg-${type}-btn"
        onclick="msgSend('${type}')"
        style="${btnStyle('primary')}">
        <span class="spinner"></span>
        <span class="label">📨 Send Emails</span>
      </button>
      <button onclick="msgPreview('${type}')"
        style="${btnStyle('secondary','sm')}">
        👁 Preview Recipients
      </button>
      <button onclick="msgClear('${type}')"
        style="${btnStyle('ghost','sm')}">
        🗑 Clear
      </button>
    </div>

    <div class="msg-result" id="msg-${type}-result"></div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════════════════════ */
window.msgSwitchTab = function (tab) {
  MSG.activeTab = tab;
  ['class','individual','applicants','log'].forEach(t => {
    const panel = document.getElementById(`msg-panel-${t}`);
    const btn   = document.getElementById(`msg-tab-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.classList.toggle('active', t === tab);
  });
  if (tab === 'log')        { msgLoadLog(); return; }
  if (tab === 'applicants') { msgAutoPreview('applicants'); }
};

/* ═══════════════════════════════════════════════════════════════
   ARM OPTIONS (populate based on selected class)
═══════════════════════════════════════════════════════════════ */
window.msgArmOptions = function (armId, clsId) {
  const clsName = document.getElementById(clsId)?.value;
  const armSel  = document.getElementById(armId);
  if (!armSel) return;
  const cls  = (App.data.classes || []).find(c => c.name === clsName);
  const arms = cls?.arms || ['A','B','C','D'];
  armSel.innerHTML = '<option value="">All Arms</option>' +
    arms.map(a => `<option>${a}</option>`).join('');
};

/* ═══════════════════════════════════════════════════════════════
   EMAIL STATUS BANNER
═══════════════════════════════════════════════════════════════ */
async function msgLoadStatus(forceShow = false) {
  const banner = document.getElementById('msg-status-banner');
  if (!banner) return;
  try {
    const resp = await API._get('/messaging/status');
    const d    = resp?.data || {};
    if (!d.configured) {
      banner.innerHTML = `
        <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;
                    padding:.85rem 1.1rem;font-size:.82rem;color:#9a3412;
                    display:flex;align-items:flex-start;gap:.75rem;">
          <span style="font-size:1.2rem;flex-shrink:0;">⚠️</span>
          <div>
            <strong>Email not configured.</strong>
            Add <code style="background:#fde68a;padding:0 4px;border-radius:3px;">EMAIL_USER</code>,
            <code style="background:#fde68a;padding:0 4px;border-radius:3px;">EMAIL_PASS</code>
            and <code style="background:#fde68a;padding:0 4px;border-radius:3px;">EMAIL_ENABLED=true</code>
            to your Render environment variables.
            <a href="https://docs.render.com/configure-environment-variables" target="_blank"
               style="color:#c2410c;font-weight:600;">Render docs →</a>
          </div>
        </div>`;
    } else if (!d.enabled) {
      banner.innerHTML = `
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;
                    padding:.75rem 1.1rem;font-size:.82rem;color:#92400e;">
          ⚠️ Email is configured but <code>EMAIL_ENABLED</code> is not <code>true</code>.
          Messages will be <strong>logged but not sent</strong> until you enable it.
        </div>`;
    } else {
      banner.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;
                    padding:.65rem 1.1rem;font-size:.82rem;color:#166534;
                    display:flex;align-items:center;gap:.5rem;">
          <span>✅</span>
          <span>Email active via <strong>${d.emailHost || 'smtp.gmail.com'}</strong>
            · sending as <strong>${d.emailUser || 'configured'}</strong></span>
        </div>`;
    }
  } catch(e) {
    if (forceShow) banner.innerHTML = `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;
                  padding:.65rem 1.1rem;font-size:.82rem;color:#991b1b;">
        ❌ Could not reach server to check email status.
      </div>`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   PREVIEW RECIPIENTS
═══════════════════════════════════════════════════════════════ */
window.msgPreview = async function (type) {
  await _doPreview(type, true);
};

window.msgAutoPreview = function (type) {
  clearTimeout(MSG.previewTimer);
  MSG.previewTimer = setTimeout(() => _doPreview(type, false), 500);
};

async function _doPreview(type, forceShow) {
  const el = document.getElementById(
    type === 'class' ? 'msg-class-preview-text' :
    type === 'individual' ? null :
    'msg-applicants-preview-text'
  );

  if (el) el.textContent = 'Checking…';

  const params = { type };
  if (type === 'class') {
    params.classFilter = document.getElementById('msg-cls-class')?.value || '';
    params.armFilter   = document.getElementById('msg-cls-arm')?.value   || '';
  } else if (type === 'applicants') {
    params.applicantStatus = document.getElementById('msg-app-status')?.value || 'Pending';
  } else if (type === 'individual') {
    if (!MSG.selectedStudents.size) {
      const p = document.getElementById('msg-individual-preview');
      if (p) p.innerHTML = '<span>0 students selected</span>';
      return;
    }
    const p = document.getElementById('msg-individual-preview');
    if (p) p.innerHTML = `<span style="color:#1e3a5f;font-weight:600;">
      ${MSG.selectedStudents.size} student${MSG.selectedStudents.size>1?'s':''} selected
      </span><span style="color:#9ca3af;"> — emails sent to parent/guardian</span>`;
    MSG.previewCache.individual = MSG.selectedStudents.size;
    return;
  }

  try {
    const qs   = Object.entries(params)
      .filter(([,v]) => v)
      .map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const resp = await API._get('/messaging/preview?' + qs);
    const d    = resp?.data || {};

    MSG.previewCache[type] = d.withEmail || 0;

    const hasEmail    = d.withEmail    || 0;
    const noEmail     = d.withoutEmail || 0;
    const iconColor   = hasEmail === 0 ? '#dc2626' : noEmail > 0 ? '#d97706' : '#16a34a';
    const icon        = hasEmail === 0 ? '⚠' : noEmail > 0 ? '⚠' : '✓';
    const names       = (d.preview || []).slice(0,3)
      .map(r => r.studentName || r.name || r.email).join(', ');
    const moreCount   = (d.preview?.length || 0) - 3;

    const html = `
      <span style="color:${iconColor};font-weight:700;">${icon}</span>
      <span style="color:${iconColor};font-weight:600;">${hasEmail} recipient${hasEmail!==1?'s':''} with email</span>
      ${noEmail > 0
        ? `<span style="color:#9ca3af;"> · ${noEmail} skipped (no email)</span>`
        : ''}
      ${names
        ? `<span style="color:#9ca3af;"> — ${names}${moreCount > 0 ? ` +${moreCount} more` : ''}</span>`
        : ''}`;

    if (el) el.innerHTML = html;

    // Also update preview bar for class/applicants
    const bar = document.getElementById(`msg-${type}-preview`);
    if (bar && type !== 'class' && type !== 'applicants') {
      bar.innerHTML = html;
    }

  } catch(e) {
    if (el) el.textContent = 'Preview unavailable.';
  }
}

/* ═══════════════════════════════════════════════════════════════
   STUDENT SEARCH (INDIVIDUAL TAB)
═══════════════════════════════════════════════════════════════ */
window.msgSearch = function (query) {
  const dd = document.getElementById('msg-ind-dropdown');
  if (!query.trim()) { dd.style.display = 'none'; return; }

  const q = query.toLowerCase();
  const matches = (App.data.students || [])
    .filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q)
    )
    .slice(0, 12);

  if (!matches.length) {
    dd.innerHTML = `<div class="msg-dropdown-item" style="color:#9ca3af;cursor:default;">
      No students found for "${query}"</div>`;
    dd.style.display = 'block';
    return;
  }

  dd.innerHTML = matches.map(s => {
    const already = MSG.selectedStudents.has(s.id);
    return `<div class="msg-dropdown-item ${already ? 'already-selected' : ''}"
      onclick="msgToggleStudent('${s.id}','${escStr(s.name)}','${s.class||''}','${s.arm||''}')"
      style="${already ? 'opacity:.5;' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <strong style="font-size:.84rem;">${s.name}</strong>
          <span style="color:#9ca3af;font-size:.75rem;margin-left:.4rem;">
            ${s.id} · ${s.class||''} ${s.arm||''}
          </span>
        </div>
        ${already
          ? '<span style="color:#16a34a;font-size:.75rem;font-weight:600;">✓ Added</span>'
          : '<span style="color:#1e3a5f;font-size:.75rem;">+ Add</span>'}
      </div>
    </div>`;
  }).join('');

  dd.style.display = 'block';
};

window.msgToggleStudent = function (id, name, cls, arm) {
  if (MSG.selectedStudents.has(id)) {
    MSG.selectedStudents.delete(id);
  } else {
    MSG.selectedStudents.set(id, { id, name, cls, arm });
  }
  msgRenderChips();
  msgAutoPreview('individual');
  // Refresh dropdown to update ✓ marks
  const inp = document.getElementById('msg-ind-search');
  if (inp?.value) msgSearch(inp.value);
};

window.msgRemoveStudent = function (id) {
  MSG.selectedStudents.delete(id);
  msgRenderChips();
  msgAutoPreview('individual');
};

function msgRenderChips() {
  const el = document.getElementById('msg-ind-chips');
  if (!el) return;
  if (!MSG.selectedStudents.size) {
    el.innerHTML = `<span style="color:#9ca3af;font-size:.78rem;font-style:italic;">
      No students selected — search above</span>`;
    return;
  }
  el.innerHTML = [...MSG.selectedStudents.values()].map(s => `
    <span class="msg-chip">
      ${s.name}
      <span style="color:#9ca3af;font-size:.7rem;">(${s.cls} ${s.arm})</span>
      <button onclick="msgRemoveStudent('${s.id}')" title="Remove">✕</button>
    </span>`).join('');
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#msg-ind-search') && !e.target.closest('#msg-ind-dropdown')) {
    const dd = document.getElementById('msg-ind-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

/* ═══════════════════════════════════════════════════════════════
   SEND
═══════════════════════════════════════════════════════════════ */
window.msgSend = async function (type) {
  if (MSG.sending) return;

  const subject = document.getElementById(`msg-${type}-subject`)?.value.trim();
  const body    = document.getElementById(`msg-${type}-body`)?.value.trim();
  const btn     = document.getElementById(`msg-${type}-btn`);
  const result  = document.getElementById(`msg-${type}-result`);

  // Validate
  if (!subject) { toast('Please enter a subject line', 'warning'); return; }
  if (!body)    { toast('Please write a message body', 'warning'); return; }

  if (type === 'individual' && !MSG.selectedStudents.size) {
    toast('Please select at least one student', 'warning'); return;
  }

  // Count recipients
  const count = type === 'individual'
    ? MSG.selectedStudents.size
    : MSG.previewCache[type] || '?';

  if (!confirm(
    `Send "${subject}"\nto ${count} recipient${count !== 1 ? 's' : ''}?\n\n` +
    `This will send a real email to each parent.`
  )) return;

  // UI — loading state
  MSG.sending = true;
  if (btn) btn.classList.add('sending');
  msgShowResult(type, 'Sending…', 'none');

  // Build payload
  const payload = { type, subject, body };
  if (type === 'class') {
    const cls = document.getElementById('msg-cls-class')?.value;
    const arm = document.getElementById('msg-cls-arm')?.value;
    if (cls) payload.classFilter = cls;
    if (arm) payload.armFilter   = arm;
  } else if (type === 'individual') {
    payload.studentIds = [...MSG.selectedStudents.keys()];
  } else if (type === 'applicants') {
    payload.applicantStatus = document.getElementById('msg-app-status')?.value || 'Pending';
  }

  try {
    const resp = await API._post('/messaging/send', payload);
    const d    = resp?.data || {};
    const sent   = d.sent   || 0;
    const failed = d.failed || 0;
    const total  = d.total  || 0;

    if (sent > 0) {
      msgShowResult(type, `
        <div style="font-weight:700;margin-bottom:.35rem;">
          ✅ ${sent} email${sent !== 1 ? 's' : ''} sent successfully
        </div>
        <div style="font-size:.8rem;opacity:.85;">
          ${sent} sent · ${failed} failed · ${total} total recipients
        </div>
        ${failed > 0 && d.details?.failed?.length ? `
        <div style="margin-top:.5rem;font-size:.75rem;">
          Failed: ${d.details.failed.slice(0,3).map(f =>
            `${f.name || f.email} (${f.error})`).join(', ')}
          ${d.details.failed.length > 3 ? ` +${d.details.failed.length - 3} more` : ''}
        </div>` : ''}
      `, 'success');

      // Clear compose fields
      document.getElementById(`msg-${type}-subject`).value = '';
      document.getElementById(`msg-${type}-body`).value    = '';
      if (type === 'individual') {
        MSG.selectedStudents.clear();
        msgRenderChips();
        msgAutoPreview('individual');
      }
      toast(`✅ ${sent} email${sent !== 1 ? 's' : ''} sent`, 'success');
    } else {
      msgShowResult(type, `
        <div style="font-weight:700;margin-bottom:.35rem;">⚠️ No emails sent</div>
        <div style="font-size:.8rem;">${resp?.message || 'No recipients with email addresses found.'}</div>
      `, 'warn');
    }

  } catch(e) {
    msgShowResult(type, `
      <div style="font-weight:700;margin-bottom:.35rem;">❌ Send failed</div>
      <div style="font-size:.8rem;">${e.message}</div>
    `, 'error');
  } finally {
    MSG.sending = false;
    if (btn) btn.classList.remove('sending');
  }
};

function msgShowResult(type, html, kind) {
  const el = document.getElementById(`msg-${type}-result`);
  if (!el) return;
  el.innerHTML = html;
  el.className = `msg-result show ${kind}`;
}

/* ═══════════════════════════════════════════════════════════════
   CLEAR
═══════════════════════════════════════════════════════════════ */
window.msgClear = function (type) {
  const sub = document.getElementById(`msg-${type}-subject`);
  const bod = document.getElementById(`msg-${type}-body`);
  const res = document.getElementById(`msg-${type}-result`);
  if (sub) sub.value = '';
  if (bod) bod.value = '';
  if (res) { res.innerHTML = ''; res.className = 'msg-result'; }
  if (type === 'individual') {
    MSG.selectedStudents.clear();
    msgRenderChips();
    msgAutoPreview('individual');
  }
};

/* ═══════════════════════════════════════════════════════════════
   MESSAGE LOG
═══════════════════════════════════════════════════════════════ */
let _logRows = [];

window.msgLoadLog = async function () {
  const body = document.getElementById('msg-log-body');
  if (!body) return;
  body.innerHTML = `
    <div style="text-align:center;padding:2rem;color:#6b7280;font-size:.85rem;">
      Loading…
    </div>`;
  try {
    const resp = await API._get('/messaging/log');
    _logRows   = resp?.data || [];
    msgRenderLog(_logRows);
  } catch(e) {
    body.innerHTML = `
      <div style="text-align:center;padding:2rem;color:#dc2626;font-size:.85rem;">
        Failed to load: ${e.message}
      </div>`;
  }
};

window.msgFilterLog = function (query) {
  if (!_logRows.length) return;
  const q = query.toLowerCase();
  const filtered = q
    ? _logRows.filter(r =>
        (r.subject         || '').toLowerCase().includes(q) ||
        (r.recipient_name  || '').toLowerCase().includes(q) ||
        (r.recipient_email || '').toLowerCase().includes(q)
      )
    : _logRows;
  msgRenderLog(filtered);
};

function msgRenderLog(rows) {
  const body = document.getElementById('msg-log-body');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#9ca3af;">
        <div style="font-size:2.5rem;margin-bottom:.75rem;">📭</div>
        <div style="font-size:.875rem;">No messages sent yet</div>
      </div>`;
    return;
  }

  // Summary bar
  const total  = rows.length;
  const sent   = rows.filter(r => r.status === 'sent').length;
  const failed = rows.filter(r => r.status !== 'sent').length;

  body.innerHTML = `
    <!-- Summary -->
    <div style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
      ${[
        ['Total',  total,  '#6b7280', '#f3f4f6'],
        ['Sent',   sent,   '#166534', '#dcfce7'],
        ['Failed', failed, '#991b1b', '#fee2e2'],
      ].map(([l,v,tc,bg]) => `
        <div style="background:${bg};border-radius:8px;padding:.55rem 1rem;text-align:center;min-width:70px;">
          <div style="font-size:1.3rem;font-weight:800;color:${tc};">${v}</div>
          <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:${tc};opacity:.8;">${l}</div>
        </div>`).join('')}
    </div>

    <!-- Table -->
    <div style="overflow-x:auto;">
    <table class="msg-log-table">
      <thead>
        <tr>
          <th>Date &amp; Time</th>
          <th>Recipient</th>
          <th>Subject</th>
          <th style="text-align:center;">Status</th>
          <th>Sent By</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const isSent = r.status === 'sent';
          const dt     = String(r.sent_at || '').slice(0, 16).replace('T', ' ');
          return `<tr>
            <td style="color:#6b7280;font-size:.75rem;white-space:nowrap;">${dt}</td>
            <td>
              <div style="font-weight:600;font-size:.83rem;">${r.recipient_name || '—'}</div>
              <div style="color:#9ca3af;font-size:.72rem;">${r.recipient_email || ''}</div>
            </td>
            <td style="font-size:.82rem;max-width:220px;">
              <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;"
                title="${r.subject || ''}">
                ${r.subject || '—'}
              </div>
            </td>
            <td style="text-align:center;">
              <span class="msg-badge"
                style="background:${isSent ? '#dcfce7' : '#fee2e2'};
                       color:${isSent ? '#166534' : '#991b1b'};">
                ${isSent ? '✓ Sent' : '✕ Failed'}
              </span>
            </td>
            <td style="color:#6b7280;font-size:.78rem;">${r.sent_by || 'Admin'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    <div style="font-size:.72rem;color:#9ca3af;margin-top:.6rem;text-align:right;">
      Showing ${rows.length} record${rows.length !== 1 ? 's' : ''}
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */
function escStr(str) {
  return (str || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

console.info('[messaging] Communications Centre loaded.');