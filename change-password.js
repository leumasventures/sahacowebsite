'use strict';
/**
 * change-password.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Change Password
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
/* CHANGE PASSWORD  — accessible from sidebar 🔑 button or Settings */
window.openChangePasswordModal = function() {
  showModal(`
    <h3 style="margin:0 0 1.2rem;">🔑 Change Password</h3>
    <div style="display:flex;flex-direction:column;gap:.85rem;">
      <div>
        <label style="${labelStyle()}">Current Password *</label>
        <div style="position:relative;">
          <input id="cp-current" type="password" placeholder="Enter current password"
                 style="${inputStyle()};width:100%;padding-right:2.5rem;">
          <button type="button" onclick="togglePwdVis('cp-current',this)"
                  style="position:absolute;right:.6rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:.9rem;">👁</button>
        </div>
      </div>
      <div>
        <label style="${labelStyle()}">New Password * <span style="font-size:.75rem;color:#9ca3af;">(min 8 characters)</span></label>
        <div style="position:relative;">
          <input id="cp-new" type="password" placeholder="Enter new password" oninput="updatePwdStrength(this.value)"
                 style="${inputStyle()};width:100%;padding-right:2.5rem;">
          <button type="button" onclick="togglePwdVis('cp-new',this)"
                  style="position:absolute;right:.6rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:.9rem;">👁</button>
        </div>
        <!-- Strength bar -->
        <div style="margin-top:.4rem;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
          <div id="cp-strength-bar" style="height:100%;width:0%;background:#ef4444;border-radius:2px;transition:width .3s,background .3s;"></div>
        </div>
        <div id="cp-strength-label" style="font-size:.72rem;color:#9ca3af;margin-top:.2rem;"></div>
      </div>
      <div>
        <label style="${labelStyle()}">Confirm New Password *</label>
        <div style="position:relative;">
          <input id="cp-confirm" type="password" placeholder="Repeat new password"
                 style="${inputStyle()};width:100%;padding-right:2.5rem;">
          <button type="button" onclick="togglePwdVis('cp-confirm',this)"
                  style="position:absolute;right:.6rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:.9rem;">👁</button>
        </div>
      </div>
      <div id="cp-error" style="color:#ef4444;font-size:.83rem;min-height:1.2rem;"></div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.3rem;">
        <button onclick="closeModal()" style="${btnStyle('secondary')}">Cancel</button>
        <button id="cp-submit-btn" onclick="submitChangePassword()" style="${btnStyle('primary')}">🔑 Change Password</button>
      </div>
    </div>`);
};

window.togglePwdVis = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
};

window.updatePwdStrength = function(pwd) {
  const bar   = document.getElementById('cp-strength-bar');
  const label = document.getElementById('cp-strength-label');
  if (!bar || !label) return;
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { pct:'0%',   color:'#e5e7eb', text:'' },
    { pct:'20%',  color:'#ef4444', text:'Very weak' },
    { pct:'40%',  color:'#f59e0b', text:'Weak' },
    { pct:'60%',  color:'#f59e0b', text:'Fair' },
    { pct:'80%',  color:'#22c55e', text:'Strong' },
    { pct:'100%', color:'#059669', text:'Very strong' },
  ];
  const lvl = levels[score] || levels[0];
  bar.style.width      = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent    = lvl.text;
  label.style.color    = lvl.color;
};

window.submitChangePassword = async function() {
  const current = document.getElementById('cp-current')?.value;
  const newPwd  = document.getElementById('cp-new')?.value;
  const confirm = document.getElementById('cp-confirm')?.value;
  const errEl   = document.getElementById('cp-error');
  const btn     = document.getElementById('cp-submit-btn');

  const setErr = (msg) => { if (errEl) errEl.textContent = msg; };
  setErr('');

  if (!current || !newPwd || !confirm) { setErr('All fields are required.'); return; }
  if (newPwd.length < 8)               { setErr('New password must be at least 8 characters.'); return; }
  if (newPwd !== confirm)              { setErr('New passwords do not match.'); return; }
  if (newPwd === current)              { setErr('New password must be different from current password.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Changing…'; }

  try {
    // Use the SHC_Auth API helper which adds the Bearer token automatically
    const BASE  = (window.__ENV__?.API_URL || 'https://rms-bckend.onrender.com/api');
    const token = sessionStorage.getItem('shc_token');
    const res   = await fetch(`${BASE}/auth/change-password`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Could not change password.');
    closeModal();
    toast('✅ Password changed successfully! Logging you out…', 'success');
    setTimeout(() => {
      if (window.SHC_Auth) SHC_Auth.logout();
      else { sessionStorage.clear(); location.href = 'login.html'; }
    }, 1800);
  } catch(e) {
    setErr(e.message || 'Could not change password. Check your current password.');
    if (btn) { btn.disabled = false; btn.textContent = '🔑 Change Password'; }
  }
};