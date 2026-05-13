/* ═══════════════════════════════════════════════════════════════════════════
   ACCESS TOKEN SYSTEM  —  Student Result Portal Tokens
   ─────────────────────────────────────────────────────────────────────────
   HOW IT WORKS:
   1. Admin / Teacher generates a one-time or expiring access code per student
   2. Code is stored in App.data.accessTokens keyed by studentId
   3. Parent enters the code on the public check-result page to view results
   4. Token tracks: expiry, used-count, revocation, and audit log
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Token config ─────────────────────────────────────────────────────────── */
const TOKEN_CONFIG = {
  length:       8,           // characters in the code  e.g. "A3K9-PQ72"
  expiryDays:   30,          // default days until expiry
  maxUses:      null,        // null = unlimited; set to 1 for one-time codes
  prefix:       'RC',        // RC = Result Code
};

/* ── Crypto-safe random alphanumeric (no confusable chars) ─────────────────── */
function generateTokenCode() {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0,O,I,1
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_CONFIG.length));
  const raw   = Array.from(bytes).map(b => CHARS[b % CHARS.length]).join('');
  // Format: RC-XXXX-XXXX
  return `${TOKEN_CONFIG.prefix}-${raw.slice(0,4)}-${raw.slice(4)}`;
}

/* ── Ensure storage is initialised ───────────────────────────────────────── */
function ensureTokenStore() {
  if (!App.data.accessTokens)      App.data.accessTokens      = {};  // keyed by code
  if (!App.data.studentTokenIndex) App.data.studentTokenIndex = {};  // studentId → [codes]
}

/* ══════════════════════════════════════════════════════════════════════════
   GENERATE TOKEN
══════════════════════════════════════════════════════════════════════════ */
/**
 * Creates and stores a new access token for a student.
 * @param {string} studentId
 * @param {object} options  { expiryDays, maxUses, label, term, session }
 * @returns {object}  the stored token record
 */
function generateAccessToken(studentId, options = {}) {
  ensureTokenStore();

  const student = App.data.students.find(s => s.id === studentId);
  if (!student) throw new Error(`Student ${studentId} not found.`);

  const expiryDays = options.expiryDays ?? TOKEN_CONFIG.expiryDays;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const code = generateTokenCode();

  const token = {
    code,
    studentId,
    studentName:  student.name,
    class:        student.class,
    arm:          student.arm,
    label:        options.label   || `${student.name} — ${options.term || 'All Terms'} ${options.session || App.data.schoolInfo?.session || ''}`,
    term:         options.term    || null,
    session:      options.session || App.data.schoolInfo?.session || null,
    createdAt:    new Date().toISOString(),
    expiresAt:    expiryDate.toISOString(),
    maxUses:      options.maxUses ?? TOKEN_CONFIG.maxUses,
    useCount:     0,
    revoked:      false,
    createdBy:    App.currentUser?.name || 'System',
    auditLog:     [],
  };

  // Store by code
  App.data.accessTokens[code] = token;

  // Index by studentId for easy lookup
  if (!App.data.studentTokenIndex[studentId]) App.data.studentTokenIndex[studentId] = [];
  App.data.studentTokenIndex[studentId].push(code);

  saveAppData?.();
  return token;
}

/* ══════════════════════════════════════════════════════════════════════════
   VALIDATE / CONSUME TOKEN  (called when parent enters a code)
══════════════════════════════════════════════════════════════════════════ */
/**
 * Validates a code entered by a parent.
 * @param {string} code
 * @returns {{ valid:boolean, token?:object, reason?:string }}
 */
function validateAccessToken(code) {
  ensureTokenStore();

  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  const token      = App.data.accessTokens[normalized];

  if (!token)           return { valid: false, reason: 'Code not found. Please check and try again.' };
  if (token.revoked)    return { valid: false, reason: 'This access code has been revoked.' };

  const now     = new Date();
  const expiry  = new Date(token.expiresAt);
  if (now > expiry) return { valid: false, reason: `This code expired on ${formatDate(expiry)}.` };

  if (token.maxUses !== null && token.useCount >= token.maxUses)
    return { valid: false, reason: 'This code has already been used the maximum number of times.' };

  // Consume
  token.useCount++;
  token.auditLog.push({ action: 'used', at: now.toISOString(), ua: navigator?.userAgent?.slice(0, 80) || '' });
  saveAppData?.();

  return { valid: true, token };
}

/* ══════════════════════════════════════════════════════════════════════════
   REVOKE TOKEN
══════════════════════════════════════════════════════════════════════════ */
function revokeAccessToken(code) {
  ensureTokenStore();
  const token = App.data.accessTokens[code];
  if (!token) return false;
  token.revoked   = true;
  token.revokedAt = new Date().toISOString();
  token.revokedBy = App.currentUser?.name || 'System';
  token.auditLog.push({ action: 'revoked', at: token.revokedAt, by: token.revokedBy });
  saveAppData?.();
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   GET TOKENS FOR A STUDENT
══════════════════════════════════════════════════════════════════════════ */
function getStudentTokens(studentId) {
  ensureTokenStore();
  const codes = App.data.studentTokenIndex[studentId] || [];
  return codes.map(c => App.data.accessTokens[c]).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════════════════════
   BULK GENERATE  (for a whole class/arm)
══════════════════════════════════════════════════════════════════════════ */
function bulkGenerateTokens(students, options = {}) {
  ensureTokenStore();
  return students.map(s => {
    try   { return { studentId: s.id, token: generateAccessToken(s.id, options), ok: true }; }
    catch (err) { return { studentId: s.id, error: err.message, ok: false }; }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   DATE HELPER
══════════════════════════════════════════════════════════════════════════ */
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
}

/* ══════════════════════════════════════════════════════════════════════════
   UI — "Generate Token" button injected into the results table
   Call this inside loadResultEntry() after the table is rendered.
══════════════════════════════════════════════════════════════════════════ */

/**
 * Injects an "Access Tokens" panel below the results entry table.
 * Add this call at the end of window.loadResultEntry.
 */
function injectTokenPanel(cls, arm, term, session) {
  const container = document.getElementById('result-entry-table');
  if (!container) return;

  const students  = App.data.students.filter(s => s.class === cls && s.arm === arm);
  if (!students.length) return;

  const panel = document.createElement('div');
  panel.id    = 'token-panel';
  panel.style.cssText = 'background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-top:1.5rem;';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;margin-bottom:1.25rem;">
      <div>
        <h4 style="margin:0;color:#1e3a8a;">🔑 Parent Access Tokens</h4>
        <p style="margin:.2rem 0 0;font-size:.8rem;color:#6b7280;">
          Generate codes parents use to view their child's results online.
        </p>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
        <button onclick="openBulkTokenModal('${cls}','${arm}','${term}','${session}')"
          style="${btnStyle('primary')}">⚡ Bulk Generate — All Students</button>
        <button onclick="openTokenListModal('${cls}','${arm}')"
          style="${btnStyle('secondary')}">📋 View All Tokens</button>
      </div>
    </div>

    <div style="overflow-x:auto;">
    <table style="${tableStyle()}">
      <thead><tr style="${thRowStyle()}">
        <th style="${thStyle()}">Student</th>
        <th style="${thStyle()}">Active Codes</th>
        <th style="${thStyle()}">Last Generated</th>
        <th style="${thStyle()}">Status</th>
        <th style="${thStyle()}">Actions</th>
      </tr></thead>
      <tbody>
        ${students.map(s => renderTokenRow(s, term, session)).join('')}
      </tbody>
    </table></div>`;

  container.appendChild(panel);
}

/* Renders a single student row in the token panel */
function renderTokenRow(student, term, session) {
  const tokens  = getStudentTokens(student.id);
  const active  = tokens.filter(t => !t.revoked && new Date(t.expiresAt) > new Date());
  const expired = tokens.filter(t => !t.revoked && new Date(t.expiresAt) <= new Date());
  const revoked = tokens.filter(t => t.revoked);
  const last    = tokens.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))[0];

  const statusBadge = active.length
    ? `<span style="${badgeStyle('success')}">${active.length} active</span>`
    : tokens.length
      ? `<span style="${badgeStyle('danger')}">Expired / Revoked</span>`
      : `<span style="${badgeStyle('info')}">None</span>`;

  return `<tr id="token-row-${student.id}" style="${trStyle()}">
    <td style="${tdStyle()};text-align:left;">
      <div style="font-weight:600;color:#1e3a8a;">${student.name}</div>
      <div style="font-size:.73rem;color:#9ca3af;">${student.id}</div>
    </td>
    <td style="${tdStyle()}">
      ${active.length
        ? active.map(t => `
            <div style="font-family:monospace;font-size:.85rem;font-weight:700;color:#1d4ed8;
                        background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;
                        padding:.2rem .6rem;display:inline-flex;align-items:center;gap:.4rem;margin:.1rem;">
              ${t.code}
              <button onclick="copyToken('${t.code}')" title="Copy code"
                style="border:none;background:none;cursor:pointer;font-size:.8rem;color:#3b82f6;">📋</button>
            </div>`).join('')
        : '<span style="color:#d1d5db;font-size:.8rem;">—</span>'}
    </td>
    <td style="${tdStyle()};font-size:.8rem;color:#6b7280;">
      ${last ? formatDate(last.createdAt) : '—'}
    </td>
    <td style="${tdStyle()}">${statusBadge}</td>
    <td style="${tdStyle()}">
      <div style="display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;">
        <button onclick="openSingleTokenModal('${student.id}','${term}','${session}')"
          style="${btnStyle('primary','sm')}">+ Generate</button>
        ${active.length
          ? `<button onclick="openShareModal('${student.id}')"
              style="${btnStyle('success','sm')}">📤 Share</button>`
          : ''}
        ${tokens.length
          ? `<button onclick="openStudentTokenHistory('${student.id}')"
              style="${btnStyle('secondary','sm')}">📜 History</button>`
          : ''}
      </div>
    </td>
  </tr>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Generate token for a single student
══════════════════════════════════════════════════════════════════════════ */
window.openSingleTokenModal = function(studentId, term, session) {
  const student = App.data.students.find(s => s.id === studentId);
  if (!student) return;

  showModal(`
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div style="width:44px;height:44px;border-radius:50%;background:${stringToColor(student.name)};
        display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.9rem;flex-shrink:0;">
        ${student.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
      </div>
      <div>
        <h3 style="margin:0;">Generate Access Code</h3>
        <p style="margin:.1rem 0 0;font-size:.85rem;color:#6b7280;">${student.name} · ${student.class} ${student.arm}</p>
      </div>
    </div>

    <div style="display:grid;gap:1rem;margin-bottom:1.5rem;">
      <div>
        <label style="${labelStyle()}">Valid For (days)</label>
        <input type="number" id="tok-expiry" value="30" min="1" max="365" style="${inputStyle()}; max-width:120px;">
      </div>
      <div>
        <label style="${labelStyle()}">Term Access</label>
        <select id="tok-term" style="${inputStyle()}">
          <option value="">All Terms</option>
          <option value="First Term" ${term==='First Term'?'selected':''}>First Term</option>
          <option value="Second Term" ${term==='Second Term'?'selected':''}>Second Term</option>
          <option value="Third Term" ${term==='Third Term'?'selected':''}>Third Term</option>
        </select>
      </div>
      <div>
        <label style="${labelStyle()}">Session</label>
        <input id="tok-session" value="${session||App.data.schoolInfo?.session||''}" style="${inputStyle()}">
      </div>
      <div>
        <label style="${labelStyle()}">Max Uses (blank = unlimited)</label>
        <input type="number" id="tok-maxuses" placeholder="Leave blank for unlimited" min="1" style="${inputStyle()}; max-width:200px;">
      </div>
    </div>

    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="confirmGenerateSingleToken('${studentId}')" style="${btnStyle('primary')}">🔑 Generate Code</button>
    </div>`);
};

window.confirmGenerateSingleToken = function(studentId) {
  const expiryDays = parseInt(document.getElementById('tok-expiry')?.value)  || 30;
  const term       = document.getElementById('tok-term')?.value    || null;
  const session    = document.getElementById('tok-session')?.value || null;
  const maxUsesRaw = document.getElementById('tok-maxuses')?.value;
  const maxUses    = maxUsesRaw ? parseInt(maxUsesRaw) : null;

  try {
    const token = generateAccessToken(studentId, { expiryDays, term, session, maxUses });
    closeModal();
    showTokenResultModal(token);
    refreshTokenPanel();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Show the generated code (with copy & share)
══════════════════════════════════════════════════════════════════════════ */
function showTokenResultModal(token) {
  const portalUrl = `${window.location.origin}/check-result.html?code=${token.code}`;

  showModal(`
    <div style="text-align:center;margin-bottom:1.5rem;">
      <div style="font-size:2.5rem;margin-bottom:.5rem;">🎉</div>
      <h3 style="margin:0 0 .25rem;">Access Code Generated!</h3>
      <p style="color:#6b7280;font-size:.875rem;margin:0;">${token.studentName} · ${token.class} ${token.arm}</p>
    </div>

    <!-- The Big Code -->
    <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:1.25rem;text-align:center;margin-bottom:1.25rem;">
      <div style="font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1d4ed8;margin-bottom:.35rem;">Access Code</div>
      <div id="generated-code" style="font-family:monospace;font-size:2rem;font-weight:800;color:#1e3a8a;letter-spacing:.15em;">
        ${token.code}
      </div>
      <div style="display:flex;justify-content:center;gap:.75rem;margin-top:.75rem;flex-wrap:wrap;">
        <button onclick="copyToken('${token.code}')" style="${btnStyle('primary','sm')}">📋 Copy Code</button>
        <button onclick="copyToken('${portalUrl}','Full Link')" style="${btnStyle('secondary','sm')}">🔗 Copy Link</button>
      </div>
    </div>

    <!-- Details -->
    <div style="background:#f9fafb;border-radius:8px;padding:1rem;margin-bottom:1.25rem;font-size:.85rem;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
        <div><span style="color:#6b7280;">Expires:</span> <strong>${formatDate(token.expiresAt)}</strong></div>
        <div><span style="color:#6b7280;">Max uses:</span> <strong>${token.maxUses ?? 'Unlimited'}</strong></div>
        <div><span style="color:#6b7280;">Term:</span> <strong>${token.term || 'All Terms'}</strong></div>
        <div><span style="color:#6b7280;">Session:</span> <strong>${token.session || '—'}</strong></div>
      </div>
    </div>

    <!-- WhatsApp / SMS share shortcuts -->
    <div style="margin-bottom:1.25rem;">
      <label style="${labelStyle()}">Share Message (edit before sending)</label>
      <textarea id="share-message" rows="4" style="${inputStyle()};resize:vertical;">Dear Parent,

Your child ${token.studentName}'s academic result access code is:

🔑 Code: ${token.code}

Portal: ${portalUrl}

This code expires on ${formatDate(token.expiresAt)}.

– ${App.data.schoolInfo?.name || 'School Administration'}</textarea>
    </div>

    <div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:flex-end;">
      <button onclick="shareViaWhatsApp()" style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:.6rem 1.25rem;font-size:.875rem;font-weight:600;cursor:pointer;">
        📱 WhatsApp
      </button>
      <button onclick="copyShareMessage()" style="${btnStyle('secondary')}">📋 Copy Message</button>
      <button onclick="closeModal()" style="${btnStyle('primary')}">✔ Done</button>
    </div>`);

  window.shareViaWhatsApp = () => {
    const msg = encodeURIComponent(document.getElementById('share-message')?.value || '');
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };
  window.copyShareMessage = () => {
    const msg = document.getElementById('share-message')?.value || '';
    copyToClipboard(msg, 'Message copied!');
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Share active tokens for a student
══════════════════════════════════════════════════════════════════════════ */
window.openShareModal = function(studentId) {
  const student = App.data.students.find(s => s.id === studentId);
  const active  = getStudentTokens(studentId).filter(t => !t.revoked && new Date(t.expiresAt) > new Date());

  if (!active.length) { toast('No active codes to share.', 'warning'); return; }

  const latest     = active[active.length - 1];
  const portalUrl  = `${window.location.origin}/check-result.html?code=${latest.code}`;
  const defaultMsg = `Dear Parent,\n\nYour child ${student.name}'s result access code is:\n\n🔑 Code: ${latest.code}\n\nPortal: ${portalUrl}\n\nExpires: ${formatDate(latest.expiresAt)}\n\n– ${App.data.schoolInfo?.name || 'School'}`;

  showModal(`
    <h3 style="margin:0 0 1.25rem;">📤 Share Access Code — ${student.name}</h3>

    <div style="background:#eff6ff;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1.25rem;">
      <div style="font-family:monospace;font-size:1.6rem;font-weight:800;color:#1e3a8a;letter-spacing:.15em;">${latest.code}</div>
      <div style="font-size:.78rem;color:#6b7280;margin-top:.3rem;">Expires ${formatDate(latest.expiresAt)}</div>
      <button onclick="copyToken('${latest.code}')" style="${btnStyle('primary','sm')};margin-top:.6rem;">📋 Copy Code</button>
    </div>

    <textarea id="share-msg" rows="6" style="${inputStyle()};resize:vertical;margin-bottom:1rem;">${defaultMsg}</textarea>

    <div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:flex-end;">
      <button onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('share-msg').value),'_blank')"
        style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:.6rem 1.25rem;font-size:.875rem;font-weight:600;cursor:pointer;">
        📱 WhatsApp
      </button>
      <button onclick="copyToClipboard(document.getElementById('share-msg').value,'Message copied!')"
        style="${btnStyle('secondary')}">📋 Copy</button>
      <button onclick="closeModal()" style="${btnStyle('primary')}">✔ Done</button>
    </div>`);
};

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Student token history
══════════════════════════════════════════════════════════════════════════ */
window.openStudentTokenHistory = function(studentId) {
  const student = App.data.students.find(s => s.id === studentId);
  const tokens  = getStudentTokens(studentId).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));

  showModal(`
    <h3 style="margin:0 0 1.25rem;">📜 Token History — ${student?.name}</h3>
    <div style="overflow-y:auto;max-height:380px;">
    <table style="${tableStyle()}font-size:.82rem;">
      <thead><tr style="${thRowStyle()}">
        <th style="${thStyle()}">Code</th>
        <th style="${thStyle()}">Created</th>
        <th style="${thStyle()}">Expires</th>
        <th style="${thStyle()}">Uses</th>
        <th style="${thStyle()}">Status</th>
        <th style="${thStyle()}">Actions</th>
      </tr></thead>
      <tbody>
        ${tokens.map(t => {
          const isExpired = new Date(t.expiresAt) <= new Date();
          const status    = t.revoked ? 'revoked' : isExpired ? 'expired' : 'active';
          const badge     = { active:'success', expired:'warning', revoked:'danger' }[status];
          return `<tr style="${trStyle()}">
            <td style="${tdStyle()};font-family:monospace;font-weight:700;color:#1d4ed8;">${t.code}</td>
            <td style="${tdStyle()}">${formatDate(t.createdAt)}</td>
            <td style="${tdStyle()}">${formatDate(t.expiresAt)}</td>
            <td style="${tdStyle()}">${t.useCount}${t.maxUses?'/'+t.maxUses:''}</td>
            <td style="${tdStyle()}"><span style="${badgeStyle(badge)}">${status}</span></td>
            <td style="${tdStyle()}">
              ${status === 'active'
                ? `<button onclick="revokeAndRefresh('${t.code}')" style="${btnStyle('danger','xs')}">Revoke</button>`
                : '—'}
            </td>
          </tr>`;
        }).join('') || `<tr><td colspan="6" style="${tdStyle()};color:#9ca3af;">No tokens yet.</td></tr>`}
      </tbody>
    </table></div>
    <div style="text-align:right;margin-top:1rem;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Close</button>
    </div>`);
};

window.revokeAndRefresh = function(code) {
  if (!confirm('Revoke this access code? The parent will no longer be able to use it.')) return;
  revokeAccessToken(code);
  toast('Code revoked.', 'warning');
  closeModal();
  refreshTokenPanel();
};

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — View ALL tokens for a class/arm
══════════════════════════════════════════════════════════════════════════ */
window.openTokenListModal = function(cls, arm) {
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  ensureTokenStore();

  const rows = students.map(s => {
    const active = getStudentTokens(s.id).filter(t => !t.revoked && new Date(t.expiresAt) > new Date());
    const latest = active[active.length-1];
    return `<tr style="${trStyle()}">
      <td style="${tdStyle()};font-weight:600;text-align:left;">${s.name}</td>
      <td style="${tdStyle()};font-family:monospace;color:#1d4ed8;font-weight:700;">
        ${latest ? latest.code : '<span style="color:#d1d5db;">—</span>'}
      </td>
      <td style="${tdStyle()}">${latest ? formatDate(latest.expiresAt) : '—'}</td>
      <td style="${tdStyle()}">
        ${latest
          ? `<span style="${badgeStyle('success')}">Active</span>`
          : `<span style="${badgeStyle('danger')}">None</span>`}
      </td>
      <td style="${tdStyle()}">
        ${latest
          ? `<button onclick="copyToken('${latest.code}')" style="${btnStyle('primary','xs')}">📋 Copy</button>`
          : ''}
      </td>
    </tr>`;
  }).join('');

  showModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem;">
      <h3 style="margin:0;">📋 All Active Codes — ${cls} ${arm}</h3>
      <button onclick="copyAllTokens('${cls}','${arm}')" style="${btnStyle('secondary','sm')}">📋 Copy All Codes</button>
    </div>
    <div style="overflow-y:auto;max-height:400px;">
    <table style="${tableStyle()}">
      <thead><tr style="${thRowStyle()}">
        <th style="${thStyle()}">Student</th>
        <th style="${thStyle()}">Code</th>
        <th style="${thStyle()}">Expires</th>
        <th style="${thStyle()}">Status</th>
        <th style="${thStyle()}">Action</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="text-align:right;margin-top:1rem;">
      <button onclick="closeModal()" style="${btnStyle('primary')}">Close</button>
    </div>`);
};

window.copyAllTokens = function(cls, arm) {
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  const lines    = students.map(s => {
    const active = getStudentTokens(s.id).filter(t => !t.revoked && new Date(t.expiresAt) > new Date());
    const code   = active[active.length-1]?.code || 'NO CODE';
    return `${s.name.padEnd(30,' ')} | ${code}`;
  });
  const text = `Access Codes — ${cls} ${arm}\n${'─'.repeat(50)}\n${lines.join('\n')}`;
  copyToClipboard(text, 'All codes copied!');
};

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — Bulk generate for a whole class/arm
══════════════════════════════════════════════════════════════════════════ */
window.openBulkTokenModal = function(cls, arm, term, session) {
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);

  showModal(`
    <h3 style="margin:0 0 .5rem;">⚡ Bulk Generate Access Codes</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">
      Generate codes for all <strong>${students.length} students</strong> in ${cls} ${arm}.
    </p>

    <div style="background:#fef3c7;border-radius:8px;padding:.75rem 1rem;margin-bottom:1.25rem;font-size:.85rem;color:#92400e;">
      ⚠ Students who already have an active code will get a <strong>new code</strong> in addition to the old one.
      Old codes remain valid until they expire or are revoked.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
      <div>
        <label style="${labelStyle()}">Valid For (days)</label>
        <input type="number" id="bulk-tok-expiry" value="30" min="1" max="365" style="${inputStyle()}">
      </div>
      <div>
        <label style="${labelStyle()}">Max Uses per Code</label>
        <input type="number" id="bulk-tok-maxuses" placeholder="Unlimited" min="1" style="${inputStyle()}">
      </div>
      <div>
        <label style="${labelStyle()}">Term Access</label>
        <select id="bulk-tok-term" style="${inputStyle()}">
          <option value="">All Terms</option>
          <option value="First Term"  ${term==='First Term'?'selected':''}>First Term</option>
          <option value="Second Term" ${term==='Second Term'?'selected':''}>Second Term</option>
          <option value="Third Term"  ${term==='Third Term'?'selected':''}>Third Term</option>
        </select>
      </div>
      <div>
        <label style="${labelStyle()}">Session</label>
        <input id="bulk-tok-session" value="${session||App.data.schoolInfo?.session||''}" style="${inputStyle()}">
      </div>
    </div>

    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
      <button onclick="confirmBulkTokenGenerate('${cls}','${arm}')" style="${btnStyle('primary')}">
        ⚡ Generate ${students.length} Codes
      </button>
    </div>`);
};

window.confirmBulkTokenGenerate = function(cls, arm) {
  const expiryDays = parseInt(document.getElementById('bulk-tok-expiry')?.value)  || 30;
  const maxUsesRaw = document.getElementById('bulk-tok-maxuses')?.value;
  const maxUses    = maxUsesRaw ? parseInt(maxUsesRaw) : null;
  const term       = document.getElementById('bulk-tok-term')?.value    || null;
  const session    = document.getElementById('bulk-tok-session')?.value || null;

  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  const results  = bulkGenerateTokens(students, { expiryDays, maxUses, term, session });

  const succeeded = results.filter(r => r.ok);
  const failed    = results.filter(r => !r.ok);

  closeModal();
  toast(`${succeeded.length} access code(s) generated!${failed.length ? ` ${failed.length} failed.` : ''}`, 'success');
  refreshTokenPanel();

  // Show the results sheet
  showBulkResultSheet(cls, arm, succeeded);
};

function showBulkResultSheet(cls, arm, results) {
  const portalBase = `${window.location.origin}/check-result.html?code=`;

  const rows = results.map(r => `
    <tr style="${trStyle()}">
      <td style="${tdStyle()};font-weight:600;text-align:left;">${r.token.studentName}</td>
      <td style="${tdStyle()};font-family:monospace;font-size:.95rem;font-weight:700;color:#1d4ed8;letter-spacing:.08em;">${r.token.code}</td>
      <td style="${tdStyle()}">${formatDate(r.token.expiresAt)}</td>
      <td style="${tdStyle()}">
        <button onclick="copyToken('${r.token.code}')" style="${btnStyle('primary','xs')}">📋</button>
        <button onclick="window.open('https://wa.me/?text='+encodeURIComponent('Your child ${r.token.studentName} result code: ${r.token.code}  Link: ${portalBase}${r.token.code}'),'_blank')"
          style="background:#25D366;color:#fff;border:none;border-radius:6px;padding:.2rem .5rem;cursor:pointer;font-size:.75rem;margin-left:.25rem;">📱</button>
      </td>
    </tr>`).join('');

  showModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;margin-bottom:1.25rem;">
      <div>
        <h3 style="margin:0;">✅ Codes Generated — ${cls} ${arm}</h3>
        <p style="margin:.2rem 0 0;font-size:.85rem;color:#6b7280;">${results.length} codes ready to share.</p>
      </div>
      <div style="display:flex;gap:.5rem;">
        <button onclick="copyAllTokens('${cls}','${arm}')" style="${btnStyle('secondary','sm')}">📋 Copy All</button>
        <button onclick="downloadTokensCSV('${cls}','${arm}')" style="${btnStyle('secondary','sm')}">⬇ Download CSV</button>
      </div>
    </div>
    <div style="overflow-y:auto;max-height:380px;">
    <table style="${tableStyle()}">
      <thead><tr style="${thRowStyle()}">
        <th style="${thStyle()}">Student</th>
        <th style="${thStyle()}">Access Code</th>
        <th style="${thStyle()}">Expires</th>
        <th style="${thStyle()}">Share</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="text-align:right;margin-top:1rem;">
      <button onclick="closeModal()" style="${btnStyle('primary')}">✔ Done</button>
    </div>`);
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPORT TOKENS AS CSV
══════════════════════════════════════════════════════════════════════════ */
window.downloadTokensCSV = function(cls, arm) {
  const students  = App.data.students.filter(s => s.class === cls && s.arm === arm);
  const portalBase = `${window.location.origin}/check-result.html?code=`;

  const rows = [['Student Name','Student ID','Class','Arm','Access Code','Expires','Portal Link']];
  students.forEach(s => {
    const active = getStudentTokens(s.id)
      .filter(t => !t.revoked && new Date(t.expiresAt) > new Date())
      .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const token  = active[0];
    rows.push([
      s.name, s.id, s.class, s.arm,
      token?.code || 'No active code',
      token ? formatDate(token.expiresAt) : '—',
      token ? `${portalBase}${token.code}` : '—',
    ]);
  });

  const csv   = rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob  = new Blob([csv], { type: 'text/csv' });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement('a'), { href:url, download:`tokens_${cls}_${arm}_${Date.now()}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Token CSV downloaded!', 'success');
};

/* ══════════════════════════════════════════════════════════════════════════
   UTILITY HELPERS
══════════════════════════════════════════════════════════════════════════ */
window.copyToken = function(code, label = 'Code') {
  copyToClipboard(code, `${label} copied to clipboard!`);
};

function copyToClipboard(text, successMsg = 'Copied!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast(successMsg, 'success'));
  } else {
    const el = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(el); el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    toast(successMsg, 'success');
  }
}

function refreshTokenPanel() {
  // Re-render just the tbody rows without rebuilding the whole panel
  const cls  = document.getElementById('res-class')?.value;
  const arm  = document.getElementById('res-arm')?.value;
  if (!cls || !arm) return;
  const students = App.data.students.filter(s => s.class === cls && s.arm === arm);
  const tbody    = document.querySelector('#token-panel table tbody');
  if (tbody) {
    const term    = document.getElementById('res-term')?.value;
    const session = document.getElementById('res-session')?.value;
    tbody.innerHTML = students.map(s => renderTokenRow(s, term, session)).join('');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   HOOK INTO loadResultEntry
   Add this line at the very end of window.loadResultEntry:
     injectTokenPanel(cls, arm, term, session);
══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   CHECK-RESULT PAGE  —  Public portal entry point
   Include this block on check-result.html (or renderCheckResult() page).
   Parents enter their token here to view results.
══════════════════════════════════════════════════════════════════════════ */
function renderCheckResultPortal() {
  // Auto-fill from URL query param ?code=RC-XXXX-XXXX
  const urlCode = new URLSearchParams(window.location.search).get('code') || '';

  const container = document.getElementById('check-result-portal');
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:480px;margin:3rem auto;padding:0 1rem;">
      <div style="text-align:center;margin-bottom:2rem;">
        <div style="font-size:2.5rem;margin-bottom:.5rem;">🎓</div>
        <h2 style="margin:0;color:#1e3a8a;">${App.data.schoolInfo?.name || 'School Result Portal'}</h2>
        <p style="color:#6b7280;font-size:.9rem;margin:.5rem 0 0;">Enter your child's access code to view their results.</p>
      </div>

      <div style="background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:2rem;">
        <label style="${labelStyle()}">Access Code</label>
        <input id="portal-code" value="${urlCode}" placeholder="e.g. RC-A3K9-PQ72"
          style="${inputStyle()};font-family:monospace;font-size:1.1rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:1rem;"
          oninput="this.value=this.value.toUpperCase()">
        <button onclick="submitPortalCode()" style="${btnStyle('primary')};width:100%;">🔍 View Results</button>
        <div id="portal-error" style="margin-top:.75rem;"></div>
      </div>
    </div>
    <div id="portal-result-view" style="max-width:780px;margin:2rem auto;padding:0 1rem;"></div>`;

  // Auto-submit if code came from URL
  if (urlCode) {
    setTimeout(() => window.submitPortalCode?.(), 400);
  }
}

window.submitPortalCode = function() {
  const code  = document.getElementById('portal-code')?.value.trim();
  const errEl = document.getElementById('portal-error');

  if (!code) { if (errEl) errEl.innerHTML = `<p style="color:#ef4444;">Please enter an access code.</p>`; return; }

  const { valid, token, reason } = validateAccessToken(code);

  if (!valid) {
    if (errEl) errEl.innerHTML = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.75rem 1rem;color:#dc2626;font-size:.875rem;">
        ⚠ ${reason}
      </div>`;
    return;
  }

  if (errEl) errEl.innerHTML = '';

  // Load the student's result view
  const student = App.data.students.find(s => s.id === token.studentId);
  const results = App.data.results.filter(r =>
    r.studentId === token.studentId &&
    (!token.term    || r.term    === token.term) &&
    (!token.session || r.session === token.session)
  );

  const view = document.getElementById('portal-result-view');
  if (!student || !view) return;

  // Re-use the existing report card builder (read-only mode)
  const school = App.data.schoolInfo || {};
  view.innerHTML = buildReportCard(student, student.class, student.arm, token.term || results[0]?.term || '—', token.session || school.session || '—', school);

  // Remove edit controls from the portal view
  view.querySelectorAll('textarea, button[onclick*="saveRemark"]').forEach(el => {
    if (el.tagName === 'TEXTAREA') {
      const div = document.createElement('div');
      div.style.cssText = 'padding:4px 6px;font-size:11px;min-height:28px;border:1px solid #e2e8f0;border-radius:4px;';
      div.textContent   = el.value || '—';
      el.replaceWith(div);
    } else {
      el.remove();
    }
  });

  view.scrollIntoView({ behavior: 'smooth' });
};

/* ══════════════════════════════════════════════════════════════════════════
   EXPORTS (for modules / Node backend if needed)
══════════════════════════════════════════════════════════════════════════ */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateAccessToken,
    validateAccessToken,
    revokeAccessToken,
    getStudentTokens,
    bulkGenerateTokens,
  };
}