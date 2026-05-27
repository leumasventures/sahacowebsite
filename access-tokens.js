'use strict';
/**
 * access-tokens.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Access Tokens
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
/* ACCESS TOKENS  (Admin only) */
function renderAccessTokens() {
  if (!priv.isAdmin()) { accessDeniedPage('access-tokens'); return; }
  const section = document.getElementById('access-tokens');
  if (!section) return;

  const classOpts = (App.data.classes || []).map(c =>
    `<option value="${c.name}">${c.name}</option>`).join('');

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
      <h2 style="margin:0;">🔑 Access Tokens</h2>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button onclick="openGenerateTokenModal()" style="${btnStyle('primary')}">+ Generate Token</button>
        <button onclick="openBulkTokenModal()" style="${btnStyle('secondary')}">📦 Bulk Generate</button>
        <button onclick="exportTokensCSV()" style="${btnStyle('outline')}">⬇ Export CSV</button>
      </div>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:.9rem 1.2rem;margin-bottom:1.2rem;font-size:.85rem;color:#1d4ed8;">
      <strong>ℹ What are Access Tokens?</strong><br>
      Each token gives a parent one-time (or limited) access to their child's results on the Parent Portal.
      Tokens are auto-generated with an expiry and can be revoked at any time.
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
      <select id="tok-filter-class" onchange="loadTokens()" style="${selectStyle()}">
        <option value="">All Classes</option>${classOpts}
      </select>
      <input id="tok-filter-search" placeholder="Search student name or code…" oninput="loadTokens()"
             style="${inputStyle()};min-width:200px;">
    </div>

    <!-- Tokens table -->
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">STUDENT</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">TOKEN CODE</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">EXPIRES</th>
            <th style="padding:.75rem 1rem;text-align:center;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">USES</th>
            <th style="padding:.75rem 1rem;text-align:left;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">STATUS</th>
            <th style="padding:.75rem 1rem;text-align:center;font-size:.8rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTIONS</th>
          </tr>
        </thead>
        <tbody id="tokens-tbody">
          <tr><td colspan="6" style="text-align:center;padding:2rem;color:#9ca3af;">Loading tokens…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  loadTokens();
}

async function loadTokens() {
  const tbody  = document.getElementById('tokens-tbody');
  const cls    = document.getElementById('tok-filter-class')?.value;
  const search = document.getElementById('tok-filter-search')?.value?.toLowerCase();
  if (!tbody) return;

  try {
    const resp = cls
      ? await AccessTokens.getClassList({ class: cls })
      : await AccessTokens.getAll();
    let tokens = resp.data || [];

    if (search) {
      tokens = tokens.filter(t =>
        (t.studentName || t.student_name || '').toLowerCase().includes(search) ||
        (t.code || '').toLowerCase().includes(search)
      );
    }

    const sc = { active:'#22c55e', expired:'#f59e0b', revoked:'#ef4444', exhausted:'#6b7280' };
    tbody.innerHTML = tokens.length ? tokens.map(t => {
      const status = t.status || (t.revoked ? 'revoked' : 'active');
      const uses   = t.used != null ? `${t.used}${t.maxUses ? '/'+t.maxUses : ''}` : '0';
      return `
        <tr>
          <td style="padding:.65rem 1rem;">
            <div style="font-weight:600;font-size:.875rem;">${t.studentName||t.student_name||t.studentId||'—'}</div>
            <div style="font-size:.72rem;color:#9ca3af;">${t.class||''} ${t.arm||''}</div>
          </td>
          <td style="padding:.65rem 1rem;">
            <code style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-size:.8rem;letter-spacing:.05em;">${t.code||t.latestCode||'—'}</code>
            ${t.code ? `<button onclick="navigator.clipboard?.writeText('${t.code}').then(()=>toast('Copied!','success'))"
                    style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:.75rem;margin-left:.3rem;" title="Copy">📋</button>` : ''}
          </td>
          <td style="padding:.65rem 1rem;font-size:.8rem;color:#6b7280;">${t.expires||t.expiresAt ? new Date(t.expires||t.expiresAt).toLocaleDateString() : '—'}</td>
          <td style="padding:.65rem 1rem;text-align:center;font-size:.85rem;">${uses}</td>
          <td style="padding:.65rem 1rem;">
            <span style="display:inline-block;background:${sc[status]||'#6b7280'}22;color:${sc[status]||'#6b7280'};border-radius:9999px;padding:.2rem .7rem;font-size:.75rem;font-weight:600;">${status}</span>
          </td>
          <td style="padding:.65rem 1rem;text-align:center;display:flex;gap:.3rem;justify-content:center;">
            ${status === 'active' && t.code ? `<button onclick="revokeToken('${t.code}')" style="${btnStyle('warning','sm')}">Revoke</button>` : ''}
            ${t.code ? `<button onclick="deleteToken('${t.code}')" style="${btnStyle('danger','sm')}">Del</button>` : ''}
          </td>
        </tr>`;
    }).join('') :
      `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#9ca3af;">No tokens found</td></tr>`;

  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Error: ${e.message}</td></tr>`;
  }
}

window.openGenerateTokenModal = function() {
  const studentOpts = (App.data.students || []).map(s =>
    `<option value="${s.id}">${s.name} (${s.class||''} ${s.arm||''})</option>`).join('');
  showModal(`
    <h3 style="margin:0 0 1.2rem;">🔑 Generate Access Token</h3>
    <div style="display:flex;flex-direction:column;gap:.8rem;">
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Student *</label>
        <select id="gt-student" style="${selectStyle()};width:100%;">
          <option value="">-- Select Student --</option>${studentOpts}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;">
        <div>
          <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Expiry (days)</label>
          <input id="gt-expiry" type="number" value="30" min="1" max="365" style="${inputStyle()};width:100%;">
        </div>
        <div>
          <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Max Uses (blank = unlimited)</label>
          <input id="gt-maxuses" type="number" min="1" placeholder="Unlimited" style="${inputStyle()};width:100%;">
        </div>
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.3rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="submitGenerateToken()" style="${btnStyle('primary')}">✅ Generate</button>
      </div>
    </div>
  `);
};

window.submitGenerateToken = async function() {
  const studentId  = document.getElementById('gt-student')?.value;
  const expiryDays = parseInt(document.getElementById('gt-expiry')?.value) || 30;
  const maxUses    = document.getElementById('gt-maxuses')?.value;
  if (!studentId) { toast('Select a student', 'error'); return; }
  try {
    const resp = await AccessTokens.generate({
      studentId, expiryDays,
      maxUses:  maxUses ? parseInt(maxUses) : null,
      term:     App.data.schoolInfo?.term    || null,
      session:  App.data.schoolInfo?.session || null,
    });
    if (!resp.success) throw new Error(resp.message);
    const code = resp.data?.code;
    closeModal(); toast(`Token generated: ${code}`, 'success'); loadTokens();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.openBulkTokenModal = function() {
  const classOpts = (App.data.classes || []).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  showModal(`
    <h3 style="margin:0 0 1.2rem;">📦 Bulk Generate Tokens</h3>
    <div style="display:flex;flex-direction:column;gap:.8rem;">
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Class *</label>
        <select id="bt-class" onchange="populateBulkArms()" style="${selectStyle()};width:100%;">
          <option value="">-- Select Class --</option>${classOpts}
        </select>
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Arm *</label>
        <select id="bt-arm" style="${selectStyle()};width:100%;"><option value="">Select class first</option></select>
      </div>
      <div>
        <label style="font-size:.8rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Expiry (days)</label>
        <input id="bt-expiry" type="number" value="30" min="1" style="${inputStyle()};width:100%;">
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.3rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="submitBulkTokens()" style="${btnStyle('primary')}">✅ Generate for Class</button>
      </div>
    </div>
  `);
};

window.populateBulkArms = function() {
  const cls = (App.data.classes || []).find(c => c.name === document.getElementById('bt-class')?.value);
  const sel = document.getElementById('bt-arm');
  if (sel) sel.innerHTML = (cls?.arms || []).map(a => `<option>${a}</option>`).join('') || '<option>A</option>';
};

window.submitBulkTokens = async function() {
  const cls  = document.getElementById('bt-class')?.value;
  const arm  = document.getElementById('bt-arm')?.value;
  const days = parseInt(document.getElementById('bt-expiry')?.value) || 30;
  if (!cls || !arm) { toast('Class and arm are required', 'error'); return; }
  try {
    const resp = await AccessTokens.bulkGenerate({
      class: cls, arm, expiryDays: days,
      term:    App.data.schoolInfo?.term    || null,
      session: App.data.schoolInfo?.session || null,
    });
    if (!resp.success) throw new Error(resp.message);
    closeModal(); toast(`Generated ${resp.data?.generated || 0} tokens for ${cls} ${arm}`, 'success'); loadTokens();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.revokeToken = async function(code) {
  if (!confirmDlg('Revoke this token? The parent will no longer be able to use it.')) return;
  try {
    await AccessTokens.revoke(code);
    toast('Token revoked', 'warning'); loadTokens();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.deleteToken = async function(code) {
  if (!confirmDlg('Permanently delete this token?')) return;
  try {
    await AccessTokens.remove(code);
    toast('Token deleted', 'warning'); loadTokens();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
};

window.exportTokensCSV = function() {
  const cls   = document.getElementById('tok-filter-class')?.value || '';
  const token = sessionStorage.getItem('shc_token');
  const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
  window.open(`${BASE}/access-tokens/export/csv${cls ? '?class='+encodeURIComponent(cls) : ''}`, '_blank');
};