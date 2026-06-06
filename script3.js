/* ============================================================
   Sacred Heart College – School Management Dashboard
   script3.js – v1.0  |  Additions & Improvements NOT in script2.js
   Requires: script.js, script2.js loaded first
   Covers:
     A. Parent Portal (full page render + token validation)
     B. Fees / Finance module
     C. Timetable module
     D. Notifications centre
     E. Data export (CSV per section) + JSON backup/restore
     F. Domain assessments CRUD (missing from script2.js)
     G. Dashboard live stats wiring (attendance summary cards)
     H. Subject limit enforcement (SS2/SS3 ≤ 9 subjects)
     I. Print-ready report card (complete printReportCard fix)
     J. Global search
     K. exportData / clearResults / clearAttendance (settings stubs)
     L. Misc fixes: computePosition, getDomainScores, domainLabel
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   A. PARENT PORTAL
   Full section render wired to #parent-portal section element.
   Token generation is in Admin report cards panel.
───────────────────────────────────────────────────────────── */

(function patchNavigate() {
  /* Extend the existing navigate() to also handle parent-portal */
  const _orig = window.navigate;
  window.navigate = function (sectionId) {
    _orig(sectionId);
    if (sectionId === 'parent-portal') renderParentPortal();
  };
})();

window.renderParentPortal = function() {
  const section = document.getElementById('parent-portal');
  if (!section) return;

  const user    = App.currentUser;
  const wardId  = user?.wardId || user?.ward_id || null;
  const isParent= user?.role === 'Parent';

  // Linked parent account — show their child's dashboard automatically
  if (isParent && wardId) {
    _renderParentDashboard(section, wardId);
    return;
  }

  // Two-option landing: Finance (phone verify) or Report Cards (token)
  section.innerHTML = `
    <div style="max-width:840px;margin:2rem auto;padding:0 1rem;">
      <h2 style="margin:0 0 .3rem;color:#1e3a5f;font-size:1.3rem;font-weight:800;">👨‍👩‍👧 Parent / Guardian Portal</h2>
      <p style="color:#6b7280;margin:0 0 2rem;font-size:.875rem;">Access your child's records — no account required.</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1.25rem;margin-bottom:2rem;">

        <!-- Option 1: Finance (Student ID + Phone) -->
        <div style="background:#fff;border-radius:14px;padding:1.75rem;box-shadow:0 2px 10px rgba(0,0,0,.08);border-top:4px solid #1e3a5f;">
          <div style="font-size:1.75rem;margin-bottom:.5rem;">💰</div>
          <div style="font-weight:700;color:#1e3a5f;font-size:1rem;margin-bottom:.35rem;">Finance &amp; Performance</div>
          <div style="font-size:.82rem;color:#6b7280;margin-bottom:1.1rem;line-height:1.6;">
            View fee charges, payment status, attendance and results using your child's
            <strong>Student ID</strong> and your <strong>phone number</strong>.
          </div>
          <div style="margin-bottom:.65rem;">
            <label style="font-size:.76rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Student ID</label>
            <input id="pp-sid-input" type="text" placeholder="e.g. SAHARCO/20250115/0001"
              style="width:100%;padding:.55rem .85rem;border:1.5px solid #e5e7eb;border-radius:8px;font-size:.875rem;
                     font-family:monospace;text-transform:uppercase;outline:none;box-sizing:border-box;"
              oninput="this.value=this.value.toUpperCase()"
              onkeydown="if(event.key==='Enter')ppLoginDirect()">
          </div>
          <div style="margin-bottom:.9rem;">
            <label style="font-size:.76rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Parent / Guardian Phone</label>
            <input id="pp-phone-input" type="tel" placeholder="e.g. 08012345678"
              style="width:100%;padding:.55rem .85rem;border:1.5px solid #e5e7eb;border-radius:8px;font-size:.875rem;
                     outline:none;box-sizing:border-box;"
              onkeydown="if(event.key==='Enter')ppLoginDirect()">
          </div>
          <div id="pp-direct-error" style="color:#dc2626;font-size:.78rem;min-height:1.1rem;margin-bottom:.5rem;"></div>
          <button onclick="ppLoginDirect()"
            style="width:100%;padding:.65rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;
                   font-size:.9rem;font-weight:600;cursor:pointer;">
            View Finance &amp; Performance →
          </button>
        </div>

        <!-- Option 2: Report Cards (Access Token) -->
        <div style="background:#fff;border-radius:14px;padding:1.75rem;box-shadow:0 2px 10px rgba(0,0,0,.08);border-top:4px solid #c8972b;">
          <div style="font-size:1.75rem;margin-bottom:.5rem;">📄</div>
          <div style="font-weight:700;color:#1e3a5f;font-size:1rem;margin-bottom:.35rem;">Report Cards &amp; Results</div>
          <div style="font-size:.82rem;color:#6b7280;margin-bottom:1.1rem;line-height:1.6;">
            View term report cards and detailed results using the
            <strong>Access Token</strong> provided by the school on results day.
          </div>
          <div style="margin-bottom:.9rem;">
            <label style="font-size:.76rem;font-weight:600;color:#374151;display:block;margin-bottom:.3rem;">Access Token</label>
            <input id="pp-token-input" type="text" placeholder="SHC-PRC-2026-XXXXXX"
              style="width:100%;padding:.55rem .85rem;border:1.5px solid #e5e7eb;border-radius:8px;
                     font-family:monospace;font-size:.9rem;letter-spacing:1px;text-transform:uppercase;
                     outline:none;box-sizing:border-box;"
              oninput="this.value=this.value.toUpperCase()"
              onkeydown="if(event.key==='Enter')validateParentToken()">
          </div>
          <div id="pp-error" style="color:#dc2626;font-size:.78rem;min-height:1.1rem;margin-bottom:.5rem;"></div>
          <button onclick="validateParentToken()"
            style="width:100%;padding:.65rem;background:#c8972b;color:#fff;border:none;border-radius:8px;
                   font-size:.9rem;font-weight:600;cursor:pointer;">
            View Report Card →
          </button>
        </div>
      </div>

      <div style="background:#f8fafc;border-radius:10px;padding:.9rem 1.25rem;font-size:.8rem;color:#6b7280;border:1px solid #e5e7eb;">
        📞 Need help? Contact the school office to get your Student ID or Access Token.
      </div>

      <div id="pp-report-output" style="margin-top:1.5rem;"></div>
    </div>`;
};


/* ── Direct login: Student ID + parent phone ──────────────────── */
window.ppLoginDirect = async function() {
  const sid   = (document.getElementById('pp-sid-input')?.value  || '').trim().toUpperCase();
  const phone = (document.getElementById('pp-phone-input')?.value || '').trim().replace(/\s/g,'');
  const errEl = document.getElementById('pp-direct-error');
  if (!sid)   { errEl.textContent = 'Please enter the Student ID.';   return; }
  if (!phone) { errEl.textContent = 'Please enter the phone number.'; return; }
  errEl.textContent = 'Verifying…';
  try {
    const BASE = window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api';
    const resp = await fetch(`${BASE}/students/parent-verify/${encodeURIComponent(sid)}`);
    if (!resp.ok) { errEl.textContent = 'Student ID not found. Please check and try again.'; return; }
    const json    = await resp.json();
    const student = json.data || json.student || json;
    // Compare last 8 digits of phone
    const stored  = (student.phone || student.parent_phone || '').replace(/\s/g,'').replace(/^(\+234|234)/, '0');
    const entered = phone.replace(/^(\+234|234)/, '0');
    if (!stored || entered.slice(-8) !== stored.slice(-8)) {
      errEl.textContent = 'Phone number does not match our records. Please contact the school.';
      return;
    }
    errEl.textContent = '';
    window._ppPhone = phone;
    const section = document.getElementById('parent-portal');
    _renderParentDashboard(section, sid);
  } catch(e) {
    errEl.textContent = 'Connection error — please try again.';
    console.error('[ppLoginDirect]', e);
  }
};

async function _renderParentDashboard(section, wardId) {
  section.innerHTML = `<div style="max-width:860px;margin:0 auto;"><div style="text-align:center;padding:2rem;color:#9ca3af;">Loading your child's records…</div></div>`;
  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const hdr   = { Authorization: `Bearer ${token}` };

    // Use public /pp/ routes when no auth token (phone-verified parent)
    const _ppPhone  = window._ppPhone || '';
    const _finBase  = token ? `${BASE}/student-finance` : `${BASE}/student-finance/pp`;
    const _finQuery = token
      ? `sid=${encodeURIComponent(wardId)}`
      : `sid=${encodeURIComponent(wardId)}&phone=${encodeURIComponent(_ppPhone)}`;

    const fetchFin = async (path) => {
      const url = `${_finBase}/${path}?${_finQuery}`;
      const opts = token ? { headers: hdr, credentials:'include' } : { credentials:'include' };
      const r = await fetch(url, opts);
      if (!r.ok) {
        const err = await r.json().catch(()=>({message:'Server error '+r.status}));
        throw new Error(err.message || 'HTTP '+r.status);
      }
      return r.json();
    };

    const [sumResp, chargesResp, leviesResp] = await Promise.all([
      fetchFin('summary').catch(e=>({ success:false, data:null, _err:e.message })),
      fetchFin('charges').catch(e=>({ success:false, data:[],   _err:e.message })),
      fetchFin('levies').catch(e=> ({ success:false, data:[],   _err:e.message })),
    ]);

    // Show error if summary failed (student not found or auth failed)
    if (!sumResp.success || !sumResp.data) {
      const msg = sumResp._err || sumResp.message || 'Could not load financial records.';
      section.innerHTML = `<div style="max-width:860px;margin:2rem auto;background:#fff;border-radius:14px;padding:2rem;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.08);">
        <div style="font-size:2rem;margin-bottom:.75rem;">⚠️</div>
        <div style="font-weight:700;color:#dc2626;margin-bottom:.5rem;">Unable to load records</div>
        <div style="font-size:.85rem;color:#6b7280;">${msg}</div>
      </div>`;
      return;
    }

    const student  = sumResp.data?.student  || {};
    const ledger   = sumResp.data?.ledger   || {};
    const unpaid   = sumResp.data?.unpaid   || {};
    const school   = sumResp.data?.school   || {};
    const charges  = chargesResp.data || [];
    const levies   = leviesResp.data  || [];

    const bal        = parseFloat(ledger.balance || 0);
    const paidPct    = ledger.percentPaid || 0;
    const schoolName = school.school_name || 'Sacred Heart College Eziukwu Aba';
    const termStr    = school.current_term    || App.data.schoolInfo?.term    || '';
    const sessionStr = school.current_session || App.data.schoolInfo?.session || '';

    const sc = { Paid:'#16a34a', Partial:'#d97706', Unpaid:'#dc2626', Waived:'#6b7280' };
    const badge = (s) => `<span style="background:${sc[s]||'#6b7280'}22;color:${sc[s]||'#6b7280'};border-radius:9999px;padding:.15rem .65rem;font-size:.73rem;font-weight:700;">${s}</span>`;

    section.innerHTML = `
      <div style="max-width:860px;margin:0 auto;">

        <!-- Header card -->
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:14px;padding:1.5rem 2rem;color:#fff;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div>
            <div style="font-size:1.3rem;font-weight:800;">${student.name||wardId}</div>
            <div style="font-size:.85rem;opacity:.85;margin-top:.2rem;">${student.class||''} ${student.arm||''} · ID: ${student.id||wardId}</div>
            <div style="font-size:.8rem;opacity:.75;margin-top:.1rem;">${schoolName} · ${termStr} ${sessionStr}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:.75rem;opacity:.75;margin-bottom:.2rem;">Account Balance</div>
            <div style="font-size:1.8rem;font-weight:800;color:${bal>0?'#fca5a5':'#86efac'};">
              ${bal > 0 ? '₦'+bal.toLocaleString('en-NG') : '✓ Cleared'}
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:.85rem;margin-bottom:1.5rem;">
          ${[
            ['Total Charged',  '₦'+parseFloat(ledger.totalCharged||0).toLocaleString(), '#1e3a5f'],
            ['Total Paid',     '₦'+parseFloat(ledger.totalPaid||0).toLocaleString(),    '#16a34a'],
            ['Balance',        bal>0 ? '₦'+bal.toLocaleString() : '✓ Clear',             bal>0?'#dc2626':'#16a34a'],
            ['Unpaid Items',   unpaid.totalCount||0,                                     (unpaid.totalCount||0)>0?'#dc2626':'#16a34a'],
          ].map(([l,v,c])=>`
            <div style="background:#fff;border-radius:10px;padding:.9rem 1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:4px solid ${c};">
              <div style="font-size:.68rem;color:#6b7280;font-weight:600;text-transform:uppercase;margin-bottom:.2rem;">${l}</div>
              <div style="font-size:1.2rem;font-weight:700;color:${c};">${v}</div>
            </div>`).join('')}
        </div>

        <!-- Progress bar -->
        <div style="background:#fff;border-radius:12px;padding:1.1rem 1.4rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.25rem;">
          <div style="display:flex;justify-content:space-between;font-size:.83rem;color:#6b7280;margin-bottom:.55rem;">
            <span>Payment Progress — ${termStr}</span>
            <span style="font-weight:700;color:${paidPct>=100?'#16a34a':'#1e3a5f'};">${paidPct}% paid</span>
          </div>
          <div style="height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden;">
            <div style="width:${paidPct}%;height:100%;background:${paidPct>=100?'#16a34a':'#2563eb'};border-radius:5px;"></div>
          </div>
        </div>

        <!-- Alert -->
        ${unpaid.totalCount > 0 ? `
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:1rem 1.4rem;margin-bottom:1.25rem;">
            <div style="font-weight:700;color:#dc2626;margin-bottom:.3rem;">⚠ ${unpaid.totalCount} Outstanding — ₦${parseFloat(unpaid.totalAmount||0).toLocaleString()}</div>
            <div style="font-size:.84rem;color:#6b7280;">Please contact the school bursar to make payment and obtain a receipt.</div>
          </div>` :
          `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:.9rem 1.4rem;margin-bottom:1.25rem;font-weight:600;color:#16a34a;">✅ All charges are settled for this term.</div>`
        }

        <!-- Fee charges -->
        ${charges.length ? `
          <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.25rem;">
            <div style="padding:.85rem 1.25rem;border-bottom:1px solid #e5e7eb;font-weight:700;color:#1e3a5f;font-size:.9rem;">📋 Fee Charges (${charges.length})</div>
            <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
              <thead><tr style="background:#f9fafb;">
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">FEE</th>
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">TERM</th>
                <th style="padding:.55rem 1rem;text-align:right;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">AMOUNT</th>
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">STATUS</th>
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">DATE PAID</th>
              </tr></thead>
              <tbody>${charges.map(c=>`
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:.55rem 1rem;font-weight:600;">${c.fee_type}</td>
                  <td style="padding:.55rem 1rem;font-size:.82rem;color:#6b7280;">${c.term}</td>
                  <td style="padding:.55rem 1rem;text-align:right;font-weight:700;">₦${parseFloat(c.amount||0).toLocaleString()}</td>
                  <td style="padding:.55rem 1rem;">${badge(c.status)}</td>
                  <td style="padding:.55rem 1rem;font-size:.78rem;color:#9ca3af;">${c.payment_date ? new Date(c.payment_date).toLocaleDateString('en-NG') : '—'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}

        <!-- Levies -->
        ${levies.length ? `
          <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
            <div style="padding:.85rem 1.25rem;border-bottom:1px solid #e5e7eb;font-weight:700;color:#1e3a5f;font-size:.9rem;">🎯 Levies & Special Fees (${levies.length})</div>
            <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
              <thead><tr style="background:#f9fafb;">
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">LEVY</th>
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">CATEGORY</th>
                <th style="padding:.55rem 1rem;text-align:right;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">AMOUNT</th>
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">STATUS</th>
                <th style="padding:.55rem 1rem;text-align:left;font-size:.74rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">DUE DATE</th>
              </tr></thead>
              <tbody>${levies.map(l=>`
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:.55rem 1rem;font-weight:600;">${l.levy_name}</td>
                  <td style="padding:.55rem 1rem;font-size:.78rem;color:#6b7280;">${l.category||'—'}</td>
                  <td style="padding:.55rem 1rem;text-align:right;font-weight:700;">₦${parseFloat(l.amount_paid||0).toLocaleString()}</td>
                  <td style="padding:.55rem 1rem;">${badge(l.status)}</td>
                  <td style="padding:.55rem 1rem;font-size:.78rem;color:#9ca3af;">${l.due_date ? new Date(l.due_date).toLocaleDateString('en-NG') : '—'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}

      </div>`;
  } catch(e) {
    section.innerHTML = `<div style="max-width:760px;margin:0 auto;">
      <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:1.5rem;color:#dc2626;">
        <strong>Could not load financial records.</strong><br>
        <span style="font-size:.85rem;">${e.message}</span>
      </div>
    </div>`;
  }
}


window.validateParentToken = function () {
  const raw   = (document.getElementById('pp-token-input')?.value || '').trim().toUpperCase();
  const errEl = document.getElementById('pp-error');
  const outEl = document.getElementById('pp-report-output');
  errEl.textContent = ''; outEl.innerHTML = '';

  if (!raw) { errEl.textContent = 'Please enter your access token.'; return; }

  const tokenRecord = (App.data.parentTokens || []).find(t => t.token === raw);
  if (!tokenRecord) { errEl.textContent = 'Invalid token. Please check and try again.'; return; }
  if (tokenRecord.expires && new Date(tokenRecord.expires) < new Date()) {
    errEl.textContent = 'This token has expired. Please contact the school.'; return;
  }

  const student = App.data.students.find(s => s.id === tokenRecord.studentId);
  if (!student) { errEl.textContent = 'Student record not found.'; return; }

  /* Mark as used */
  tokenRecord.used = true;
  tokenRecord.lastAccessed = new Date().toISOString();

  _renderParentReportCard(student, outEl);
};

function _renderParentReportCard(student, container) {
  const term    = App.data.schoolInfo.term;
  const session = App.data.schoolInfo.session;
  const results = App.data.results.filter(r =>
    r.studentId === student.id && r.term === term && r.session === session);

  const subjectCount = results.length;
  const average = subjectCount
    ? (results.reduce((a, b) => a + b.total, 0) / subjectCount).toFixed(1) : 'N/A';

  const remarkEntry = (App.data.remarks || []).find(r =>
    r.studentId === student.id && r.term === term && r.session === session) || {};

  const school = App.data.schoolInfo || {};

  container.innerHTML = `
    <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.1);">

      <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;padding:2rem;text-align:center;">
        <h2 style="margin:0;font-size:1.6rem;">${school.name || 'Sacred Heart College'}</h2>
        <p style="margin:.4rem 0 0;opacity:.85;">${term} Report Card · ${session}</p>
      </div>

      <div style="padding:1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:grid;
                  grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
        <div><span style="color:#64748b;">Student:</span> <strong>${student.name}</strong></div>
        <div><span style="color:#64748b;">Class:</span> <strong>${student.class} ${student.arm}</strong></div>
        <div><span style="color:#64748b;">Admission No:</span> <strong>${student.id}</strong></div>
      </div>

      <div style="padding:1.5rem;">
        ${subjectCount === 0
          ? '<p style="color:#9ca3af;text-align:center;padding:2rem;">No results for this term yet.</p>'
          : `<h4 style="margin:0 0 1rem;color:#1e40af;">Academic Results</h4>
             <div style="overflow-x:auto;">
             <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
               <thead><tr style="background:#eff6ff;">
                 <th style="padding:.6rem .9rem;text-align:left;color:#1e40af;font-weight:600;">Subject</th>
                 <th style="padding:.6rem .9rem;text-align:center;">CA</th>
                 <th style="padding:.6rem .9rem;text-align:center;">Exam</th>
                 <th style="padding:.6rem .9rem;text-align:center;">Total</th>
                 <th style="padding:.6rem .9rem;text-align:center;">Grade</th>
               </tr></thead>
               <tbody>
                 ${results.map(r => {
                   const g = _grade(r.total);
                   return `<tr style="border-bottom:1px solid #f3f4f6;">
                     <td style="padding:.6rem .9rem;">${r.subject}</td>
                     <td style="padding:.6rem .9rem;text-align:center;">${r.ca}</td>
                     <td style="padding:.6rem .9rem;text-align:center;">${r.exam}</td>
                     <td style="padding:.6rem .9rem;text-align:center;font-weight:700;">${r.total}</td>
                     <td style="padding:.6rem .9rem;text-align:center;">
                       <span style="padding:.2rem .6rem;border-radius:999px;font-size:.78rem;font-weight:600;
                         background:${r.total>=50?'#dcfce7':'#fee2e2'};color:${r.total>=50?'#166534':'#991b1b'};">
                         ${g.letter}
                       </span>
                     </td>
                   </tr>`;
                 }).join('')}
               </tbody>
             </table></div>
             <div style="margin-top:1rem;padding:1rem;background:#eff6ff;border-radius:8px;font-size:.9rem;">
               <strong>Average:</strong> ${average}% &nbsp;&nbsp;
               <strong>Grade:</strong> ${subjectCount ? _grade(parseFloat(average)).letter : '—'}
             </div>`
        }

        <div style="margin-top:1.5rem;padding:1rem;background:#f1f5f9;border-radius:8px;">
          <strong>Attendance:</strong>
          <div style="display:flex;align-items:center;gap:.75rem;margin-top:.4rem;">
            <div style="flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;">
              <div style="width:${student.attendance||0}%;height:100%;background:${student.attendance<75?'#ef4444':student.attendance<90?'#f59e0b':'#22c55e'};"></div>
            </div>
            <strong style="color:${student.attendance<75?'#ef4444':'#15803d'}">${student.attendance||0}%</strong>
          </div>
        </div>

        <div style="margin-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;">
          <div style="background:#f8fafc;border-radius:8px;padding:1rem;">
            <div style="font-weight:600;color:#334155;margin-bottom:.4rem;">Class Teacher's Remark</div>
            <p style="margin:0;color:#475569;">${remarkEntry.teacherRemark || '—'}</p>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:1rem;">
            <div style="font-weight:600;color:#334155;margin-bottom:.4rem;">Principal's Remark</div>
            <p style="margin:0;color:#475569;">${remarkEntry.principalRemark || '—'}</p>
          </div>
        </div>

        <div style="text-align:right;margin-top:1.5rem;">
          <button onclick="window.print()" style="padding:.6rem 1.4rem;background:#1e3a5f;color:#fff;border:none;
            border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:600;">🖨 Print</button>
        </div>
      </div>
    </div>`;
}

/* Grade helper alias (works even before script2 loads) */
function _grade(score) {
  if (typeof grade === 'function') return grade(score);
  if (score >= 70) return { letter: 'A', remark: 'Excellent' };
  if (score >= 60) return { letter: 'B', remark: 'Very Good' };
  if (score >= 50) return { letter: 'C', remark: 'Good' };
  if (score >= 45) return { letter: 'D', remark: 'Pass' };
  if (score >= 40) return { letter: 'E', remark: 'Weak Pass' };
  return { letter: 'F', remark: 'Fail' };
}

/* Generate token — called from report card admin view */
window.generateParentToken = function (studentId) {
  if (typeof priv !== 'undefined' && !priv.isAdmin()) {
    typeof toast === 'function' && toast('Only Admins can generate tokens.', 'error');
    return;
  }
  const token = 'SHC-PRC-' + new Date().getFullYear() + '-' +
    Math.random().toString(36).substr(2, 6).toUpperCase();

  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  App.data.parentTokens = (App.data.parentTokens || []).filter(t => t.studentId !== studentId);
  App.data.parentTokens.push({
    token, studentId,
    created: new Date().toISOString(),
    expires: expires.toISOString(),
    used: false,
  });

  const student = App.data.students.find(s => s.id === studentId);

  if (typeof showModal === 'function') {
    showModal(`
      <div style="text-align:center;padding:.5rem 0 1rem;">
        <div style="font-size:2rem;margin-bottom:.75rem;">🔑</div>
        <h3 style="margin:0 0 .5rem;">Parent Token Generated</h3>
        ${student ? `<p style="color:#6b7280;margin:0 0 1rem;">${student.name}</p>` : ''}
        <div style="font-family:monospace;font-size:1.4rem;letter-spacing:2px;
                    background:#f1f5f9;padding:1.1rem;border-radius:10px;margin:1rem 0;">
          ${token}
        </div>
        <p style="font-size:.85rem;color:#6b7280;">Valid for 30 days · Expires ${expires.toLocaleDateString()}</p>
        <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.25rem;">
          <button onclick="navigator.clipboard.writeText('${token}').then(()=>{toast('Copied!','success');})"
            style="padding:.55rem 1.2rem;background:#e5e7eb;color:#374151;border:none;border-radius:8px;cursor:pointer;font-weight:500;">📋 Copy</button>
          <button onclick="closeModal()" style="padding:.55rem 1.2rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Close</button>
        </div>
      </div>`);
  } else {
    alert('Token: ' + token);
  }
};


/* ─────────────────────────────────────────────────────────────
   C. TIMETABLE MODULE
───────────────────────────────────────────────────────────── */

(function initTimetableStore() {
  if (!App.data.timetable) App.data.timetable = {};
})();

(function addTimetableNav() {
  document.addEventListener('DOMContentLoaded', function () {
    const navUl = document.querySelector('.sidebar-nav ul');
    if (!navUl || document.getElementById('nav-li-timetable')) return;
    const subLi = document.getElementById('nav-li-subjects');
    if (!subLi) return;
    const li = document.createElement('li');
    li.id = 'nav-li-timetable';
    li.innerHTML = `<a href="#timetable" data-section="timetable"><span class="ni">🗓️</span> Timetable</a>`;
    subLi.insertAdjacentElement('afterend', li);
    const main = document.querySelector('main.page-content');
    if (main && !document.getElementById('timetable')) {
      const sec = document.createElement('section');
      sec.id = 'timetable'; sec.className = 'content-section hidden';
      main.appendChild(sec);
    }
  });
})();

var DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
var PERIODS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00'];

function renderTimetable() {
  if (typeof priv !== 'undefined' && priv.isParent()) { navigate('results'); return; }
  const section = document.getElementById('timetable');
  if (!section) return;

  const canManage = typeof priv !== 'undefined' ? priv.canManage() : true;
  const classOpts = (App.data.classes || []).map(c => `<option>${c.name}</option>`).join('');

  section.innerHTML = `
    <h2 style="margin:0 0 1.5rem;">Class Timetable</h2>

    <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:1.5rem;">
      <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
        <div>
          <label style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.3rem;">Class</label>
          <select id="tt-class" style="padding:.55rem .85rem;border:1px solid #d1d5db;border-radius:8px;font-size:.875rem;" onchange="updateTTArms()">
            <option value="">— Select —</option>${classOpts}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.3rem;">Arm</label>
          <select id="tt-arm" style="padding:.55rem .85rem;border:1px solid #d1d5db;border-radius:8px;font-size:.875rem;">
            <option value="">— Select —</option>
          </select>
        </div>
        <button onclick="loadTimetable()" style="padding:.55rem 1.2rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Load Timetable</button>
      </div>
    </div>

    <div id="timetable-grid"></div>`;
}

window.updateTTArms = function () {
  const cls = document.getElementById('tt-class')?.value;
  const sel = document.getElementById('tt-arm');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select —</option>';
  const cd = (App.data.classes || []).find(c => c.name === cls);
  if (cd) sel.innerHTML += cd.arms.map(a => `<option>${a}</option>`).join('');
};

window.loadTimetable = async function () {
  const cls = document.getElementById('tt-class')?.value;
  const arm = document.getElementById('tt-arm')?.value;
  if (!cls || !arm) return typeof toast === 'function' && toast('Select class and arm.', 'warning');

  const key  = `${cls}_${arm}`;
  const canManage = typeof priv !== 'undefined' ? priv.canManage() : true;
  const subjOpts  = (App.data.subjects || []).map(s => `<option>${s.name}</option>`).join('');

  const grid = document.getElementById('timetable-grid');
  if (!grid) return;
  grid.innerHTML = `<div style="text-align:center;padding:2rem;color:#9ca3af;">Loading…</div>`;

  let tt = {};
  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const res   = await fetch(`${BASE}/timetable?class=${encodeURIComponent(cls)}&arm=${encodeURIComponent(arm)}`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include',
    });
    const data  = await res.json();
    if (data.success) { tt = data.data || {}; App.data.timetable = App.data.timetable || {}; App.data.timetable[key] = tt; }
  } catch (e) {
    tt = App.data.timetable?.[key] || {};
  }

  const cellId = (day, period) => `tt-${key}-${day}-${period}`.replace(/\s+/g, '_');

  grid.innerHTML = `
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <div style="padding:1rem 1.5rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;">
        <h4 style="margin:0;">${cls} ${arm} Timetable</h4>
        ${canManage ? `<div style="display:flex;gap:.5rem;">
          <button onclick="saveTimetable('${cls}','${arm}')" style="padding:.45rem 1.1rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;font-size:.875rem;">💾 Save</button>
          <button onclick="clearTimetable('${cls}','${arm}')" style="padding:.45rem .85rem;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.875rem;">🗑 Clear</button>
        </div>` : ''}
      </div>
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:.65rem 1rem;text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:.8rem;min-width:80px;">Period</th>
          ${DAYS.map(d => `<th style="padding:.65rem 1rem;border-bottom:1px solid #e5e7eb;color:#1e3a5f;font-size:.85rem;min-width:140px;">${d}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${PERIODS.map(period => `
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:.65rem 1rem;font-weight:600;color:#475569;font-size:.82rem;white-space:nowrap;">${period}</td>
              ${DAYS.map(day => {
                const val = (tt[day] && tt[day][period]) || '';
                return `<td style="padding:.4rem .5rem;">
                  ${canManage
                    ? `<select id="${cellId(day,period)}" style="width:100%;padding:.35rem .5rem;border:1px solid #e5e7eb;border-radius:6px;font-size:.82rem;background:#fff;">
                         <option value="">—</option>${subjOpts}
                         ${val && !(App.data.subjects||[]).find(s=>s.name===val) ? `<option value="${val}" selected>${val}</option>` : ''}
                       </select>`
                    : `<span style="font-size:.85rem;color:${val?'#1e3a5f':'#d1d5db'}">${val||'—'}</span>`
                  }
                </td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  // Set selected options after rendering
  if (canManage) {
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const val = (tt[day] && tt[day][period]) || '';
        const sel = document.getElementById(cellId(day, period));
        if (sel && val) {
          const opt = Array.from(sel.options).find(o => o.value === val || o.text === val);
          if (opt) opt.selected = true;
        }
      });
    });
  }
};

window.saveTimetable = async function (cls, arm) {
  const key = `${cls}_${arm}`;
  const grid = {};
  DAYS.forEach(day => {
    grid[day] = {};
    PERIODS.forEach(period => {
      const cellId = `tt-${key}-${day}-${period}`.replace(/\s+/g, '_');
      const val = document.getElementById(cellId)?.value || '';
      if (val) grid[day][period] = val;
    });
  });

  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const res   = await fetch(`${BASE}/timetable`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ class: cls, arm, grid }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    // Update local cache
    App.data.timetable = App.data.timetable || {};
    App.data.timetable[key] = grid;
    typeof toast === 'function' && toast('Timetable saved!', 'success');
  } catch (err) {
    typeof toast === 'function' && toast('Error saving timetable: ' + (err.message || 'Unknown error'), 'error');
  }
};


window.clearTimetable = async function (cls, arm) {
  if (!confirm(`Clear the entire timetable for ${cls} ${arm}? This cannot be undone.`)) return;
  try {
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    await fetch(`${BASE}/timetable?class=${encodeURIComponent(cls)}&arm=${encodeURIComponent(arm)}`, {
      method: 'DELETE', credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    const key = `${cls}_${arm}`;
    if (App.data.timetable) delete App.data.timetable[key];
    typeof toast === 'function' && toast(`Timetable cleared for ${cls} ${arm}.`, 'warning');
    loadTimetable();
  } catch (err) {
    typeof toast === 'function' && toast('Error clearing timetable: ' + (err.message || 'Unknown error'), 'error');
  }
};

/* ─────────────────────────────────────────────────────────────
   D. NOTIFICATIONS CENTRE
───────────────────────────────────────────────────────────── */

(function initNotifications() {
  if (!App.data.notifications) App.data.notifications = [];
})();

/** Push a notification. Call this from anywhere in the app. */
window.pushNotification = function (message, type = 'info', link = '') {
  App.data.notifications.unshift({
    id: Date.now(), message, type, link,
    time: new Date().toISOString(), read: false,
  });
  _updateNotificationBadge();
};

function _updateNotificationBadge() {
  const unread = (App.data.notifications || []).filter(n => !n.read).length;
  let badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = unread > 9 ? '9+' : unread;
  badge.style.display = unread > 0 ? 'inline-flex' : 'none';
}

(function injectNotificationBell() {
  document.addEventListener('DOMContentLoaded', function () {
    const topRight = document.querySelector('.topbar-right');
    if (!topRight || document.getElementById('notif-bell')) return;

    const bell = document.createElement('button');
    bell.id = 'notif-bell';
    bell.title = 'Notifications';
    bell.style.cssText = 'position:relative;background:none;border:1px solid #e2e8f0;border-radius:8px;padding:.32rem .65rem;cursor:pointer;font-size:1rem;color:#475569;transition:background .15s;';
    bell.innerHTML = `🔔<span id="notif-badge" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;font-size:.62rem;font-weight:700;padding:.1rem .35rem;border-radius:99px;display:none;align-items:center;justify-content:center;"></span>`;
    bell.onclick = openNotificationsPanel;
    topRight.insertBefore(bell, topRight.firstChild);

    _updateNotificationBadge();
  });
})();

function openNotificationsPanel() {
  const notifications = App.data.notifications || [];
  notifications.forEach(n => n.read = true);
  _updateNotificationBadge();

  if (typeof showModal !== 'function') return;

  showModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
      <h3 style="margin:0;">Notifications</h3>
      <div style="display:flex;gap:.5rem;">
        <button onclick="clearAllNotifications()" style="padding:.3rem .75rem;background:#e5e7eb;color:#374151;border:none;border-radius:7px;cursor:pointer;font-size:.8rem;">Clear All</button>
        <button onclick="closeModal()" style="padding:.3rem .75rem;background:#1e3a5f;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.8rem;">Close</button>
      </div>
    </div>
    ${notifications.length === 0
      ? '<div style="text-align:center;padding:3rem;color:#9ca3af;"><div style="font-size:2.5rem;margin-bottom:.5rem;">🔕</div>No notifications</div>'
      : `<div style="display:flex;flex-direction:column;gap:.6rem;max-height:420px;overflow-y:auto;">
           ${notifications.slice(0, 50).map(n => `
             <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.75rem;border-radius:8px;background:${n.read?'#f9fafb':'#eff6ff'};">
               <span style="font-size:1.1rem;">${n.type==='success'?'✅':n.type==='warning'?'⚠️':n.type==='error'?'❌':'ℹ️'}</span>
               <div style="flex:1;">
                 <div style="font-size:.875rem;color:#1e293b;">${n.message}</div>
                 <div style="font-size:.75rem;color:#94a3b8;margin-top:.2rem;">${_relativeTime(n.time)}</div>
               </div>
             </div>`).join('')}
         </div>`
    }`);
}

window.clearAllNotifications = function () {
  App.data.notifications = [];
  _updateNotificationBadge();
  closeModal();
};

function _relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}


/* ─────────────────────────────────────────────────────────────
   E. DATA EXPORT (CSV helpers) + JSON BACKUP / RESTORE
   These fill the stubs left incomplete in script2.js
───────────────────────────────────────────────────────────── */

function _downloadCSV(rows, filename) {
  const csv = rows.map(r =>
    r.map(cell => {
      const s = String(cell == null ? '' : cell).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* Exposed helpers called from settings stubs */
window.exportData = function () {
  const json = JSON.stringify(App.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const ts   = new Date().toISOString().split('T')[0];
  const a    = Object.assign(document.createElement('a'), { href: url, download: `SHC_backup_${ts}.json` });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  typeof toast === 'function' && toast('Backup downloaded!', 'success');
};

window.importBackup = function () {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.students || !parsed.classes) throw new Error('Invalid backup file.');
        if (!confirm('Restore backup? Current data will be replaced.')) return;
        Object.assign(App.data, parsed);
        typeof toast === 'function' && toast('Data restored successfully!', 'success');
        if (typeof navigate === 'function') navigate('dashboard');
      } catch (err) {
        typeof toast === 'function' && toast('Restore failed: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

window.clearResults = function () {
  if (!confirm('Clear ALL academic results? This cannot be undone.')) return;
  App.data.results = [];
  App.data.remarks = [];
  typeof toast === 'function' && toast('All results cleared.', 'warning');
};

window.clearAttendance = function () {
  if (!confirm('Clear ALL attendance records? This cannot be undone.')) return;
  App.data.attendance = [];
  App.data.attendanceRecords = [];
  App.data.students.forEach(s => { s.attendance = 0; });
  typeof toast === 'function' && toast('Attendance records cleared.', 'warning');
};

window.exportStudentsCSV = function () {
  const rows = [['Student ID', 'Name', 'Class', 'Arm', 'Gender', 'DOB', 'Parent', 'Phone', 'Attendance %']];
  (App.data.students || []).forEach(s =>
    rows.push([s.id, s.name, s.class, s.arm, s.gender, s.dob||'', s.parent||'', s.phone||'', s.attendance||0]));
  _downloadCSV(rows, 'students_export.csv');
  typeof toast === 'function' && toast('Students exported!', 'success');
};

window.exportResultsCSV = function () {
  const rows = [['Student ID', 'Name', 'Class', 'Arm', 'Subject', 'CA', 'Exam', 'Total', 'Grade', 'Term', 'Session']];
  (App.data.results || []).forEach(r => {
    const s = (App.data.students || []).find(st => st.id === r.studentId);
    const g = _grade(r.total);
    rows.push([r.studentId, s?.name||'', r.class||'', r.arm||'', r.subject, r.ca, r.exam, r.total, g.letter, r.term, r.session]);
  });
  _downloadCSV(rows, 'results_export.csv');
  typeof toast === 'function' && toast('Results exported!', 'success');
};


/* ─────────────────────────────────────────────────────────────
   F. DOMAIN ASSESSMENTS CRUD
   script2.js reads domain scores but never writes them via UI.
   This fills that gap.
───────────────────────────────────────────────────────────── */

(function initDomainStore() {
  if (!App.data.domainAssessments) App.data.domainAssessments = [];
})();

/**
 * Called from attendance table after saving to open domain assessment.
 * Can also be called directly from student profile.
 */
window.openDomainAssessmentModal = function (studentId, term, session) {
  if (!App.data.students) return;
  const student = App.data.students.find(s => s.id === studentId);
  if (!student) return;

  const t = term    || App.data.schoolInfo.term;
  const sess = session || App.data.schoolInfo.session;
  const existing = (App.data.domainAssessments || []).find(d =>
    d.studentId === studentId && d.term === t && d.session === sess) || {};

  const scale = [
    { val: 5, label: 'Excellent' },
    { val: 4, label: 'Very Good' },
    { val: 3, label: 'Good' },
    { val: 2, label: 'Fair' },
    { val: 1, label: 'Needs Improvement' },
  ];

  const selectEl = (id, current) =>
    `<select id="${id}" style="width:100%;padding:.55rem .75rem;border:1px solid #d1d5db;border-radius:8px;font-size:.875rem;">
       <option value="">— Rate —</option>
       ${scale.map(s => `<option value="${s.val}" ${current==s.val?'selected':''}>${s.val} – ${s.label}</option>`).join('')}
     </select>`;

  if (typeof showModal !== 'function') return;

  showModal(`
    <h3 style="margin:0 0 .25rem;">Domain Assessment</h3>
    <p style="color:#6b7280;font-size:.875rem;margin:0 0 1.5rem;">${student.name} · ${t} · ${sess}</p>

    <div style="display:grid;gap:1rem;">
      <div>
        <label style="display:block;font-size:.875rem;font-weight:600;color:#1e40af;margin-bottom:.3rem;">🧠 Cognitive Domain</label>
        <p style="font-size:.8rem;color:#94a3b8;margin:0 0 .4rem;">Knowledge, understanding, application, analysis</p>
        ${selectEl('da-cognitive', existing.cognitive)}
      </div>
      <div>
        <label style="display:block;font-size:.875rem;font-weight:600;color:#be185d;margin-bottom:.3rem;">💛 Affective Domain</label>
        <p style="font-size:.8rem;color:#94a3b8;margin:0 0 .4rem;">Attitude, interest, participation, cooperation</p>
        ${selectEl('da-affective', existing.affective)}
      </div>
      <div>
        <label style="display:block;font-size:.875rem;font-weight:600;color:#15803d;margin-bottom:.3rem;">🤸 Psychomotor Domain</label>
        <p style="font-size:.8rem;color:#94a3b8;margin:0 0 .4rem;">Practical skills, sports, fine motor activities</p>
        ${selectEl('da-psychomotor', existing.psychomotor)}
      </div>
    </div>

    <div style="display:flex;gap:.75rem;margin-top:1.5rem;justify-content:flex-end;">
      <button onclick="closeModal()" style="padding:.55rem 1.1rem;background:#e5e7eb;color:#374151;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Cancel</button>
      <button onclick="saveDomainAssessment('${studentId}','${t}','${sess}')" style="padding:.55rem 1.1rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:500;">💾 Save</button>
    </div>`);
};

window.saveDomainAssessment = function (studentId, term, session) {
  const cognitive   = parseFloat(document.getElementById('da-cognitive')?.value)   || null;
  const affective   = parseFloat(document.getElementById('da-affective')?.value)   || null;
  const psychomotor = parseFloat(document.getElementById('da-psychomotor')?.value) || null;

  const existing = (App.data.domainAssessments || []).findIndex(d =>
    d.studentId === studentId && d.term === term && d.session === session);

  const record = { studentId, term, session, cognitive, affective, psychomotor };
  if (existing >= 0) App.data.domainAssessments[existing] = record;
  else App.data.domainAssessments.push(record);

  closeModal();
  typeof toast === 'function' && toast('Domain assessment saved!', 'success');
};

/**
 * Override getDomainScores so report cards pull real data.
 * Declared in script2.js but uses empty domainAssessments array.
 */
window.getDomainScores = function (studentId, term, session) {
  const record = (App.data.domainAssessments || []).find(d =>
    d.studentId === studentId && d.term === term && d.session === session) || {};
  return {
    cognitive:   record.cognitive   || null,
    affective:   record.affective   || null,
    psychomotor: record.psychomotor || null,
  };
};


/* ─────────────────────────────────────────────────────────────
   G. DASHBOARD ATTENDANCE SUMMARY CARDS (live data wiring)
   script2.js generates placeholder "—" cards; this patches them.
───────────────────────────────────────────────────────────── */

function patchAttendanceSummaryCards(cls, arm, date) {
  const records = (App.data.attendanceRecords || []).filter(r =>
    r.class === cls && r.arm === arm && r.date === date);

  const counts = { present: 0, late: 0, excused: 0, absent: 0 };
  let cogSum = 0, affSum = 0, psySum = 0;
  let cogN = 0, affN = 0, psyN = 0;

  records.forEach(r => {
    const s = r.status || 'absent';
    counts[s] = (counts[s] || 0) + 1;
    if (r.cognitive   != null) { cogSum += r.cognitive;   cogN++; }
    if (r.affective   != null) { affSum += r.affective;   affN++; }
    if (r.psychomotor != null) { psySum += r.psychomotor; psyN++; }
  });

  const summaryData = [
    { label: 'Present Today',    count: counts.present,                              color: '#22c55e' },
    { label: 'Late / Excused',   count: counts.late + counts.excused,                color: '#f59e0b' },
    { label: 'Absent Today',     count: counts.absent,                               color: '#ef4444' },
    { label: 'Avg. Cognitive',   count: cogN  ? (cogSum  / cogN ).toFixed(1) : '—', color: '#3b82f6' },
    { label: 'Avg. Affective',   count: affN  ? (affSum  / affN ).toFixed(1) : '—', color: '#8b5cf6' },
    { label: 'Avg. Psychomotor', count: psyN  ? (psySum  / psyN ).toFixed(1) : '—', color: '#ec4899' },
  ];

  const summaryDiv = document.getElementById('summary-section');
  if (!summaryDiv) return;

  const h3 = summaryDiv.querySelector('h3');
  if (h3) h3.textContent = `Class Summary – ${cls} ${arm} – ${date}`;

  const gridDiv = summaryDiv.querySelector('div');
  if (!gridDiv) return;

  gridDiv.innerHTML = summaryData.map(d => `
    <div style="background:#fff;border-radius:12px;padding:1.25rem;box-shadow:0 3px 10px rgba(0,0,0,.06);border-left:5px solid ${d.color};">
      <div style="font-size:.9rem;color:#6b7280;margin-bottom:.4rem;">${d.label}</div>
      <div style="font-size:2.1rem;font-weight:700;color:${d.color};">${d.count}</div>
    </div>`).join('');

  summaryDiv.style.display = 'block';
}

/* Patch saveAttendanceAndMarks to call summary update after save */
(function patchSaveAttendance() {
  const _orig = window.saveAttendanceAndMarks;
  if (typeof _orig !== 'function') return;
  window.saveAttendanceAndMarks = function (cls, arm, date) {
    _orig(cls, arm, date);
    setTimeout(() => patchAttendanceSummaryCards(cls, arm, date), 100);
  };
})();


/* ─────────────────────────────────────────────────────────────
   H. SUBJECT LIMIT ENFORCEMENT  (SS2 / SS3 → max 9 subjects)
   script3.js injects validation into loadResultEntry & save.
───────────────────────────────────────────────────────────── */

function _getStudentSubjectCount(studentId, term, session) {
  return (App.data.results || [])
    .filter(r => r.studentId === studentId && r.term === term && r.session === session)
    .reduce((set, r) => { set.add(r.subject); return set; }, new Set()).size;
}

/* Patch saveAllResults to check subject cap */
(function patchSaveAllResults() {
  const _orig = window.saveAllResults;
  if (typeof _orig !== 'function') return;
  window.saveAllResults = function (cls, arm, subject, term, session) {
    const capClasses = ['SS 2', 'SS 3'];
    if (capClasses.includes(cls)) {
      let blocked = 0;
      document.querySelectorAll('#result-rows tr').forEach(row => {
        const sid = row.dataset.sid;
        const ca  = parseFloat(row.querySelector('.ca-input')?.value);
        if (isNaN(ca)) return;
        const existing = _getStudentSubjectCount(sid, term, session);
        const alreadyHas = (App.data.results || []).some(r =>
          r.studentId === sid && r.subject === subject && r.term === term && r.session === session);
        if (!alreadyHas && existing >= 9) blocked++;
      });
      if (blocked > 0) {
        typeof toast === 'function' &&
          toast(`⚠ ${blocked} student(s) already have 9 subjects. Results not saved for those students.`, 'warning');
      }
    }
    _orig(cls, arm, subject, term, session);
  };
})();

/* Also validate on bulk Excel save */
(function patchSaveBulkExcel() {
  const _orig = window.saveBulkExcelResults;
  if (typeof _orig !== 'function') return;
  window.saveBulkExcelResults = function () {
    const cls = document.getElementById('bulk-res-class')?.value;
    const capClasses = ['SS 2', 'SS 3'];

    if (capClasses.includes(cls)) {
      const rows = (window._parsedExcelRows || []).filter(r => r.ok);
      const subjectsByStudent = {};
      rows.forEach(r => {
        if (!subjectsByStudent[r.sid]) subjectsByStudent[r.sid] = new Set();
        subjectsByStudent[r.sid].add(r.subject);
      });
      for (const sid in subjectsByStudent) {
        const existing = _getStudentSubjectCount(sid,
          rows.find(r => r.sid === sid)?.term || App.data.schoolInfo.term,
          App.data.schoolInfo.session);
        if (existing + subjectsByStudent[sid].size > 9) {
          typeof toast === 'function' &&
            toast(`Student ${sid}: exceeds 9-subject limit for ${cls}. Import blocked.`, 'error');
          return;
        }
      }
    }
    _orig();
  };
})();


/* ─────────────────────────────────────────────────────────────
   I. FIXED printReportCard
   The version in script2.js has a bug: it references
   undefined variables `schoolName`, `term`, `session`.
   This overrides it with a correct implementation.
───────────────────────────────────────────────────────────── */

window.printReportCard = function (btn) {
  const card = btn?.closest?.('.report-card');
  if (!card) return;

  /* Clone and sanitise */
  const clone = card.cloneNode(true);
  clone.querySelectorAll('button').forEach(b => b.remove());
  clone.querySelectorAll('input, select').forEach(el => {
    const p = document.createElement('p');
    p.textContent = el.value || el.textContent || '';
    p.style.margin = '0';
    el.replaceWith(p);
  });

  const school  = App.data?.schoolInfo?.name    || 'Sacred Heart College';
  const term    = document.getElementById('rc-term')?.value    || App.data?.schoolInfo?.term    || '';
  const session = document.getElementById('rc-session')?.value || App.data?.schoolInfo?.session || '';

  const win = window.open('', '_blank', 'width=900,height=1150');
  if (!win) {
    typeof toast === 'function' && toast('Popup blocked — allow popups to print.', 'warning');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Report Card – ${school}</title>
<style>
  @page { size:A4; margin:1.5cm; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Arial",sans-serif; font-size:11pt; color:#111; background:#fff; }
  h1,h2,h3,h4 { color:#0f172a; }
  table { border-collapse:collapse; width:100%; margin:.75em 0; font-size:9.5pt; }
  th,td { border:1px solid #aaa; padding:.4em .7em; text-align:left; }
  th { background:#f1f5f9; font-weight:600; color:#334155; text-transform:uppercase; font-size:8.5pt; }
  .rc-header { text-align:center; margin-bottom:1.5rem; }
  .rc-header h1 { font-size:18pt; }
  .rc-header p  { font-size:11pt; color:#475569; margin-top:.25rem; }
  .report-card  { max-width:19cm; margin:0 auto; }
  .report-card > div[style*="linear-gradient"] { background:#1e3a8a !important; color:white; padding:1.5rem; text-align:center; }
  @media print { body { margin:0; } }
</style>
</head><body>
<div class="report-card">${clone.innerHTML}</div>
<script>window.onload=function(){setTimeout(window.print,600);}<\/script>
</body></html>`);
  win.document.close();
};


/* ─────────────────────────────────────────────────────────────
   J. GLOBAL SEARCH
───────────────────────────────────────────────────────────── */

(function injectGlobalSearch() {
  document.addEventListener('DOMContentLoaded', function () {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('global-search-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'global-search-wrap';
    wrap.style.cssText = 'position:relative;flex:1;max-width:260px;';
    wrap.innerHTML = `
      <input id="global-search" placeholder="🔍 Search students, staff…"
        style="width:100%;padding:.38rem .85rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.83rem;outline:none;background:#f8fafc;"
        autocomplete="off" oninput="globalSearch(this.value)" onblur="setTimeout(closeGlobalSearch,200)">
      <div id="global-search-results" style="position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border-radius:10px;
        box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:500;max-height:320px;overflow-y:auto;display:none;"></div>`;

    const crumb = topbar.querySelector('.topbar-crumb');
    if (crumb) crumb.insertAdjacentElement('afterend', wrap);
  });
})();

window.globalSearch = function (q) {
  const results = document.getElementById('global-search-results');
  if (!results) return;
  const query = q.trim().toLowerCase();
  if (!query) { results.style.display = 'none'; return; }

  const hits = [];

  /* Students */
  (App.data.students || []).forEach(s => {
    if (s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query)) {
      hits.push({
        icon: '🎒', label: s.name,
        sub: `${s.id} · ${s.class} ${s.arm}`,
        action: () => { if (typeof navigate === 'function') navigate('students'); }
      });
    }
  });

  /* Teachers */
  (App.data.teachers || []).forEach(t => {
    if (t.name.toLowerCase().includes(query) || (t.subject||'').toLowerCase().includes(query)) {
      hits.push({
        icon: '👩‍🏫', label: t.name,
        sub: `${t.id} · ${t.subject}`,
        action: () => { if (typeof navigate === 'function') navigate('teachers'); }
      });
    }
  });

  /* Subjects */
  (App.data.subjects || []).forEach(s => {
    if (s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)) {
      hits.push({
        icon: '📚', label: s.name,
        sub: `${s.code} · ${s.type}`,
        action: () => { if (typeof navigate === 'function') navigate('subjects'); }
      });
    }
  });

  if (hits.length === 0) {
    results.innerHTML = '<div style="padding:1rem;text-align:center;color:#9ca3af;font-size:.875rem;">No results found.</div>';
  } else {
    results.innerHTML = hits.slice(0, 12).map((h, i) => `
      <div onclick="(${h.action.toString()})()" id="gs-hit-${i}"
        style="display:flex;align-items:center;gap:.65rem;padding:.6rem .9rem;cursor:pointer;transition:background .1s;"
        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
        <span style="font-size:1.1rem;">${h.icon}</span>
        <div>
          <div style="font-size:.875rem;font-weight:500;color:#1e293b;">${_highlight(h.label, query)}</div>
          <div style="font-size:.75rem;color:#94a3b8;">${h.sub}</div>
        </div>
      </div>`).join('');
  }

  results.style.display = 'block';
};

window.closeGlobalSearch = function () {
  const r = document.getElementById('global-search-results');
  if (r) r.style.display = 'none';
};

function _highlight(text, query) {
  if (!query) return text;
  const re  = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background:#fef08a;border-radius:2px;">$1</mark>');
}


/* ─────────────────────────────────────────────────────────────
   K. Wire navigate() to handle fees & timetable sections
   (extends the patch at the top without duplication)
───────────────────────────────────────────────────────────── */

(function extendNavigateForNewSections() {
  const _orig = window.navigate;
  window.navigate = function (sectionId) {
    _orig(sectionId);
    if (sectionId === 'fees')      renderFees();
    if (sectionId === 'timetable') renderTimetable();
  };
})();


/* ─────────────────────────────────────────────────────────────
   L. MISC FIXES & SAFETY NETS
───────────────────────────────────────────────────────────── */

/* Ensure attendanceRecords exists (script2.js uses both names) */
(function normaliseAttendanceStore() {
  if (!App.data.attendanceRecords) App.data.attendanceRecords = App.data.attendance || [];
  App.data.attendance = App.data.attendanceRecords; /* keep alias in sync */
})();

/* Fix: computePosition is referenced in script2.js report cards but
   may not be hoisted in time on some browsers. Re-expose here. */
window.computePosition = window.computePosition || function (studentId, cls, arm, term, session) {
  const students = (App.data.students || []).filter(s => s.class === cls && s.arm === arm);
  const scores = students.map(s => {
    const results = (App.data.results || []).filter(r =>
      r.studentId === s.id && r.term === term && r.session === session);
    return { id: s.id, avg: results.length ? results.reduce((a, b) => a + b.total, 0) / results.length : 0 };
  }).sort((a, b) => b.avg - a.avg);
  const idx = scores.findIndex(s => s.id === studentId);
  const ordSuffix = n => { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
  return idx < 0 ? 'N/A' : `${ordSuffix(idx + 1)} / ${students.length}`;
};

/* Fix domainLabel — referenced in report cards */
window.domainLabel = window.domainLabel || function (score) {
  if (!score) return 'Not assessed';
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Very Good';
  if (score >= 2.5) return 'Good';
  if (score >= 1.5) return 'Fair';
  return 'Needs Improvement';
};

/* Seed parentTokens store */
if (!App.data.parentTokens) App.data.parentTokens = [];

/* Add domain assessment button to attendance rows after they load */
(function patchLoadAttendance() {
  const _orig = window.loadAttendance;
  if (typeof _orig !== 'function') return;
  window.loadAttendance = function () {
    _orig();
    /* Inject domain assessment buttons into each row */
    setTimeout(() => {
      document.querySelectorAll('#att-rows tr[data-sid]').forEach(row => {
        const sid = row.dataset.sid;
        const lastCell = row.lastElementChild;
        if (!lastCell || lastCell.querySelector('.domain-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'domain-btn';
        btn.textContent = '🧠';
        btn.title = 'Domain Assessment';
        btn.style.cssText = 'padding:.25rem .5rem;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;cursor:pointer;font-size:.85rem;margin-left:.4rem;';
        btn.onclick = () => openDomainAssessmentModal(
          sid,
          document.getElementById('res-term')?.value || App.data.schoolInfo.term,
          App.data.schoolInfo.session
        );
        lastCell.appendChild(btn);
      });
    }, 200);
  };
})();

/* ─────────────────────────────────────────────────────────────
   INIT – extend the existing init without re-running it
───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
  /* Ensure new nav sections redirect correctly when hash is used */
  ['fees', 'timetable'].forEach(id => {
    const li = document.getElementById(`nav-li-${id}`);
    if (!li) return;
    const a = li.querySelector('a');
    if (a) a.addEventListener('click', e => {
      e.preventDefault();
      if (typeof navigate === 'function') navigate(id);
    });
  });

  /* Push a welcome notification */
  setTimeout(() => {
    const s = App.data;
    const lowAtt = (s.students || []).filter(st => (st.attendance || 100) < 75).length;
    if (lowAtt > 0) pushNotification(`${lowAtt} student(s) have attendance below 75%.`, 'warning');
    const pending = (s.results || []).length === 0 ? null : null; // placeholder
    if ((s.classes || []).length && !(s.results || []).length)
      pushNotification('No results recorded yet. Start by entering results.', 'info');
  }, 800);
});
/* ═══════════════════════════════════════════════════════════════════════════
   B. FEE SETUP  —  Admin + Bursar only
   Dashboard sidebar 📋 Fee Setup.
   All payment recording, receipts, ledger → student-finance.html
═══════════════════════════════════════════════════════════════════════════ */

/* ── nav case wired in script.js navigate() → calls renderFees() ── */

let _feeSetupTab = 'fees';

function renderFees() {
  const isBursar = App.currentUser?.role === 'Bursar';
  if (!priv.isAdmin() && !isBursar) { accessDeniedPage('fees'); return; }
  const section = document.getElementById('fees');
  if (!section) return;

  const T = id =>
    'padding:.5rem 1.1rem;border:none;cursor:pointer;font-weight:600;font-size:.83rem;border-radius:8px;transition:all .15s;' +
    (_feeSetupTab === id ? 'background:#1e3a5f;color:#fff;' : 'background:#f1f5f9;color:#475569;');

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem;flex-wrap:wrap;gap:.75rem;">
      <h2 style="margin:0;">📋 Fee Setup</h2>
      <button onclick="window.open('student-finance.html','_blank')"
        style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;
               padding:.55rem 1.3rem;border-radius:10px;font-weight:700;cursor:pointer;font-size:.875rem;">
        🏦 Open Finance Portal →
      </button>
    </div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1.25rem;">
      <button onclick="feeSetupSwitchTab('fees')"   style="${T('fees')}">📌 Regular Fees</button>
      <button onclick="feeSetupSwitchTab('levies')" style="${T('levies')}">🎯 Levies</button>
      <button onclick="feeSetupSwitchTab('all')"    style="${T('all')}">📋 All Templates</button>
      <button onclick="feeSetupSwitchTab('charge')" style="${T('charge')}">⚡ Bulk Charge</button>
    </div>
    <div id="fee-setup-body"></div>`;

  feeSetupLoadTab(_feeSetupTab);
}

window.feeSetupSwitchTab = function(tab) { _feeSetupTab = tab; renderFees(); };

function feeSetupLoadTab(tab) {
  const el = document.getElementById('fee-setup-body');
  if (!el) return;
  if      (tab === 'fees')   feeTabRegular(el);
  else if (tab === 'levies') feeTabLevies(el);
  else if (tab === 'all')    feeTabAll(el);
  else if (tab === 'charge') feeTabCharge(el);
}

/* ── shared helpers ── */
const _fsClassOpts = () => (App.data.classes||[]).map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
const _fsTermOpts  = () => ['First Term','Second Term','Third Term'].map(t=>`<option value="${t}">${t}</option>`).join('');
const _fsSession   = () => App.data.schoolInfo?.session || '';
const _fsCurrency  = n  => '₦' + parseFloat(n||0).toLocaleString();

/* ══════════════════════════════════════════════════════════════════
   TAB 1 — REGULAR FEES
══════════════════════════════════════════════════════════════════ */
function feeTabRegular(el) {
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:minmax(300px,360px) 1fr;gap:1.25rem;align-items:start;flex-wrap:wrap;">

      <!-- CREATE FORM -->
      <div style="background:#fff;border-radius:12px;padding:1.4rem;box-shadow:0 2px 8px rgba(0,0,0,.07);position:sticky;top:1rem;">
        <h4 style="margin:0 0 1rem;color:#1e3a5f;font-size:.95rem;padding-bottom:.75rem;border-bottom:1px solid #e5e7eb;">➕ New Fee Template</h4>
        <div style="display:flex;flex-direction:column;gap:.75rem;">

          <div>
            <label style="${labelStyle()}">Fee Name *</label>
            <input id="fs-ft-label" placeholder="e.g. School Fees, PTA Levy, Computer Levy"
              style="${inputStyle()};width:100%;" autocomplete="off">
          </div>

          <div>
            <label style="${labelStyle()}">Amount (₦) *</label>
            <input id="fs-ft-amount" type="number" min="0" step="100" placeholder="0"
              style="${inputStyle()};width:100%;">
          </div>

          <div style="background:#f8fafc;border-radius:8px;padding:.9rem;border:1px solid #e5e7eb;">
            <div style="font-size:.73rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem;">Who pays?</div>
            <select id="fs-ft-level" onchange="feeSetupToggleClass('fs-ft-class-wrap','fs-ft-level')" style="${selectStyle()};width:100%;">
              <option value="All">All Classes</option>
              <option value="Junior">Junior Classes only (JSS 1–3)</option>
              <option value="Senior">Senior Classes only (SS 1–3)</option>
              <option value="Class">One Specific Class</option>
            </select>
            <div id="fs-ft-class-wrap" style="margin-top:.6rem;display:none;">
              <label style="${labelStyle()}">Select Class</label>
              <select id="fs-ft-class" style="${selectStyle()};width:100%;">
                <option value="">— pick class —</option>${_fsClassOpts()}
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
            <div>
              <label style="${labelStyle()}">Term</label>
              <select id="fs-ft-term" style="${selectStyle()};width:100%;">
                <option value="">Every Term</option>${_fsTermOpts()}
              </select>
            </div>
            <div>
              <label style="${labelStyle()}">Session</label>
              <input id="fs-ft-session" value="${_fsSession()}" placeholder="e.g. 2025/2026"
                style="${inputStyle()};width:100%;">
            </div>
          </div>

          <div>
            <label style="${labelStyle()}">Description (optional)</label>
            <textarea id="fs-ft-desc" rows="2" placeholder="Brief note about this fee"
              style="${inputStyle()};resize:none;width:100%;"></textarea>
          </div>

          <label style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;cursor:pointer;">
            <input type="checkbox" id="fs-ft-mandatory" checked style="width:15px;height:15px;">
            Mandatory
          </label>

          <button onclick="feeSetupSubmitFee()"
            style="${btnStyle('primary')};width:100%;justify-content:center;padding:.7rem;">
            💾 Save Fee Template
          </button>
        </div>
      </div>

      <!-- LIST -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem;">
          <h4 style="margin:0;font-size:.9rem;color:#374151;">Saved Fee Templates</h4>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <select id="fs-fl-class" onchange="feeSetupLoadFeeList()" style="${selectStyle()}">
              <option value="">All Classes</option>${_fsClassOpts()}
            </select>
            <select id="fs-fl-term" onchange="feeSetupLoadFeeList()" style="${selectStyle()}">
              <option value="">All Terms</option>${_fsTermOpts()}
            </select>
          </div>
        </div>
        <div id="fs-fee-list"></div>
      </div>
    </div>`;

  feeSetupLoadFeeList();
}

window.feeSetupToggleClass = function(wrapId, selectId) {
  const v = document.getElementById(selectId)?.value;
  const w = document.getElementById(wrapId);
  if (w) w.style.display = v === 'Class' ? '' : 'none';
};

window.feeSetupLoadFeeList = async function() {
  const el   = document.getElementById('fs-fee-list');
  if (!el) return;
  const cls  = document.getElementById('fs-fl-class')?.value;
  const term = document.getElementById('fs-fl-term')?.value;
  el.innerHTML = `<div style="text-align:center;padding:1.5rem;color:#9ca3af;">Loading…</div>`;
  try {
    const resp  = await Fees.getStructure(cls ? { class: cls } : {});
    let   items = resp.data || [];
    if (term) items = items.filter(f => !f.term || f.term === term);

    if (!items.length) {
      el.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;
                    color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">
          <div style="font-size:2.5rem;margin-bottom:.5rem;">📌</div>
          <p style="margin:0;">No fee templates yet.<br>Use the form to create one.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">FEE NAME</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">APPLIES TO</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">TERM</th>
            <th style="padding:.6rem 1rem;text-align:right;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">AMOUNT</th>
            <th style="padding:.6rem 1rem;text-align:center;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTIONS</th>
          </tr></thead>
          <tbody>
            ${items.map(f => `
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:.6rem 1rem;">
                  <div style="font-weight:600;">${f.label}</div>
                  ${f.description ? `<div style="font-size:.72rem;color:#9ca3af;">${f.description}</div>` : ''}
                </td>
                <td style="padding:.6rem 1rem;font-size:.82rem;color:#475569;">${f.class_name || f.level || 'All'}</td>
                <td style="padding:.6rem 1rem;font-size:.82rem;color:#475569;">${f.term || 'Every Term'}</td>
                <td style="padding:.6rem 1rem;text-align:right;font-weight:700;color:#059669;">${_fsCurrency(f.amount)}</td>
                <td style="padding:.6rem 1rem;text-align:center;">
                  <div style="display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap;">
                    <button onclick="feeSetupEditFee(${JSON.stringify(f).replace(/"/g,'&quot;')})"
                      style="${btnStyle('outline','sm')}" title="Edit">✏️</button>
                    <button onclick="feeSetupChargeNow('fee',${f.id},'${f.label.replace(/'/g,"\\'")}',${f.amount},'${f.class_name||''}','${f.level||'All'}')"
                      style="${btnStyle('secondary','sm')}" title="Re-charge any students not yet charged">⚡ Re-charge</button>
                    <button onclick="feeSetupDeleteFee(${f.id})"
                      style="${btnStyle('danger','sm')}">🗑</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = `<p style="color:#ef4444;padding:1rem;">Error: ${e.message}</p>`;
  }
};

window.feeSetupSubmitFee = async function() {
  const label = document.getElementById('fs-ft-label')?.value?.trim();
  const amt   = parseFloat(document.getElementById('fs-ft-amount')?.value || 0);
  if (!label)  { toast('Fee name is required', 'error'); return; }
  if (!amt)    { toast('Enter a valid amount', 'error'); return; }
  const level = document.getElementById('fs-ft-level')?.value;
  const cls   = level === 'Class' ? (document.getElementById('fs-ft-class')?.value || '') : '';
  if (level === 'Class' && !cls) { toast('Select a specific class', 'error'); return; }
  const payload = {
    label, amount: amt,
    level:       level === 'Class' ? 'All' : level,
    class_name:  cls  || null,
    term:        document.getElementById('fs-ft-term')?.value    || null,
    session:     document.getElementById('fs-ft-session')?.value || null,
    description: document.getElementById('fs-ft-desc')?.value    || null,
    mandatory:   document.getElementById('fs-ft-mandatory')?.checked ? 1 : 0,
  };
  try {
    const resp = cls
      ? await Fees.assignFeeToClass({ ...payload, class_name: cls })
      : await Fees.addStructureItem(payload);
    // reset form
    ['fs-ft-label','fs-ft-amount','fs-ft-desc'].forEach(id => {
      const e = document.getElementById(id); if (e) e.value = '';
    });
    document.getElementById('fs-ft-level').value   = 'All';
    document.getElementById('fs-ft-term').value    = '';
    document.getElementById('fs-ft-session').value = _fsSession();
    document.getElementById('fs-ft-mandatory').checked = true;
    document.getElementById('fs-ft-class-wrap').style.display = 'none';
    const charged = resp?.data?.autoCharged || resp?.charged || 0;
    toast(`✅ Fee saved! Charged to ${charged} student${charged!==1?'s':''} automatically.`, 'success');
    feeSetupLoadFeeList();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.feeSetupEditFee = function(f) {
  showModal(`
    <h3 style="margin:0 0 1.1rem;">✏️ Edit Fee Template</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem;">
      <div style="grid-column:1/-1;">
        <label style="${labelStyle()}">Fee Name *</label>
        <input id="efs-label" value="${f.label||''}" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="${labelStyle()}">Amount (₦) *</label>
        <input id="efs-amount" type="number" min="0" value="${f.amount||0}" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="${labelStyle()}">Level</label>
        <select id="efs-level" style="${selectStyle()};width:100%;">
          <option ${f.level==='All'?'selected':''} value="All">All</option>
          <option ${f.level==='Junior'?'selected':''} value="Junior">Junior</option>
          <option ${f.level==='Senior'?'selected':''} value="Senior">Senior</option>
        </select>
      </div>
      <div>
        <label style="${labelStyle()}">Specific Class</label>
        <select id="efs-class" style="${selectStyle()};width:100%;">
          <option value="">— None —</option>${_fsClassOpts()}
        </select>
      </div>
      <div>
        <label style="${labelStyle()}">Term</label>
        <select id="efs-term" style="${selectStyle()};width:100%;">
          <option value="">All Terms</option>${_fsTermOpts()}
        </select>
      </div>
      <div>
        <label style="${labelStyle()}">Session</label>
        <input id="efs-session" value="${f.session||''}" placeholder="e.g. 2025/2026" style="${inputStyle()};width:100%;">
      </div>
      <div>
        <label style="${labelStyle()}">Mandatory</label>
        <select id="efs-mandatory" style="${selectStyle()};width:100%;">
          <option value="1" ${f.mandatory!==0?'selected':''}>Yes</option>
          <option value="0" ${f.mandatory===0?'selected':''}>No</option>
        </select>
      </div>
      <div style="grid-column:1/-1;">
        <label style="${labelStyle()}">Description</label>
        <textarea id="efs-desc" rows="2" style="${inputStyle()};width:100%;resize:none;">${f.description||''}</textarea>
      </div>
      <div style="grid-column:1/-1;display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="feeSetupSaveEditFee(${f.id})" style="${btnStyle('primary')}">💾 Save Changes</button>
      </div>
    </div>`);
  // Set select values after modal renders
  setTimeout(() => {
    const cs = document.getElementById('efs-class');
    if (cs) cs.value = f.class_name||'';
    const ts = document.getElementById('efs-term');
    if (ts) ts.value = f.term||'';
  }, 50);
};

window.feeSetupSaveEditFee = async function(id) {
  const label = document.getElementById('efs-label')?.value?.trim();
  const amount = parseFloat(document.getElementById('efs-amount')?.value || 0);
  if (!label || !amount) { toast('Name and amount required', 'error'); return; }
  try {
    await Fees.updateStructureItem(id, {
      label, amount,
      level:       document.getElementById('efs-level')?.value    || 'All',
      class_name:  document.getElementById('efs-class')?.value    || null,
      term:        document.getElementById('efs-term')?.value     || null,
      session:     document.getElementById('efs-session')?.value  || null,
      mandatory:   parseInt(document.getElementById('efs-mandatory')?.value),
      description: document.getElementById('efs-desc')?.value     || null,
    });
    closeModal();
    toast('Updated!', 'success');
    feeSetupLoadFeeList();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.feeSetupDeleteFee = async function(id) {
  if (!confirmDlg('Delete this fee template?')) return;
  try {
    await Fees.deleteStructureItem(id);
    toast('Deleted', 'warning');
    feeSetupLoadFeeList();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

/* ══════════════════════════════════════════════════════════════════
   TAB 2 — LEVIES / SPECIAL FEES
══════════════════════════════════════════════════════════════════ */
const LEVY_CATS = ['Sports','Graduation','Cultural','Interhouse','Excursion','Uniform','ID Card','Library','Technology','Medical','Other'];
const LEVY_EMOJI = {Sports:'⚽',Graduation:'🎓',Cultural:'🎭',Interhouse:'🏁',Excursion:'🚌',Uniform:'👔','ID Card':'🪪',Library:'📚',Technology:'💻',Medical:'🏥',Other:'📌'};

function feeTabLevies(el) {
  const catOpts = LEVY_CATS.map(c=>`<option value="${c}">${LEVY_EMOJI[c]||'📌'} ${c}</option>`).join('');

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:minmax(300px,360px) 1fr;gap:1.25rem;align-items:start;">

      <!-- CREATE FORM -->
      <div style="background:#fff;border-radius:12px;padding:1.4rem;box-shadow:0 2px 8px rgba(0,0,0,.07);position:sticky;top:1rem;">
        <h4 style="margin:0 0 1rem;color:#1e3a5f;font-size:.95rem;padding-bottom:.75rem;border-bottom:1px solid #e5e7eb;">➕ New Levy</h4>
        <div style="display:flex;flex-direction:column;gap:.75rem;">

          <div>
            <label style="${labelStyle()}">Levy Name *</label>
            <input id="fs-lv-name" placeholder="e.g. Sports Day Fee, Graduation Fee"
              style="${inputStyle()};width:100%;" autocomplete="off">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
            <div>
              <label style="${labelStyle()}">Amount (₦) *</label>
              <input id="fs-lv-amount" type="number" min="0" step="100" placeholder="0"
                style="${inputStyle()};width:100%;">
            </div>
            <div>
              <label style="${labelStyle()}">Category</label>
              <select id="fs-lv-cat" style="${selectStyle()};width:100%;">${catOpts}</select>
            </div>
          </div>

          <div style="background:#f8fafc;border-radius:8px;padding:.9rem;border:1px solid #e5e7eb;">
            <div style="font-size:.73rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem;">Who pays?</div>
            <select id="fs-lv-target" onchange="feeSetupToggleClass('fs-lv-class-wrap','fs-lv-target')" style="${selectStyle()};width:100%;">
              <option value="All">All Students</option>
              <option value="Junior">Junior Classes (JSS)</option>
              <option value="Senior">Senior Classes (SS)</option>
              <option value="Class">One Specific Class</option>
            </select>
            <div id="fs-lv-class-wrap" style="margin-top:.6rem;display:none;">
              <label style="${labelStyle()}">Select Class</label>
              <select id="fs-lv-class" style="${selectStyle()};width:100%;">
                <option value="">— pick class —</option>${_fsClassOpts()}
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
            <div>
              <label style="${labelStyle()}">Term</label>
              <select id="fs-lv-term" style="${selectStyle()};width:100%;">
                <option value="">Any Term</option>${_fsTermOpts()}
              </select>
            </div>
            <div>
              <label style="${labelStyle()}">Due Date</label>
              <input id="fs-lv-due" type="date" style="${inputStyle()};width:100%;">
            </div>
          </div>

          <div>
            <label style="${labelStyle()}">Description (optional)</label>
            <textarea id="fs-lv-desc" rows="2" placeholder="Brief description"
              style="${inputStyle()};resize:none;width:100%;"></textarea>
          </div>

          <button onclick="feeSetupSubmitLevy()"
            style="${btnStyle('secondary')};width:100%;justify-content:center;padding:.7rem;">
            💾 Save Levy
          </button>
        </div>
      </div>

      <!-- LIST -->
      <div>
        <h4 style="margin:0 0 .75rem;font-size:.9rem;color:#374151;">Saved Levies</h4>
        <div id="fs-levy-list"></div>
      </div>
    </div>`;

  feeSetupLoadLevyList();
}

window.feeSetupLoadLevyList = async function() {
  const el = document.getElementById('fs-levy-list');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:1.5rem;color:#9ca3af;">Loading…</div>`;
  try {
    const resp  = await Levies.getAll();
    const items = resp.data || [];
    if (!items.length) {
      el.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;
                    color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">
          <div style="font-size:2.5rem;margin-bottom:.5rem;">🎯</div>
          <p style="margin:0;">No levies yet.<br>Use the form to add one.</p>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">LEVY NAME</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">CATEGORY</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">APPLIES TO</th>
            <th style="padding:.6rem 1rem;text-align:right;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">AMOUNT</th>
            <th style="padding:.6rem 1rem;text-align:center;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTIONS</th>
          </tr></thead>
          <tbody>
            ${items.map(l => `
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:.6rem 1rem;">
                  <div style="font-weight:600;">${l.name}</div>
                  ${l.description ? `<div style="font-size:.72rem;color:#9ca3af;">${l.description}</div>` : ''}
                  ${l.due_date ? `<div style="font-size:.72rem;color:#d97706;">Due: ${new Date(l.due_date).toLocaleDateString('en-NG')}</div>` : ''}
                </td>
                <td style="padding:.6rem 1rem;">
                  <span style="background:#eff6ff;color:#2563eb;border-radius:4px;padding:.15rem .5rem;font-size:.72rem;font-weight:600;">
                    ${LEVY_EMOJI[l.category]||'📌'} ${l.category||'Other'}
                  </span>
                </td>
                <td style="padding:.6rem 1rem;font-size:.82rem;color:#475569;">${l.class_name||l.target||'All'}</td>
                <td style="padding:.6rem 1rem;text-align:right;font-weight:700;color:#059669;">${_fsCurrency(l.amount)}</td>
                <td style="padding:.6rem 1rem;text-align:center;">
                  <div style="display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap;">
                    <button onclick="feeSetupEditLevy(${JSON.stringify(l).replace(/"/g,'&quot;')})"
                      style="${btnStyle('outline','sm')}" title="Edit">✏️</button>
                    <button onclick="feeSetupChargeNow('levy',${l.id},'${l.name.replace(/'/g,"\\'")}',${l.amount},'${l.class_name||''}','${l.target||'All'}')"
                      style="${btnStyle('secondary','sm')}" title="Re-charge any students not yet charged">⚡ Re-charge</button>
                    <button onclick="feeSetupDeleteLevy(${l.id})"
                      style="${btnStyle('danger','sm')}">🗑</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = `<p style="color:#ef4444;padding:1rem;">Error: ${e.message}</p>`;
  }
};

window.feeSetupSubmitLevy = async function() {
  const name = document.getElementById('fs-lv-name')?.value?.trim();
  const amt  = parseFloat(document.getElementById('fs-lv-amount')?.value || 0);
  if (!name) { toast('Levy name is required', 'error'); return; }
  if (!amt)  { toast('Enter a valid amount', 'error'); return; }
  const target = document.getElementById('fs-lv-target')?.value;
  const cls    = target === 'Class' ? (document.getElementById('fs-lv-class')?.value || '') : '';
  if (target === 'Class' && !cls) { toast('Select a specific class', 'error'); return; }
  try {
    const resp = await Levies.create({
      name, amount: amt,
      category:    document.getElementById('fs-lv-cat')?.value,
      target,
      class_name:  cls  || null,
      term:        document.getElementById('fs-lv-term')?.value || null,
      due_date:    document.getElementById('fs-lv-due')?.value  || null,
      description: document.getElementById('fs-lv-desc')?.value || null,
      mandatory:   1,
    });
    ['fs-lv-name','fs-lv-amount','fs-lv-desc','fs-lv-due'].forEach(id => {
      const e = document.getElementById(id); if (e) e.value = '';
    });
    document.getElementById('fs-lv-target').value = 'All';
    document.getElementById('fs-lv-class-wrap').style.display = 'none';
    const charged = resp?.data?.autoCharged || resp?.charged || 0;
    toast(`✅ Levy saved! Charged to ${charged} student${charged!==1?'s':''} automatically.`, 'success');
    feeSetupLoadLevyList();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.feeSetupEditLevy = function(l) {
  const catOpts = LEVY_CATS.map(c=>`<option value="${c}" ${l.category===c?'selected':''}>${LEVY_EMOJI[c]||'📌'} ${c}</option>`).join('');
  showModal(`
    <h3 style="margin:0 0 1.1rem;">✏️ Edit Levy</h3>
    <div style="display:flex;flex-direction:column;gap:.8rem;">
      <div>
        <label style="${labelStyle()}">Levy Name *</label>
        <input id="elv-name" value="${l.name||''}" style="${inputStyle()};width:100%;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
        <div>
          <label style="${labelStyle()}">Amount (₦) *</label>
          <input id="elv-amount" type="number" value="${l.amount||0}" style="${inputStyle()};width:100%;">
        </div>
        <div>
          <label style="${labelStyle()}">Category</label>
          <select id="elv-cat" style="${selectStyle()};width:100%;">${catOpts}</select>
        </div>
      </div>
      <div>
        <label style="${labelStyle()}">Applies To</label>
        <select id="elv-target" style="${selectStyle()};width:100%;">
          <option value="All"    ${l.target==='All'   ?'selected':''}>All Students</option>
          <option value="Junior" ${l.target==='Junior'?'selected':''}>Junior Classes</option>
          <option value="Senior" ${l.target==='Senior'?'selected':''}>Senior Classes</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
        <div>
          <label style="${labelStyle()}">Term</label>
          <select id="elv-term" style="${selectStyle()};width:100%;">
            <option value="">Any Term</option>${_fsTermOpts()}
          </select>
        </div>
        <div>
          <label style="${labelStyle()}">Due Date</label>
          <input id="elv-due" type="date" value="${l.due_date||''}" style="${inputStyle()};width:100%;">
        </div>
      </div>
      <div>
        <label style="${labelStyle()}">Description</label>
        <textarea id="elv-desc" rows="2" style="${inputStyle()};width:100%;resize:none;">${l.description||''}</textarea>
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button onclick="feeSetupSaveEditLevy(${l.id})" style="${btnStyle('primary')}">💾 Save</button>
      </div>
    </div>`);
  setTimeout(() => {
    const ts = document.getElementById('elv-term');
    if (ts) ts.value = l.term || '';
  }, 50);
};

window.feeSetupSaveEditLevy = async function(id) {
  const name = document.getElementById('elv-name')?.value?.trim();
  const amount = parseFloat(document.getElementById('elv-amount')?.value || 0);
  if (!name || !amount) { toast('Name and amount required', 'error'); return; }
  try {
    await Levies.update(id, {
      name, amount,
      category:    document.getElementById('elv-cat')?.value    || null,
      target:      document.getElementById('elv-target')?.value || 'All',
      term:        document.getElementById('elv-term')?.value   || null,
      due_date:    document.getElementById('elv-due')?.value    || null,
      description: document.getElementById('elv-desc')?.value   || null,
    });
    closeModal();
    toast('Levy updated!', 'success');
    feeSetupLoadLevyList();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

window.feeSetupDeleteLevy = async function(id) {
  if (!confirmDlg('Delete this levy?')) return;
  try {
    await Levies.remove(id);
    toast('Deleted', 'warning');
    feeSetupLoadLevyList();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};

/* ══════════════════════════════════════════════════════════════════
   TAB 3 — ALL TEMPLATES
══════════════════════════════════════════════════════════════════ */
async function feeTabAll(el) {
  el.innerHTML = `<div style="text-align:center;padding:2rem;color:#9ca3af;">Loading all templates…</div>`;
  try {
    const [fr, lr] = await Promise.all([Fees.getStructure(), Levies.getAll()]);
    const fees   = (fr.data||[]).map(f => ({...f, _t:'fee'}));
    const levies = (lr.data||[]).map(l => ({...l, _t:'levy'}));
    const all    = [...fees, ...levies].sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));

    if (!all.length) {
      el.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:3rem;text-align:center;
                    color:#9ca3af;box-shadow:0 2px 8px rgba(0,0,0,.07);">
          <div style="font-size:2.5rem;">📋</div>
          <p>No templates yet. Use the Fees and Levies tabs to create them.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="padding:.85rem 1.25rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
          <span style="font-weight:600;color:#374151;">${all.length} Templates — ${fees.length} fee${fees.length!==1?'s':''} · ${levies.length} lev${levies.length!==1?'ies':'y'}</span>
          <button onclick="feeSetupSwitchTab('fees')" style="${btnStyle('primary','sm')}">+ Add Fee</button>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">NAME</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">TYPE</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">APPLIES TO</th>
            <th style="padding:.6rem 1rem;text-align:left;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">TERM</th>
            <th style="padding:.6rem 1rem;text-align:right;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">AMOUNT</th>
            <th style="padding:.6rem 1rem;text-align:center;font-size:.75rem;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">ACTION</th>
          </tr></thead>
          <tbody>${all.map(t => {
            const isLevy = t._t === 'levy';
            const name   = isLevy ? t.name : t.label;
            const tag    = isLevy
              ? `<span style="background:#eff6ff;color:#2563eb;border-radius:4px;padding:.15rem .45rem;font-size:.71rem;font-weight:600;">${LEVY_EMOJI[t.category]||'📌'} Levy</span>`
              : `<span style="background:#f0fdf4;color:#166534;border-radius:4px;padding:.15rem .45rem;font-size:.71rem;font-weight:600;">📌 Fee</span>`;
            const applies = isLevy ? (t.class_name||t.target||'All') : (t.class_name||t.level||'All');
            return `
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:.6rem 1rem;font-weight:600;">${name}</td>
                <td style="padding:.6rem 1rem;">${tag}</td>
                <td style="padding:.6rem 1rem;font-size:.82rem;color:#475569;">${applies}</td>
                <td style="padding:.6rem 1rem;font-size:.82rem;color:#475569;">${t.term||'—'}</td>
                <td style="padding:.6rem 1rem;text-align:right;font-weight:700;color:#059669;">${_fsCurrency(t.amount||0)}</td>
                <td style="padding:.6rem 1rem;text-align:center;">
                  <button onclick="feeSetupChargeNow('${t._t}',${t.id},'${name.replace(/'/g,"\\'")}',${t.amount||0},'${(isLevy?t.class_name:t.class_name)||''}','${(isLevy?t.target:t.level)||'All'}')"
                    style="${btnStyle('primary','sm')}">⚡ Charge</button>
                </td>
              </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = `<p style="color:#ef4444;padding:1rem;">Error: ${e.message}</p>`;
  }
}

/* ══════════════════════════════════════════════════════════════════
   TAB 4 — BULK CHARGE
══════════════════════════════════════════════════════════════════ */
function feeTabCharge(el) {
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:1.25rem;align-items:start;">

      <div style="background:#fff;border-radius:12px;padding:1.4rem;box-shadow:0 2px 8px rgba(0,0,0,.07);position:sticky;top:1rem;">
        <h4 style="margin:0 0 .6rem;color:#1e3a5f;font-size:.95rem;padding-bottom:.75rem;border-bottom:1px solid #e5e7eb;">
          ⚡ Bulk Charge a Class
        </h4>
        <p style="font-size:.83rem;color:#6b7280;margin:0 0 1rem;">
          Select a template and a class to create <em>Unpaid</em> charge records
          for every active student. Already-charged students are skipped.
        </p>
        <div style="display:flex;flex-direction:column;gap:.75rem;">
          <div>
            <label style="${labelStyle()}">Template *</label>
            <select id="fs-bc-tpl" style="${selectStyle()};width:100%;">
              <option value="">Loading…</option>
            </select>
          </div>
          <div>
            <label style="${labelStyle()}">Class</label>
            <select id="fs-bc-class" style="${selectStyle()};width:100%;">
              <option value="">All (use template target)</option>${_fsClassOpts()}
            </select>
          </div>
          <div>
            <label style="${labelStyle()}">Arm (optional)</label>
            <select id="fs-bc-arm" style="${selectStyle()};width:100%;">
              <option value="">All Arms</option>
              ${['A','B','C','D','E'].map(a=>`<option value="${a}">${a}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
            <div>
              <label style="${labelStyle()}">Term *</label>
              <select id="fs-bc-term" style="${selectStyle()};width:100%;">${_fsTermOpts()}</select>
            </div>
            <div>
              <label style="${labelStyle()}">Session</label>
              <input id="fs-bc-session" value="${_fsSession()}" style="${inputStyle()};width:100%;">
            </div>
          </div>
          <button onclick="feeSetupRunBulkCharge()"
            style="${btnStyle('primary')};width:100%;justify-content:center;padding:.7rem;">
            ⚡ Charge Students Now
          </button>
        </div>
      </div>

      <div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1rem;font-size:.85rem;color:#1d4ed8;">
          <strong>How it works:</strong><br>
          1. Select a fee or levy template<br>
          2. Choose a class (or leave blank to use the template's target group)<br>
          3. Click Charge — every eligible active student gets an Unpaid charge record<br>
          4. Go to the <strong>Student Finance Portal</strong> to record each payment
        </div>
        <div id="fs-bc-result"></div>
      </div>
    </div>`;

  // Load template dropdown
  Promise.all([Fees.getStructure(), Levies.getAll()]).then(([fr, lr]) => {
    const sel    = document.getElementById('fs-bc-tpl');
    if (!sel) return;
    const fees   = fr.data  || [];
    const levies = lr.data  || [];
    sel.innerHTML = '<option value="">— select a template —</option>' +
      (fees.length   ? `<optgroup label="📌 Regular Fees">${fees.map(f =>
          `<option value="fee:${f.id}:${encodeURIComponent(f.label)}:${f.amount}:${f.class_name||''}:${f.level||'All'}">${f.label} — ${_fsCurrency(f.amount)}</option>`).join('')}</optgroup>` : '') +
      (levies.length ? `<optgroup label="🎯 Levies">${levies.map(l =>
          `<option value="levy:${l.id}:${encodeURIComponent(l.name)}:${l.amount}:${l.class_name||''}:${l.target||'All'}">${l.name} — ${_fsCurrency(l.amount)}</option>`).join('')}</optgroup>` : '');
  }).catch(() => {});
}

window.feeSetupRunBulkCharge = async function() {
  const tplVal  = document.getElementById('fs-bc-tpl')?.value;
  const cls     = document.getElementById('fs-bc-class')?.value;
  const arm     = document.getElementById('fs-bc-arm')?.value;
  const term    = document.getElementById('fs-bc-term')?.value;
  const session = document.getElementById('fs-bc-session')?.value;
  const res     = document.getElementById('fs-bc-result');

  if (!tplVal) { toast('Select a template first', 'error'); return; }
  if (!term)   { toast('Select a term', 'error'); return; }

  const [type, id, nameEnc, amount, tplClass, target] = tplVal.split(':');
  const name        = decodeURIComponent(nameEnc);
  const chargeClass = cls || tplClass || null;
  const who         = chargeClass ? chargeClass + (arm ? ' ' + arm : '') : 'all ' + target.toLowerCase() + ' students';

  if (!confirmDlg(`Charge "${name}" (${_fsCurrency(amount)}) to ${who} for ${term}?\n\nStudents already charged this term will be skipped.`)) return;

  if (res) res.innerHTML = `<p style="color:#9ca3af;padding:1rem;">Charging…</p>`;

  try {
    let resp;
    if (type === 'levy') {
      resp = await Levies.charge(parseInt(id));
    } else {
      resp = await Fees.bulkCharge({
        class:   chargeClass,
        arm:     arm || null,
        feeType: name,
        amount:  parseFloat(amount),
        term, session,
      });
    }
    const charged = resp.data?.charged || 0;
    const skipped = resp.data?.skipped || 0;

    if (res) res.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1.25rem 1.5rem;">
        <div style="font-size:1.5rem;font-weight:700;color:#166534;margin-bottom:.25rem;">
          ✅ ${charged} student${charged!==1?'s':''} charged
        </div>
        <div style="font-size:.85rem;color:#6b7280;">
          ${skipped} already charged this term (skipped)
        </div>
        <button onclick="window.open('student-finance.html','_blank')"
          style="margin-top:.85rem;background:#1e3a5f;color:#fff;border:none;padding:.55rem 1.2rem;
                 border-radius:8px;cursor:pointer;font-weight:600;font-size:.875rem;">
          🏦 Open Finance Portal →
        </button>
      </div>`;
    toast(`⚡ ${charged} charged, ${skipped} skipped`, 'success');
  } catch(e) {
    if (res) res.innerHTML = `<p style="color:#ef4444;padding:1rem;">Error: ${e.message}</p>`;
    toast('Error: ' + e.message, 'error');
  }
};

/* ── Shared: charge a single template from the list ── */
window.feeSetupChargeNow = async function(type, id, name, amount, className, target) {
  const who = className ? `all students in ${className}` : `all ${target.toLowerCase()} students`;
  if (!confirmDlg(`Charge "${name}" (${_fsCurrency(amount)}) to ${who}?\nStudents already charged this term will be skipped.`)) return;
  try {
    let resp;
    if (type === 'levy') {
      resp = await Levies.charge(id);
    } else {
      resp = await Fees.bulkCharge({
        class: className || null,
        feeType: name, amount,
        term:    App.data.schoolInfo?.term    || 'First Term',
        session: App.data.schoolInfo?.session || '',
      });
    }
    toast(`⚡ ${resp.data?.charged||0} charged, ${resp.data?.skipped||0} skipped`, 'success');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
};