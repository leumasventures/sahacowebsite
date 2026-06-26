'use strict';
/**
 * settings.js  —  Sacred Heart College Eziukwu Aba (SAHARCO)
 * Settings (all tabs + save functions)
 * Depends on: App, priv, grade(), ordinal(), btnStyle(), labelStyle(),
 *             inputStyle(), selectStyle(), showModal(), closeModal(),
 *             toast(), confirmDlg(), denyAccess() from script.js
 */
function renderSettings() {
  if (!priv.canAccessSettings()) {
    accessDeniedPage('settings');
    return;
  }

  const isSuperAdmin = priv.isSuperAdmin?.() || false;

  const section = document.getElementById('settings');
  section.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
      <h2 style="margin:0; color:#1e40af; font-size:1.6rem;">⚙️ System Settings</h2>
      <span style="font-size:0.85rem; color:#64748b; background:#f1f5f9; padding:0.4rem 0.9rem; border-radius:999px;">
        Session: <strong>${App.data.schoolInfo?.session || '–'}</strong> &nbsp;|&nbsp; Term: <strong>${App.data.schoolInfo?.term || '–'}</strong>
      </span>
    </div>

    <!-- TAB BAR -->
    <div style="display:flex; gap:0.5rem; margin-bottom:0; flex-wrap:wrap; border-bottom:2px solid #e2e8f0; padding-bottom:0;">
      ${[
        { id: 'school',     icon: '🏫', label: 'School Info' },
        { id: 'grading',    icon: '📊', label: 'Grading & Domains' },
        { id: 'classes',    icon: '🏛️', label: 'Classes & Arms' },
        { id: 'attendance', icon: '📅', label: 'Attendance & Calendar' },
        { id: 'general',    icon: '🔧', label: 'General Settings' },
        { id: 'promotion',  icon: '🎓', label: 'Promotion & Cumulative' },
        ...(isSuperAdmin ? [{ id: 'roles', icon: '🔐', label: 'Roles & Privileges' }] : []),
        { id: 'data',       icon: '💾', label: 'Data Management' },
      ].map(t => `
        <button onclick="showSettingsTab('${t.id}')"
          class="settings-tab-btn" id="stab-${t.id}"
          style="padding:0.6rem 1.1rem; border:none; background:none; cursor:pointer;
                 font-size:0.9rem; font-weight:600; color:#64748b; border-bottom:3px solid transparent;
                 margin-bottom:-2px; transition:all .18s; white-space:nowrap; border-radius:0;">
          ${t.icon} ${t.label}
        </button>
      `).join('')}
    </div>

    <!-- TAB CONTENT WRAPPER -->
    <div id="settings-content"
      style="background:#fff; border-radius:0 0 12px 12px; padding:2rem;
             box-shadow:0 4px 16px rgba(0,0,0,0.08); min-height:520px;">

      <!-- ══════════════════════════════════
           TAB: SCHOOL INFO
      ══════════════════════════════════ -->
      <div id="tab-school" class="settings-tab">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">School Information</h3>
        <form id="school-form" style="display:grid; gap:1.25rem; max-width:700px;">
          <div>
            <label style="${labelStyle()}">School Name *</label>
            <input id="set-name" value="${esc(App.data.schoolInfo?.name)}" required style="${inputStyle()}">
          </div>
          <div>
            <label style="${labelStyle()}">Address</label>
            <input id="set-address" value="${esc(App.data.schoolInfo?.address)}" style="${inputStyle()}">
          </div>
          <div>
            <label style="${labelStyle()}">Logo URL (optional)</label>
            <input id="set-logo" value="${esc(App.data.schoolInfo?.logo)}" placeholder="https://..." style="${inputStyle()}">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label style="${labelStyle()}">Current Session *</label>
              <input id="set-session" value="${esc(App.data.schoolInfo?.session, '2025/2026')}" required style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Current Term</label>
              <select id="set-term" style="${inputStyle()}">
                ${['First Term','Second Term','Third Term'].map(t=>`<option ${App.data.schoolInfo?.term===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label style="${labelStyle()}">Principal's Name</label>
              <input id="set-principal" value="${esc(App.data.schoolInfo?.principal)}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">School Email</label>
              <input type="email" id="set-email" value="${esc(App.data.schoolInfo?.email)}" style="${inputStyle()}">
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div>
              <label style="${labelStyle()}">Phone Number</label>
              <input id="set-phone" value="${esc(App.data.schoolInfo?.phone)}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">School Website</label>
              <input id="set-website" value="${esc(App.data.schoolInfo?.website)}" placeholder="https://..." style="${inputStyle()}">
            </div>
          </div>
          <div>
            <label style="${labelStyle()}">Next Resumption Date</label>
            <input type="date" id="set-resumption" value="${esc(App.data.schoolInfo?.resumptionDate)}" style="${inputStyle()}; max-width:220px;">
          </div>
          <div>
            <label style="${labelStyle()}">School Announcements / Notice Board</label>
            <textarea id="set-announcements" rows="3" style="${inputStyle()}; resize:vertical;">${esc(App.data.schoolInfo?.announcements)}</textarea>
          </div>
          <div>
            <label style="${labelStyle()}">School Motto</label>
            <input id="set-motto" value="${esc(App.data.schoolInfo?.motto)}" placeholder="e.g. Knowledge is Power" style="${inputStyle()}">
          </div>
          <button type="submit" style="${btnStyle('primary')}; width:220px;">💾 Save School Settings</button>
        </form>
      </div>

      <!-- ══════════════════════════════════
           TAB: GRADING & DOMAINS
      ══════════════════════════════════ -->
      <div id="tab-grading" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">Grading Scale & Domain Assessment</h3>

        <div style="margin-bottom:2rem;">
          <h4 style="margin:0 0 0.75rem;">Academic Grading Scale</h4>
          <table id="grading-table" style="${tableStyle()}">
            <thead><tr style="${thRowStyle()}">
              <th style="${thStyle('120px')}">Min Score</th>
              <th style="${thStyle('120px')}">Max Score</th>
              <th style="${thStyle('70px')}">Grade</th>
              <th style="${thStyle('auto')}">Remark</th>
              <th style="${thStyle('80px')}">GPA Points</th>
              <th style="${thStyle('80px')}">Action</th>
            </tr></thead>
            <tbody>
              ${(App.data.gradingScale || defaultGradingScale()).map((item,i)=>`
                <tr data-index="${i}">
                  <td><input type="number" value="${item.min}" min="0" max="100" style="${inputStyle('sm')}"></td>
                  <td><input type="number" value="${item.max}" min="0" max="100" style="${inputStyle('sm')}"></td>
                  <td><input value="${esc(item.grade)}" maxlength="2" style="${inputStyle('sm')}"></td>
                  <td><input value="${esc(item.remark)}" style="${inputStyle('sm')}"></td>
                  <td><input type="number" step="0.1" min="0" max="5" value="${item.gpa ?? ''}" placeholder="—" style="${inputStyle('sm')}"></td>
                  <td><button onclick="removeGradingRow(this)" style="${btnStyle('danger','xs')}">×</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <button onclick="addGradingRow()" style="${btnStyle('success','sm')}; margin-top:0.75rem;">+ Add Grade Range</button>
        </div>

        <div style="margin-bottom:2rem;">
          <h4 style="margin:0 0 0.75rem;">Score Breakdown Configuration</h4>
          <p style="color:#64748b; font-size:0.85rem; margin-bottom:0.75rem;">Define how total score is split across assessment components. Values must sum to 100.</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; max-width:700px;" id="score-breakdown-grid">
            ${renderScoreBreakdownInputs()}
          </div>
          <p id="breakdown-sum-notice" style="font-size:0.82rem; margin-top:0.5rem; color:#64748b;"></p>
        </div>

        <div style="margin-bottom:2rem;">
          <h4 style="margin:1.5rem 0 0.75rem;">Domain Assessment Labels (1–5 Scale)</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem;">
            ${[1,2,3,4,5].map(score => `
              <div>
                <label style="${labelStyle()}">Score ${score}</label>
                <input id="domain-label-${score}" value="${esc(App.data.domainLabels?.[score], getDefaultDomainLabel(score))}" style="${inputStyle()}">
              </div>
            `).join('')}
          </div>
        </div>

        <button onclick="saveGradingAndDomains()" style="${btnStyle('primary')}; margin-top:1rem;">💾 Save Grading & Domain Settings</button>
      </div>

      <!-- ══════════════════════════════════
           TAB: CLASSES & ARMS
      ══════════════════════════════════ -->
      <div id="tab-classes" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">Classes & Sections / Arms</h3>
        <div id="classes-list"></div>
        <button onclick="addNewClass()" style="${btnStyle('success')}; margin-top:1rem;">+ Add New Class</button>
      </div>

      <!-- ══════════════════════════════════
           TAB: ATTENDANCE & CALENDAR
      ══════════════════════════════════ -->
      <div id="tab-attendance" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 0.5rem; color:#1e40af;">📅 Attendance & School Calendar</h3>
        <p style="color:#64748b; margin-bottom:1.5rem; font-size:0.9rem;">
          Configure school working days, public holidays, half-days, breaks, and closed dates.
          These settings drive attendance percentage calculations and reporting.
        </p>

        <!-- Term Date Range -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="margin:0 0 1rem; color:#334155;">📆 Term Date Range</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1rem;">
            <div>
              <label style="${labelStyle()}">Term Start Date</label>
              <input type="date" id="att-term-start" value="${esc(App.data.attendanceSettings?.termStart)}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Term End Date</label>
              <input type="date" id="att-term-end" value="${esc(App.data.attendanceSettings?.termEnd)}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Total Expected School Days</label>
              <input type="number" id="att-expected-days" min="1" max="365"
                value="${App.data.attendanceSettings?.expectedDays ?? ''}"
                placeholder="Auto-calculate or enter"
                style="${inputStyle()}">
              <small style="color:#64748b; font-size:0.78rem;">Leave blank to auto-calculate from calendar</small>
            </div>
          </div>
        </div>

        <!-- Working Days -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="margin:0 0 1rem; color:#334155;">📋 Active School Days of the Week</h4>
          <p style="color:#64748b; font-size:0.84rem; margin-bottom:0.75rem;">Uncheck days the school does not operate.</p>
          <div style="display:flex; flex-wrap:wrap; gap:1rem;">
            ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => `
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem;">
                <input type="checkbox" id="wd-${day}"
                  ${(App.data.attendanceSettings?.workingDays ?? ['Monday','Tuesday','Wednesday','Thursday','Friday']).includes(day) ? 'checked' : ''}
                  style="width:16px;height:16px;accent-color:#2563eb;">
                ${day}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- School Hours -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="margin:0 0 1rem; color:#334155;">⏰ School Hours</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem;">
            <div>
              <label style="${labelStyle()}">School Opens</label>
              <input type="time" id="att-open-time" value="${esc(App.data.attendanceSettings?.openTime, '07:30')}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">School Closes</label>
              <input type="time" id="att-close-time" value="${esc(App.data.attendanceSettings?.closeTime, '14:30')}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Late Arrival After</label>
              <input type="time" id="att-late-time" value="${esc(App.data.attendanceSettings?.lateAfter, '08:00')}" style="${inputStyle()}">
              <small style="color:#64748b; font-size:0.78rem;">Students arriving after this are marked late</small>
            </div>
          </div>
        </div>

        <!-- Special Days Manager -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="margin:0 0 0.5rem; color:#334155;">🗓️ Special Days & Closures</h4>
          <p style="color:#64748b; font-size:0.84rem; margin-bottom:1rem;">
            Add specific dates that deviate from the normal schedule — public holidays, mid-term breaks,
            exam periods, cultural days, half-days, etc.
          </p>

          <!-- Add New Special Day Form -->
          <div style="display:grid; grid-template-columns:180px 1fr 160px auto; gap:0.75rem; align-items:end; margin-bottom:1rem; flex-wrap:wrap;"
               id="special-day-form">
            <div>
              <label style="${labelStyle()}">Date</label>
              <input type="date" id="sd-date" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Description / Label</label>
              <input id="sd-label" placeholder="e.g. Independence Day, Mid-Term Break" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Type</label>
              <select id="sd-type" style="${inputStyle()}">
                <option value="holiday">🔴 Public Holiday</option>
                <option value="half-day">🟡 Half Day</option>
                <option value="break">🟠 School Break</option>
                <option value="exam">🔵 Exam Day</option>
                <option value="closed">⚫ School Closed</option>
                <option value="event">🟢 School Event</option>
                <option value="sports">🟣 Sports Day</option>
                <option value="custom">⚪ Custom / Other</option>
              </select>
            </div>
            <div>
              <button onclick="addSpecialDay()" style="${btnStyle('success')}; white-space:nowrap;">+ Add Day</button>
            </div>
          </div>

          <!-- Date Range Shortcut -->
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:1rem; margin-bottom:1rem;">
            <h5 style="margin:0 0 0.75rem; color:#1d4ed8; font-size:0.9rem;">📆 Add a Date Range (e.g. Christmas Break)</h5>
            <div style="display:grid; grid-template-columns:160px 160px 1fr 160px auto; gap:0.75rem; align-items:end; flex-wrap:wrap;">
              <div>
                <label style="${labelStyle()}">From</label>
                <input type="date" id="sd-range-start" style="${inputStyle()}">
              </div>
              <div>
                <label style="${labelStyle()}">To</label>
                <input type="date" id="sd-range-end" style="${inputStyle()}">
              </div>
              <div>
                <label style="${labelStyle()}">Label</label>
                <input id="sd-range-label" placeholder="e.g. Christmas Holiday" style="${inputStyle()}">
              </div>
              <div>
                <label style="${labelStyle()}">Type</label>
                <select id="sd-range-type" style="${inputStyle()}">
                  <option value="holiday">🔴 Public Holiday</option>
                  <option value="break">🟠 School Break</option>
                  <option value="closed">⚫ School Closed</option>
                  <option value="exam">🔵 Exam Period</option>
                  <option value="event">🟢 School Event</option>
                  <option value="custom">⚪ Custom</option>
                </select>
              </div>
              <div>
                <button onclick="addSpecialDayRange()" style="${btnStyle('primary')}; white-space:nowrap;">+ Add Range</button>
              </div>
            </div>
          </div>

          <!-- Special Days List -->
          <div id="special-days-list"></div>
        </div>

        <!-- Attendance Rules -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="margin:0 0 1rem; color:#334155;">📏 Attendance Rules & Thresholds</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem;">
            <div>
              <label style="${labelStyle()}">Minimum Attendance % for Exams</label>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <input type="number" id="att-min-pct" min="0" max="100"
                  value="${App.data.attendanceSettings?.minAttendancePct ?? 75}"
                  style="${inputStyle()}; width:80px;">
                <span style="color:#64748b;">%</span>
              </div>
              <small style="color:#64748b; font-size:0.78rem;">Students below this % flagged as ineligible</small>
            </div>
            <div>
              <label style="${labelStyle()}">Consecutive Absent Days Alert</label>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <input type="number" id="att-absent-alert" min="1" max="30"
                  value="${App.data.attendanceSettings?.consecutiveAbsentAlert ?? 3}"
                  style="${inputStyle()}; width:80px;">
                <span style="color:#64748b;">days</span>
              </div>
              <small style="color:#64748b; font-size:0.78rem;">Trigger notification after this many consecutive absences</small>
            </div>
            <div>
              <label style="${labelStyle()}">Late Mark Threshold (count)</label>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <input type="number" id="att-late-threshold" min="1" max="30"
                  value="${App.data.attendanceSettings?.lateMarkThreshold ?? 3}"
                  style="${inputStyle()}; width:80px;">
                <span style="color:#64748b;">lates = 1 absent</span>
              </div>
              <small style="color:#64748b; font-size:0.78rem;">Count N late arrivals as one absent day</small>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.5rem; padding-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; font-size:0.9rem;">
                <input type="checkbox" id="att-allow-excused"
                  ${App.data.attendanceSettings?.allowExcused !== false ? 'checked' : ''}
                  style="width:16px;height:16px;accent-color:#2563eb;">
                <span>Enable "Excused Absent" status</span>
              </label>
              <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; font-size:0.9rem;">
                <input type="checkbox" id="att-count-excused"
                  ${App.data.attendanceSettings?.countExcusedAsPresent ? 'checked' : ''}
                  style="width:16px;height:16px;accent-color:#2563eb;">
                <span>Count excused absences as present</span>
              </label>
              <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; font-size:0.9rem;">
                <input type="checkbox" id="att-show-on-report"
                  ${App.data.attendanceSettings?.showOnReport !== false ? 'checked' : ''}
                  style="width:16px;height:16px;accent-color:#2563eb;">
                <span>Show attendance summary on report card</span>
              </label>
            </div>
          </div>
        </div>

        <button onclick="saveAttendanceSettings()" style="${btnStyle('primary')};">💾 Save Attendance & Calendar Settings</button>
        <button onclick="recalculateAttendanceSummary()" style="${btnStyle('secondary')}; margin-left:1rem;">🔄 Recalculate All Summaries</button>
      </div>

      <!-- ══════════════════════════════════
           TAB: GENERAL SETTINGS
      ══════════════════════════════════ -->
      <div id="tab-general" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">🔧 General System Settings</h3>

        <div style="display:grid; gap:1.5rem;">

          <!-- Report Card Settings -->
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem;">
            <h4 style="margin:0 0 1rem; color:#334155; display:flex; align-items:center; gap:0.5rem;">
              📋 Report Card & Result Display
            </h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem;">
              <div>
                <label style="${labelStyle()}">Result Display Mode</label>
                <select id="gen-result-mode" style="${inputStyle()}">
                  ${[
                    ['scores_grades', 'Show Scores + Grades'],
                    ['scores_only',   'Show Scores Only'],
                    ['grades_only',   'Show Grades Only'],
                  ].map(([v,l]) => `<option value="${v}" ${App.data.generalSettings?.resultMode === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="${labelStyle()}">Class Position Display</label>
                <select id="gen-position-mode" style="${inputStyle()}">
                  ${[
                    ['class_arm',  'Within Class Arm Only'],
                    ['class_full', 'Within Entire Class Level'],
                    ['hide',       'Hide Position'],
                  ].map(([v,l]) => `<option value="${v}" ${App.data.generalSettings?.positionMode === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="${labelStyle()}">Number of Decimal Places on Results</label>
                <select id="gen-decimal-places" style="${inputStyle()}; max-width:120px;">
                  ${[0,1,2].map(n => `<option value="${n}" ${(App.data.generalSettings?.decimalPlaces ?? 1) == n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="${labelStyle()}">Report Card Footer Text</label>
                <input id="gen-report-footer" value="${esc(App.data.generalSettings?.reportFooter, 'Head Teacher / Principal Signature')}" style="${inputStyle()}">
              </div>
              <div>
                <label style="${labelStyle()}">Report Comment Character Limit</label>
                <input type="number" id="gen-comment-limit" min="20" max="500"
                  value="${App.data.generalSettings?.commentCharLimit ?? 150}"
                  style="${inputStyle()}; max-width:120px;">
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:1.25rem; margin-top:1rem;">
              ${[
                ['gen-show-photo',         'Show student photo on report card',          App.data.generalSettings?.showPhoto],
                ['gen-show-gpa',           'Display GPA / Points on report',              App.data.generalSettings?.showGPA],
                ['gen-show-class-avg',     'Show class average per subject',              App.data.generalSettings?.showClassAvg !== false],
                ['gen-show-domain',        'Include domain assessment on report',         App.data.generalSettings?.showDomain !== false],
                ['gen-show-attendance',    'Include attendance on report card',           App.data.generalSettings?.showAttendance !== false],
                ['gen-cumulative-results', 'Show cumulative session results',             App.data.generalSettings?.cumulativeResults],
              ].map(([id, label, checked]) => `
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem; min-width:220px;">
                  <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:15px;height:15px;accent-color:#2563eb;">
                  ${label}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Score Entry Settings -->
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">✏️ Score Entry & Validation</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem;">
              <div>
                <label style="${labelStyle()}">Score Entry Mode</label>
                <select id="gen-entry-mode" style="${inputStyle()}">
                  ${[
                    ['single',    'Single Total Score'],
                    ['components','Component Scores (CA + Exam)'],
                    ['full',      'Full Breakdown (CA1 + CA2 + Exam)'],
                  ].map(([v,l]) => `<option value="${v}" ${App.data.generalSettings?.scoreEntryMode === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="${labelStyle()}">Maximum Total Score</label>
                <input type="number" id="gen-max-score" min="50" max="200"
                  value="${App.data.generalSettings?.maxScore ?? 100}"
                  style="${inputStyle()}; max-width:120px;">
              </div>
              <div>
                <label style="${labelStyle()}">Pass Mark (Overall)</label>
                <input type="number" id="gen-pass-mark" min="0" max="100"
                  value="${App.data.generalSettings?.passMark ?? 40}"
                  style="${inputStyle()}; max-width:120px;">
              </div>
              <div>
                <label style="${labelStyle()}">Max Subjects per Student (SS2/SS3)</label>
                <input type="number" id="gen-max-subjects" min="1" max="20"
                  value="${App.data.generalSettings?.maxSubjectsPerStudent ?? 9}"
                  style="${inputStyle()}; max-width:120px;">
                <div style="font-size:.72rem;color:#6b7280;margin-top:.25rem;">Default: 9 — raise to allow SS2/SS3 students to pick more subjects</div>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:1.25rem; margin-top:1rem;">
              ${[
                ['gen-allow-score-edit',  'Allow editing submitted scores',     App.data.generalSettings?.allowScoreEdit !== false],
                ['gen-lock-published',    'Lock results after publishing',       App.data.generalSettings?.lockPublished],
                ['gen-auto-grade',        'Auto-assign grades on score entry',   App.data.generalSettings?.autoGrade !== false],
                ['gen-validate-range',    'Warn if score exceeds maximum',       App.data.generalSettings?.validateRange !== false],
                ['gen-allow-absent-zero', 'Auto-zero absent students in exams',  App.data.generalSettings?.absentAutoZero],
              ].map(([id, label, checked]) => `
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem; min-width:230px;">
                  <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:15px;height:15px;accent-color:#2563eb;">
                  ${label}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Notifications & Alerts -->
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">🔔 Notifications & Alerts</h4>
            <div style="display:flex; flex-wrap:wrap; gap:1.25rem;">
              ${[
                ['gen-notify-absent',     'Alert when student has 3+ consecutive absences',  App.data.generalSettings?.notifyAbsent !== false],
                ['gen-notify-low-score',  'Alert when student scores below pass mark',        App.data.generalSettings?.notifyLowScore],
                ['gen-notify-fees',       'Send fee payment reminders',                       App.data.generalSettings?.notifyFees],
                ['gen-notify-results',    'Notify parents when results are published',        App.data.generalSettings?.notifyResults],
                ['gen-notify-resumption', 'Send resumption date reminders',                   App.data.generalSettings?.notifyResumption],
              ].map(([id, label, checked]) => `
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem; min-width:280px;">
                  <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:15px;height:15px;accent-color:#2563eb;">
                  ${label}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Portal Access Controls -->
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">🔒 Portal Access Controls</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem;">
              ${[
                ['gen-portal-parent',    'Parent portal enabled',                       App.data.generalSettings?.portalParent !== false],
                ['gen-portal-student',   'Student portal enabled',                      App.data.generalSettings?.portalStudent !== false],
                ['gen-portal-teacher',   'Teacher portal enabled',                      App.data.generalSettings?.portalTeacher !== false],
                ['gen-results-public',   'Results viewable before official publishing', App.data.generalSettings?.resultsPublic],
                ['gen-fees-portal',      'Fee payment via portal enabled',              App.data.generalSettings?.feesPortal],
                ['gen-timetable-public', 'Timetable visible to parents/students',       App.data.generalSettings?.timetablePublic !== false],
              ].map(([id, label, checked]) => `
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem;">
                  <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:15px;height:15px;accent-color:#2563eb;">
                  ${label}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Date, Time & Locale -->
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">🌍 Date, Time & Localisation</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem;">
              <div>
                <label style="${labelStyle()}">Date Format</label>
                <select id="gen-date-format" style="${inputStyle()}">
                  ${[
                    ['DD/MM/YYYY', 'DD/MM/YYYY'],
                    ['MM/DD/YYYY', 'MM/DD/YYYY'],
                    ['YYYY-MM-DD', 'YYYY-MM-DD'],
                    ['DD-MMM-YYYY','DD-MMM-YYYY'],
                  ].map(([v,l]) => `<option value="${v}" ${App.data.generalSettings?.dateFormat === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="${labelStyle()}">Currency Symbol</label>
                <input id="gen-currency" value="${esc(App.data.generalSettings?.currency, '₦')}" style="${inputStyle()}; max-width:100px;">
              </div>
              <div>
                <label style="${labelStyle()}">Language / Locale</label>
                <select id="gen-locale" style="${inputStyle()}">
                  ${[
                    ['en-NG','English (Nigeria)'],
                    ['en-GB','English (UK)'],
                    ['en-US','English (US)'],
                    ['fr-FR','French'],
                  ].map(([v,l]) => `<option value="${v}" ${App.data.generalSettings?.locale === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="${labelStyle()}">Academic Year Start Month</label>
                <select id="gen-year-start" style="${inputStyle()}">
                  ${['January','February','March','April','May','June',
                     'July','August','September','October','November','December'].map((m,i) =>
                    `<option value="${i+1}" ${(App.data.generalSettings?.yearStartMonth ?? 9) == i+1 ? 'selected' : ''}>${m}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- System Behaviour -->
          <div style="border:1px solid #e2e8f0; border-radius:10px; padding:1.25rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">⚡ System Behaviour</h4>
            <div style="display:flex; flex-wrap:wrap; gap:1.25rem;">
              ${[
                ['gen-auto-save',       'Auto-save forms every 30 seconds',          App.data.generalSettings?.autoSave !== false],
                ['gen-confirm-delete',  'Always confirm before deleting records',     App.data.generalSettings?.confirmDelete !== false],
                ['gen-audit-log',       'Enable audit log for changes',               App.data.generalSettings?.auditLog],
                ['gen-dark-mode',       'Enable dark mode',                           App.data.generalSettings?.darkMode],
                ['gen-compact-tables',  'Use compact table view',                     App.data.generalSettings?.compactTables],
                ['gen-print-watermark', 'Add school watermark to printed documents',  App.data.generalSettings?.printWatermark],
              ].map(([id, label, checked]) => `
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.9rem; min-width:260px;">
                  <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:15px;height:15px;accent-color:#2563eb;">
                  ${label}
                </label>
              `).join('')}
            </div>
            <div style="margin-top:1rem; max-width:300px;">
              <label style="${labelStyle()}">Session Timeout (minutes)</label>
              <input type="number" id="gen-session-timeout" min="5" max="480"
                value="${App.data.generalSettings?.sessionTimeout ?? 60}"
                style="${inputStyle()}; max-width:120px;">
            </div>
          </div>

        </div>

        <button onclick="saveGeneralSettings()" style="${btnStyle('primary')}; margin-top:2rem;">💾 Save General Settings</button>
      </div>

      <!-- ══════════════════════════════════
           TAB: ROLES & PRIVILEGES
      ══════════════════════════════════ -->
      <div id="tab-roles" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">User Roles & Permissions</h3>
        <p style="color:#64748b; margin-bottom:1.5rem;">Manage what each role can do in the system.</p>
        <div style="display:grid; gap:1rem;">
          ${['Admin','Principal','Vice Principal','Teacher','Bursar','Parent','Student'].map(role => `
            <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1rem;">
              <div style="font-weight:600; margin-bottom:0.75rem; color:#1e40af;">${role}</div>
              <div style="display:flex; flex-wrap:wrap; gap:1.5rem; font-size:0.9rem;">
                ${[
                  ['Can access settings',        role === 'Admin'],
                  ['Can enter results',           ['Admin','Teacher','Principal'].includes(role)],
                  ['Can take attendance',         ['Admin','Teacher','Principal','Vice Principal'].includes(role)],
                  ['Can view all reports',        ['Admin','Principal','Vice Principal'].includes(role)],
                  ['Can manage fees',             ['Admin','Bursar'].includes(role)],
                  ['Can view own/child reports',  ['Parent','Student'].includes(role)],
                  ['Can print reports',           ['Admin','Principal'].includes(role)],
                  ['Can manage users',            role === 'Admin'],
                ].map(([perm, def]) => `
                  <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                    <input type="checkbox" ${def ? 'checked' : ''} ${role === 'Admin' ? 'disabled' : ''}
                      style="width:15px;height:15px;accent-color:#2563eb;">
                    ${perm}
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <p style="margin-top:1.5rem; color:#9ca3af; font-style:italic; font-size:0.85rem;">
          Advanced per-user role customization and custom role creation coming soon…
        </p>
      </div>

      <!-- ══════════════════════════════════
           TAB: PROMOTION & CUMULATIVE
      ══════════════════════════════════ -->
      <div id="tab-promotion" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">🎓 Promotion Criteria & Cumulative Results</h3>

        <!-- Cumulative Toggle -->
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1.75rem;">
          <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
            <div style="flex:1;">
              <div style="font-weight:700;color:#1e3a5f;margin-bottom:.3rem;">📊 Cumulative Results</div>
              <div style="font-size:.85rem;color:#4b5563;">When enabled, Third Term report cards will show a cumulative summary of all three terms and a promotion decision for each student.</div>
            </div>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;">
              <input type="checkbox" id="promo-enable-cumulative" ${App.data.promotionSettings?.enableCumulative !== false ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
              <span style="font-size:.9rem;font-weight:600;color:#1d4ed8;">Enable Cumulative</span>
            </label>
          </div>
        </div>

        <!-- Promotion Criteria -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;margin-bottom:1.75rem;">
          <h4 style="margin:0 0 1.25rem;color:#1e3a5f;">📋 Promotion Criteria</h4>
          <p style="font-size:.85rem;color:#6b7280;margin-bottom:1.25rem;">
            A student is <strong>Promoted</strong> if they meet ALL enabled criteria. Failing any enabled criterion results in <strong>Repeat</strong>.
          </p>

          <div style="display:grid;gap:1rem;">

            <!-- Min Average -->
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;">
              <input type="checkbox" id="promo-use-avg" ${App.data.promotionSettings?.useAverage !== false ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
              <div>
                <div style="font-weight:600;font-size:.9rem;color:#374151;">Minimum Cumulative Average</div>
                <div style="font-size:.78rem;color:#6b7280;">Student's average across all subjects across all three terms</div>
              </div>
              <div style="display:flex;align-items:center;gap:.5rem;">
                <input type="number" id="promo-min-avg" value="${App.data.promotionSettings?.minAverage ?? 40}" min="0" max="100" style="${inputStyle()};width:80px;text-align:center;">
                <span style="font-size:.85rem;color:#6b7280;">%</span>
              </div>
            </div>

            <!-- Min subjects passed -->
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;">
              <input type="checkbox" id="promo-use-pass-count" ${App.data.promotionSettings?.usePassCount !== false ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
              <div>
                <div style="font-weight:600;font-size:.9rem;color:#374151;">Minimum Subjects Passed</div>
                <div style="font-size:.78rem;color:#6b7280;">Number of subjects where cumulative average ≥ pass mark</div>
              </div>
              <div style="display:flex;align-items:center;gap:.5rem;">
                <input type="number" id="promo-min-pass-count" value="${App.data.promotionSettings?.minPassCount ?? 5}" min="1" max="20" style="${inputStyle()};width:80px;text-align:center;">
                <span style="font-size:.85rem;color:#6b7280;">subjects</span>
              </div>
            </div>

            <!-- No subject below threshold -->
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;">
              <input type="checkbox" id="promo-use-no-fail" ${App.data.promotionSettings?.useNoFail ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
              <div>
                <div style="font-weight:600;font-size:.9rem;color:#374151;">No Subject Below Minimum</div>
                <div style="font-size:.78rem;color:#6b7280;">Fail any subject with cumulative average below this score → Repeat</div>
              </div>
              <div style="display:flex;align-items:center;gap:.5rem;">
                <input type="number" id="promo-no-fail-mark" value="${App.data.promotionSettings?.noFailMark ?? 30}" min="0" max="100" style="${inputStyle()};width:80px;text-align:center;">
                <span style="font-size:.85rem;color:#6b7280;">%</span>
              </div>
            </div>

            <!-- Minimum attendance -->
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;">
              <input type="checkbox" id="promo-use-attendance" ${App.data.promotionSettings?.useAttendance ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
              <div>
                <div style="font-weight:600;font-size:.9rem;color:#374151;">Minimum Attendance</div>
                <div style="font-size:.78rem;color:#6b7280;">Student must meet this attendance threshold to be promoted</div>
              </div>
              <div style="display:flex;align-items:center;gap:.5rem;">
                <input type="number" id="promo-min-attendance" value="${App.data.promotionSettings?.minAttendance ?? 75}" min="0" max="100" style="${inputStyle()};width:80px;text-align:center;">
                <span style="font-size:.85rem;color:#6b7280;">%</span>
              </div>
            </div>

            <!-- Core subjects (must pass all) -->
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;">
              <div style="display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:start;margin-bottom:.75rem;">
                <input type="checkbox" id="promo-use-core" ${App.data.promotionSettings?.useCoreSubjects ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;margin-top:2px;">
                <div>
                  <div style="font-weight:600;font-size:.9rem;color:#374151;">Must Pass Core Subjects</div>
                  <div style="font-size:.78rem;color:#6b7280;">Student must pass all listed subjects to be promoted</div>
                </div>
              </div>
              <div style="margin-left:2rem;">
                <label style="${labelStyle()}">Core Subjects (comma separated)</label>
                <input id="promo-core-subjects" value="${(App.data.promotionSettings?.coreSubjects||['Mathematics','English Language']).join(', ')}" placeholder="e.g. Mathematics, English Language" style="${inputStyle()}">
              </div>
            </div>

          </div>
        </div>

        <!-- Promotion Decision Labels -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;margin-bottom:1.75rem;">
          <h4 style="margin:0 0 1rem;color:#1e3a5f;">🏷 Decision Labels</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
            <div>
              <label style="${labelStyle()}">Promoted Label</label>
              <input id="promo-label-promoted" value="${App.data.promotionSettings?.labelPromoted || 'PROMOTED'}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Repeat Label</label>
              <input id="promo-label-repeat" value="${App.data.promotionSettings?.labelRepeat || 'REPEAT'}" style="${inputStyle()}">
            </div>
            <div>
              <label style="${labelStyle()}">Incomplete Label</label>
              <input id="promo-label-incomplete" value="${App.data.promotionSettings?.labelIncomplete || 'INCOMPLETE'}" style="${inputStyle()}">
            </div>
          </div>
        </div>

        <!-- Cumulative Display Options -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;margin-bottom:1.75rem;">
          <h4 style="margin:0 0 1rem;color:#1e3a5f;">📄 Cumulative Report Card Options</h4>
          <div style="display:flex;flex-direction:column;gap:.75rem;">
            ${[
              ['promo-show-term-breakdown', 'Show each term\'s score beside cumulative total', App.data.promotionSettings?.showTermBreakdown !== false],
              ['promo-show-position',       'Show cumulative position in class',              App.data.promotionSettings?.showCumulativePosition !== false],
              ['promo-show-promotion-box',  'Show Promotion Decision box on Third Term card', App.data.promotionSettings?.showPromotionBox !== false],
              ['promo-show-next-class',     'Show "Promoted to Class" on report card',        App.data.promotionSettings?.showNextClass],
            ].map(([id, label, checked]) => `
              <label style="display:flex;align-items:center;gap:.65rem;cursor:pointer;padding:.5rem .75rem;background:#f8fafc;border-radius:7px;border:1px solid #e2e8f0;">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;">
                <span style="font-size:.875rem;color:#374151;">${label}</span>
              </label>`).join('')}
          </div>
        </div>

        <button onclick="savePromotionSettings()" style="${btnStyle('primary')};min-width:220px;">💾 Save Promotion Settings</button>

        <!-- Auto-Promotion Quick Launch -->
        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:1.5rem;margin-top:1.75rem;">
          <h4 style="margin:0 0 .5rem;color:#7c3aed;">⚡ Auto-Promotion</h4>
          <p style="margin:0 0 1rem;font-size:.85rem;color:#6b7280;">
            After saving criteria above, run Auto-Promotion from the <strong>Results → Cumulative tab</strong> to evaluate and stamp decisions for an entire class. Only Admin can execute this.
          </p>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
            <button onclick="switchSection('results');setTimeout(()=>{switchResultTab('cumulative');openAutoPromotionWizard();},300);" style="${btnStyle('primary')};background:#7c3aed;">
              ⚡ Open Auto-Promotion Wizard
            </button>
            <button onclick="renderPromotionHistory()" style="${btnStyle('secondary')}">📋 View Promotion Records</button>
          </div>
          <div id="promo-history-area" style="margin-top:1.25rem;"></div>
        </div>
      </div>

      <!-- ══════════════════════════════════
           TAB: DATA MANAGEMENT
      ══════════════════════════════════ -->
      <div id="tab-data" class="settings-tab" style="display:none;">
        <h3 style="margin:0 0 1.5rem; color:#1e40af;">Data Management & Backup</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:1.5rem;">

          <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">📤 Export / Backup</h4>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <button onclick="exportData()" style="${btnStyle('secondary')}; width:100%;">📥 Export Full Data (JSON)</button>
              <button onclick="exportStudentsCSV()" style="${btnStyle('secondary')}; width:100%;">📊 Export Students (CSV)</button>
              <button onclick="exportResultsCSV()" style="${btnStyle('secondary')}; width:100%;">📊 Export Results (CSV)</button>
            </div>
          </div>

          <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1.5rem;">
            <h4 style="margin:0 0 1rem; color:#334155;">📥 Import Data</h4>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div>
                <label style="${labelStyle()}">Import from JSON Backup</label>
                <input type="file" id="import-json" accept=".json"
                  onchange="handleImportJSON(this.files[0])"
                  style="display:block; margin-top:0.25rem; font-size:0.85rem;">
              </div>
              <div>
                <label style="${labelStyle()}">Import Students (CSV)</label>
                <input type="file" id="import-csv" accept=".csv"
                  onchange="handleImportStudentsCSV(this.files[0])"
                  style="display:block; margin-top:0.25rem; font-size:0.85rem;">
                <small style="color:#64748b; font-size:0.78rem;">
                  CSV must include: name, admissionNo, class, arm, gender
                </small>
              </div>
            </div>
          </div>

          <div style="border:1px solid #fecaca; background:#fff5f5; border-radius:8px; padding:1.5rem;">
            <h4 style="margin:0 0 1rem; color:#dc2626;">⚠️ Danger Zone</h4>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <button onclick="clearResults()" style="${btnStyle('danger')}">🗑️ Clear All Academic Results</button>
              <button onclick="clearAttendance()" style="${btnStyle('danger')}">🗑️ Clear Attendance Records</button>
              <button onclick="clearSpecialDays()" style="${btnStyle('danger')}">🗑️ Clear All Special Days</button>
              <button onclick="resetAllData()" style="background:#7f1d1d; color:#fff; border:none; border-radius:8px; padding:0.65rem 1.25rem; cursor:pointer; font-weight:700; font-size:0.9rem;">
                ☢️ Reset Entire Database
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>`;

  // ── Activate first tab ──────────────────────
  window.showSettingsTab = function(tabId) {
    document.querySelectorAll('.settings-tab').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.settings-tab-btn').forEach(b => {
      b.style.color = '#64748b';
      b.style.borderBottomColor = 'transparent';
    });
    const tabEl = document.getElementById(`tab-${tabId}`);
    const btnEl = document.getElementById(`stab-${tabId}`);
    if (tabEl) tabEl.style.display = 'block';
    if (btnEl) {
      btnEl.style.color = '#1e40af';
      btnEl.style.borderBottomColor = '#1e40af';
    }
  };
  showSettingsTab('school');

  // ── School form ────────────────────────────
  document.getElementById('school-form').onsubmit = e => {
    e.preventDefault();
    App.data.schoolInfo = {
      ...(App.data.schoolInfo || {}),
      name:           document.getElementById('set-name').value.trim(),
      address:        document.getElementById('set-address').value.trim(),
      logo:           document.getElementById('set-logo').value.trim(),
      session:        document.getElementById('set-session').value.trim(),
      term:           document.getElementById('set-term').value,
      principal:      document.getElementById('set-principal').value.trim(),
      email:          document.getElementById('set-email').value.trim(),
      phone:          document.getElementById('set-phone').value.trim(),
      website:        document.getElementById('set-website').value.trim(),
      resumptionDate: document.getElementById('set-resumption').value,
      announcements:  document.getElementById('set-announcements').value.trim(),
      motto:          document.getElementById('set-motto').value.trim(),
    };
    saveAppData?.();
    toast('School settings saved successfully', 'success');
  };

  // ── Load sub-views ─────────────────────────
  renderClassesList();
  renderSpecialDaysList();
  initGradingScale();
  watchBreakdownSum();
}

/* ═══════════════════════════════════════════════════
   ATTENDANCE SETTINGS
═══════════════════════════════════════════════════ */

function renderSpecialDaysList() {
  const container = document.getElementById('special-days-list');
  if (!container) return;

  const days = (App.data.attendanceSettings?.specialDays || [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) {
    container.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No special days added yet.</p>';
    return;
  }

  const typeColors = {
    holiday: '#fee2e2:#dc2626',
    'half-day': '#fef9c3:#b45309',
    break:    '#ffedd5:#ea580c',
    exam:     '#dbeafe:#1d4ed8',
    closed:   '#f1f5f9:#475569',
    event:    '#dcfce7:#16a34a',
    sports:   '#ede9fe:#7c3aed',
    custom:   '#f1f5f9:#64748b',
  };

  const typeIcons = {
    holiday:'🔴', 'half-day':'🟡', break:'🟠', exam:'🔵',
    closed:'⚫', event:'🟢', sports:'🟣', custom:'⚪'
  };

  // Group by month
  const byMonth = {};
  days.forEach(d => {
    const month = d.date.substring(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(d);
  });

  container.innerHTML = `
    <div style="max-height:400px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
      ${Object.entries(byMonth).map(([month, mDays]) => `
        <div style="padding:0.5rem 0.75rem; background:#f8fafc; border-bottom:1px solid #e2e8f0;
                    font-weight:600; font-size:0.82rem; color:#475569; position:sticky; top:0;">
          ${new Date(month + '-01').toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
          <span style="font-weight:400; margin-left:0.5rem;">(${mDays.length} day${mDays.length > 1 ? 's' : ''})</span>
        </div>
        ${mDays.map(d => {
          const [bg, fg] = (typeColors[d.type] || typeColors.custom).split(':');
          return `
            <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0.75rem;
                        border-bottom:1px solid #f1f5f9; font-size:0.88rem;">
              <span style="background:${bg}; color:${fg}; padding:0.2rem 0.6rem; border-radius:999px;
                           font-size:0.78rem; white-space:nowrap; min-width:90px; text-align:center;">
                ${typeIcons[d.type] || '⚪'} ${d.type}
              </span>
              <span style="font-weight:600; min-width:90px; color:#334155;">
                ${new Date(d.date + 'T00:00').toLocaleDateString('en-NG', {weekday:'short', day:'numeric', month:'short'})}
              </span>
              <span style="flex:1; color:#475569;">${esc(d.label)}</span>
              <button onclick="removeSpecialDay('${d.date}')"
                style="border:none; background:none; color:#ef4444; cursor:pointer; font-size:1.1rem; line-height:1; padding:0.2rem;">×</button>
            </div>
          `;
        }).join('')}
      `).join('')}
    </div>
    <div style="margin-top:0.5rem; font-size:0.82rem; color:#64748b; text-align:right;">
      Total: <strong>${days.length}</strong> special days configured
    </div>
  `;
}

window.addSpecialDay = function() {
  const date  = document.getElementById('sd-date').value;
  const label = document.getElementById('sd-label').value.trim();
  const type  = document.getElementById('sd-type').value;
  if (!date) return toast('Please select a date', 'warning');
  if (!label) return toast('Please enter a description', 'warning');

  App.data.attendanceSettings = App.data.attendanceSettings || {};
  App.data.attendanceSettings.specialDays = App.data.attendanceSettings.specialDays || [];

  if (App.data.attendanceSettings.specialDays.some(d => d.date === date)) {
    return toast('This date already has a special day entry', 'warning');
  }

  App.data.attendanceSettings.specialDays.push({ date, label, type });
  document.getElementById('sd-date').value  = '';
  document.getElementById('sd-label').value = '';
  renderSpecialDaysList();
  toast('Special day added', 'success');
};

window.addSpecialDayRange = function() {
  const start = document.getElementById('sd-range-start').value;
  const end   = document.getElementById('sd-range-end').value;
  const label = document.getElementById('sd-range-label').value.trim();
  const type  = document.getElementById('sd-range-type').value;

  if (!start || !end) return toast('Please select both start and end dates', 'warning');
  if (start > end)    return toast('Start date must be before end date', 'warning');
  if (!label)         return toast('Please enter a label for this range', 'warning');

  App.data.attendanceSettings = App.data.attendanceSettings || {};
  App.data.attendanceSettings.specialDays = App.data.attendanceSettings.specialDays || [];

  const existing = new Set(App.data.attendanceSettings.specialDays.map(d => d.date));
  let added = 0;
  const cursor = new Date(start + 'T00:00');
  const endDate = new Date(end + 'T00:00');

  while (cursor <= endDate) {
    const iso = cursor.toISOString().substring(0, 10);
    if (!existing.has(iso)) {
      App.data.attendanceSettings.specialDays.push({ date: iso, label, type });
      added++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  document.getElementById('sd-range-start').value = '';
  document.getElementById('sd-range-end').value   = '';
  document.getElementById('sd-range-label').value = '';
  renderSpecialDaysList();
  toast(`Added ${added} day${added !== 1 ? 's' : ''} to the calendar`, 'success');
};

window.removeSpecialDay = function(date) {
  if (!App.data.attendanceSettings?.specialDays) return;
  App.data.attendanceSettings.specialDays =
    App.data.attendanceSettings.specialDays.filter(d => d.date !== date);
  renderSpecialDaysList();
  toast('Special day removed', 'warning');
};

window.clearSpecialDays = function() {
  if (!confirm('Remove all special days from the calendar?')) return;
  if (App.data.attendanceSettings) App.data.attendanceSettings.specialDays = [];
  renderSpecialDaysList();
  toast('All special days cleared', 'warning');
};

window.saveAttendanceSettings = function() {
  const workingDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    .filter(day => document.getElementById(`wd-${day}`)?.checked);

  App.data.attendanceSettings = {
    ...(App.data.attendanceSettings || {}),
    termStart:              document.getElementById('att-term-start')?.value || '',
    termEnd:                document.getElementById('att-term-end')?.value   || '',
    expectedDays:           parseInt(document.getElementById('att-expected-days')?.value) || null,
    workingDays,
    openTime:               document.getElementById('att-open-time')?.value  || '07:30',
    closeTime:              document.getElementById('att-close-time')?.value || '14:30',
    lateAfter:              document.getElementById('att-late-time')?.value  || '08:00',
    minAttendancePct:       parseInt(document.getElementById('att-min-pct')?.value) || 75,
    consecutiveAbsentAlert: parseInt(document.getElementById('att-absent-alert')?.value) || 3,
    lateMarkThreshold:      parseInt(document.getElementById('att-late-threshold')?.value) || 3,
    allowExcused:           document.getElementById('att-allow-excused')?.checked ?? true,
    countExcusedAsPresent:  document.getElementById('att-count-excused')?.checked ?? false,
    showOnReport:           document.getElementById('att-show-on-report')?.checked ?? true,
  };

  saveAppData?.();
  toast('Attendance & calendar settings saved', 'success');
};

window.recalculateAttendanceSummary = function() {
  if (!confirm('Recalculate attendance percentages for all students based on current calendar settings?')) return;
  // Hook into your attendance calculation engine here
  toast('Attendance summaries recalculated', 'success');
};

/* ═══════════════════════════════════════════════════
   GENERAL SETTINGS  
═══════════════════════════════════════════════════ */

window.saveGeneralSettings = function() {
  const getBool = id => document.getElementById(id)?.checked ?? false;
  const getVal  = id => document.getElementById(id)?.value;

  App.data.generalSettings = {
    // Report card
    resultMode:       getVal('gen-result-mode'),
    positionMode:     getVal('gen-position-mode'),
    decimalPlaces:    parseInt(getVal('gen-decimal-places')) || 1,
    reportFooter:     getVal('gen-report-footer'),
    commentCharLimit: parseInt(getVal('gen-comment-limit')) || 150,
    showPhoto:        getBool('gen-show-photo'),
    showGPA:          getBool('gen-show-gpa'),
    showClassAvg:     getBool('gen-show-class-avg'),
    showDomain:       getBool('gen-show-domain'),
    showAttendance:   getBool('gen-show-attendance'),
    cumulativeResults:getBool('gen-cumulative-results'),
    // Score entry
    scoreEntryMode:   getVal('gen-entry-mode'),
    maxScore:         parseInt(getVal('gen-max-score')) || 100,
    passMark:              parseInt(getVal('gen-pass-mark'))    || 40,
    maxSubjectsPerStudent: parseInt(getVal('gen-max-subjects')) || 9,
    allowScoreEdit:   getBool('gen-allow-score-edit'),
    lockPublished:    getBool('gen-lock-published'),
    autoGrade:        getBool('gen-auto-grade'),
    validateRange:    getBool('gen-validate-range'),
    absentAutoZero:   getBool('gen-allow-absent-zero'),
    // Notifications
    notifyAbsent:     getBool('gen-notify-absent'),
    notifyLowScore:   getBool('gen-notify-low-score'),
    notifyFees:       getBool('gen-notify-fees'),
    notifyResults:    getBool('gen-notify-results'),
    notifyResumption: getBool('gen-notify-resumption'),
    // Portal access
    portalParent:     getBool('gen-portal-parent'),
    portalStudent:    getBool('gen-portal-student'),
    portalTeacher:    getBool('gen-portal-teacher'),
    resultsPublic:    getBool('gen-results-public'),
    feesPortal:       getBool('gen-fees-portal'),
    timetablePublic:  getBool('gen-timetable-public'),
    // Locale
    dateFormat:       getVal('gen-date-format'),
    currency:         getVal('gen-currency'),
    locale:           getVal('gen-locale'),
    yearStartMonth:   parseInt(getVal('gen-year-start')) || 9,
    // System behaviour
    autoSave:         getBool('gen-auto-save'),
    confirmDelete:    getBool('gen-confirm-delete'),
    auditLog:         getBool('gen-audit-log'),
    darkMode:         getBool('gen-dark-mode'),
    compactTables:    getBool('gen-compact-tables'),
    printWatermark:   getBool('gen-print-watermark'),
    sessionTimeout:   parseInt(getVal('gen-session-timeout')) || 60,
  };

  saveAppData?.();
  toast('General settings saved', 'success');
};

/* ═══════════════════════════════════════════════════
   PROMOTION SETTINGS
═══════════════════════════════════════════════════ */

/* ── Promotion Records History ── */
window.renderPromotionHistory = function() {
  const area = document.getElementById('promo-history-area');
  if (!area) return;
  const records = App.data.promotionRecords || [];
  if (!records.length) {
    area.innerHTML = `<p style="font-size:.85rem;color:#9ca3af;text-align:center;padding:1rem;">No promotion records yet. Run Auto-Promotion to create records.</p>`;
    return;
  }
  // Group by session
  const sessions = [...new Set(records.map(r => r.session))].sort().reverse();
  area.innerHTML = sessions.map(sess => {
    const recs = records.filter(r => r.session === sess);
    const promoted   = recs.filter(r => r.decision === (App.data.promotionSettings?.labelPromoted || 'PROMOTED')).length;
    const repeat     = recs.filter(r => r.decision === (App.data.promotionSettings?.labelRepeat   || 'REPEAT')).length;
    const incomplete = recs.length - promoted - repeat;
    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:1rem;overflow:hidden;">
        <div style="background:#f8fafc;padding:.75rem 1rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">
          <span style="font-weight:700;color:#1e3a5f;">Session: ${sess}</span>
          <div style="display:flex;gap:.75rem;font-size:.78rem;">
            <span style="color:#16a34a;font-weight:700;">${promoted} Promoted</span>
            <span style="color:#dc2626;font-weight:700;">${repeat} Repeat</span>
            <span style="color:#d97706;font-weight:700;">${incomplete} Incomplete</span>
          </div>
        </div>
        <div style="overflow-x:auto;max-height:240px;overflow-y:auto;">
        <table style="${tableStyle()}">
          <thead><tr style="${thRowStyle()}">
            <th style="${thStyle()}">Student</th>
            <th style="${thStyle('70px')}">Grand Avg</th>
            <th style="${thStyle('60px')}">Passed</th>
            <th style="${thStyle('110px')}">Decision</th>
            <th style="${thStyle()}">Applied By</th>
            <th style="${thStyle()}">Date</th>
          </tr></thead>
          <tbody>
            ${recs.map(rec => {
              const student = App.data.students?.find(s => s.id === rec.studentId);
              const dc = rec.decision === (App.data.promotionSettings?.labelPromoted||'PROMOTED') ? '#16a34a'
                       : rec.decision === (App.data.promotionSettings?.labelRepeat||'REPEAT')    ? '#dc2626' : '#d97706';
              return `<tr style="${trStyle()}">
                <td style="${tdStyle()};font-weight:600;">${student?.name || rec.studentId}<br><span style="font-size:.7rem;color:#9ca3af;">${student?.class||''} ${student?.arm||''}</span></td>
                <td style="${tdStyle()};text-align:center;font-weight:700;">${rec.grandAvg ?? '—'}</td>
                <td style="${tdStyle()};text-align:center;">${rec.passed ?? '—'}</td>
                <td style="${tdStyle()};text-align:center;">
                  <span style="background:${dc}18;color:${dc};font-weight:800;font-size:.75rem;padding:.2rem .5rem;border-radius:4px;">${rec.decision}</span>
                  ${rec.reasons?.length && rec.decision !== (App.data.promotionSettings?.labelPromoted||'PROMOTED') ?
                    `<div style="font-size:.62rem;color:#ef4444;margin-top:1px;" title="${rec.reasons.join('; ')}">ⓘ ${rec.reasons[0]?.substring(0,25)}…</div>` : ''}
                </td>
                <td style="${tdStyle()};font-size:.78rem;">${rec.appliedBy || '—'}</td>
                <td style="${tdStyle()};font-size:.78rem;color:#6b7280;">${rec.appliedAt ? new Date(rec.appliedAt).toLocaleDateString() : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>
      </div>`;
  }).join('');
};

window.savePromotionSettings = function() {
  const getBool = id => document.getElementById(id)?.checked ?? false;
  const getVal  = id => document.getElementById(id)?.value;

  const coreRaw = getVal('promo-core-subjects') || '';
  const coreSubjects = coreRaw.split(',').map(s => s.trim()).filter(Boolean);

  App.data.promotionSettings = {
    enableCumulative:        getBool('promo-enable-cumulative'),
    // Criteria
    useAverage:              getBool('promo-use-avg'),
    minAverage:              parseFloat(getVal('promo-min-avg'))          || 40,
    usePassCount:            getBool('promo-use-pass-count'),
    minPassCount:            parseInt(getVal('promo-min-pass-count'))     || 5,
    useNoFail:               getBool('promo-use-no-fail'),
    noFailMark:              parseFloat(getVal('promo-no-fail-mark'))     || 30,
    useAttendance:           getBool('promo-use-attendance'),
    minAttendance:           parseFloat(getVal('promo-min-attendance'))   || 75,
    useCoreSubjects:         getBool('promo-use-core'),
    coreSubjects,
    // Labels
    labelPromoted:           getVal('promo-label-promoted')              || 'PROMOTED',
    labelRepeat:             getVal('promo-label-repeat')                || 'REPEAT',
    labelIncomplete:         getVal('promo-label-incomplete')            || 'INCOMPLETE',
    // Display
    showTermBreakdown:       getBool('promo-show-term-breakdown'),
    showCumulativePosition:  getBool('promo-show-position'),
    showPromotionBox:        getBool('promo-show-promotion-box'),
    showNextClass:           getBool('promo-show-next-class'),
  };

  saveAppData?.();
  toast('Promotion & cumulative settings saved!', 'success');
};

/* ═══════════════════════════════════════════════════
   GRADING SCALE
═══════════════════════════════════════════════════ */

function initGradingScale() {
  if (!App.data.gradingScale) {
    App.data.gradingScale = defaultGradingScale();
  }
}

function defaultGradingScale() {
  return [
    {min:75, max:100, grade:'A1', remark:'Excellent',  gpa:5.0},
    {min:70, max:74,  grade:'B2', remark:'Very Good',   gpa:4.0},
    {min:65, max:69,  grade:'B3', remark:'Good',        gpa:3.5},
    {min:60, max:64,  grade:'C4', remark:'Credit',      gpa:3.0},
    {min:55, max:59,  grade:'C5', remark:'Credit',      gpa:2.5},
    {min:50, max:54,  grade:'C6', remark:'Credit',      gpa:2.0},
    {min:45, max:49,  grade:'D7', remark:'Pass',        gpa:1.5},
    {min:40, max:44,  grade:'E8', remark:'Weak Pass',   gpa:1.0},
    {min:0,  max:39,  grade:'F9', remark:'Fail',        gpa:0.0},
  ];
}

window.addGradingRow = function() {
  const tbody = document.querySelector('#grading-table tbody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="number" min="0" max="100" style="${inputStyle('sm')}"></td>
    <td><input type="number" min="0" max="100" style="${inputStyle('sm')}"></td>
    <td><input maxlength="2" style="${inputStyle('sm')}"></td>
    <td><input style="${inputStyle('sm')}"></td>
    <td><input type="number" step="0.1" min="0" max="5" placeholder="—" style="${inputStyle('sm')}"></td>
    <td><button onclick="this.closest('tr').remove()" style="${btnStyle('danger','xs')}">×</button></td>
  `;
  tbody.appendChild(row);
};

window.removeGradingRow = btn => btn.closest('tr').remove();

window.saveGradingAndDomains = function() {
  const rows = document.querySelectorAll('#grading-table tbody tr');
  const scale = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const min = Number(inputs[0].value);
    const max = Number(inputs[1].value);
    if (!isNaN(min) && !isNaN(max) && inputs[2].value.trim()) {
      scale.push({ min, max, grade: inputs[2].value.trim(), remark: inputs[3].value.trim(), gpa: parseFloat(inputs[4].value) || null });
    }
  });
  App.data.gradingScale = scale.sort((a,b) => b.min - a.min);

  App.data.domainLabels = {};
  [1,2,3,4,5].forEach(s => {
    const val = document.getElementById(`domain-label-${s}`)?.value.trim();
    if (val) App.data.domainLabels[s] = val;
  });

  // Score breakdown
  const bkd = {};
  document.querySelectorAll('[data-breakdown]').forEach(inp => {
    bkd[inp.dataset.breakdown] = parseInt(inp.value) || 0;
  });
  App.data.scoreBreakdown = bkd;

  saveAppData?.();
  toast('Grading scale & domain labels saved', 'success');
};

function renderScoreBreakdownInputs() {
  const defaults = App.data.scoreBreakdown || { 'CA': 40, 'Exam': 60 };
  return Object.entries(defaults).map(([k,v]) => `
    <div>
      <label style="${labelStyle()}">${k} (%)</label>
      <input type="number" data-breakdown="${k}" value="${v}" min="0" max="100"
        oninput="updateBreakdownSum()" style="${inputStyle()}; max-width:100px;">
    </div>
  `).join('');
}

function watchBreakdownSum() { updateBreakdownSum(); }

window.updateBreakdownSum = function() {
  const inputs = document.querySelectorAll('[data-breakdown]');
  let sum = 0;
  inputs.forEach(i => sum += parseInt(i.value) || 0);
  const notice = document.getElementById('breakdown-sum-notice');
  if (!notice) return;
  if (sum === 100) {
    notice.style.color = '#16a34a';
    notice.textContent = '✓ Breakdown sums to 100%';
  } else {
    notice.style.color = '#dc2626';
    notice.textContent = `⚠ Current total: ${sum}% — must equal 100%`;
  }
};

/* ═══════════════════════════════════════════════════
   CLASSES & ARMS  (unchanged from original)
═══════════════════════════════════════════════════ */

function renderClassesList() {
  const container = document.getElementById('classes-list');
  if (!container) return;
  container.innerHTML = App.data.classes?.length
    ? App.data.classes.map(cls => `
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:1rem; margin-bottom:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <strong style="font-size:1.05rem;">${esc(cls.name)}</strong>
          <button onclick="deleteClass('${cls.name}')" style="${btnStyle('danger','sm')}">Delete Class</button>
        </div>
        <div>
          <strong style="font-size:0.85rem; color:#64748b;">Arms / Sections:</strong>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem;">
            ${cls.arms?.map(arm => `
              <span style="background:#e0f2fe; padding:0.3rem 0.7rem; border-radius:999px; font-size:0.88rem; display:flex; align-items:center; gap:0.4rem;">
                ${esc(arm)}
                <button onclick="removeArm('${cls.name}','${arm}')"
                  style="border:none;background:none;color:#ef4444;font-size:1rem;line-height:1;cursor:pointer;padding:0;">×</button>
              </span>
            `).join('') || '<span style="color:#9ca3af; font-size:0.85rem;">No arms defined</span>'}
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.75rem;">
            <input id="new-arm-${cls.name}" placeholder="Arm name (e.g. A)" style="${inputStyle('sm')}; width:160px;">
            <button onclick="addArm('${cls.name}')" style="${btnStyle('success','sm')}">+ Add Arm</button>
          </div>
        </div>
      </div>
    `).join('')
    : '<p style="color:#9ca3af;text-align:center;padding:2rem;">No classes defined yet.</p>';
}

window.addNewClass = function() {
  const name = prompt('Enter new class name (e.g. JSS 1, SSS 2):');
  if (!name?.trim()) return;
  if ((App.data.classes || []).some(c => c.name === name.trim())) return toast('Class already exists', 'warning');
  App.data.classes = App.data.classes || [];
  App.data.classes.push({ name: name.trim(), arms: [] });
  renderClassesList();
  toast('Class added', 'success');
};

window.deleteClass = function(name) {
  if (!confirm(`Delete class "${name}" and all related data?`)) return;
  App.data.classes = (App.data.classes || []).filter(c => c.name !== name);
  renderClassesList();
  toast('Class removed', 'warning');
};

window.addArm = function(className) {
  const input = document.getElementById(`new-arm-${className}`);
  const arm = input?.value.trim();
  if (!arm) return toast('Enter an arm name', 'warning');
  const cls = App.data.classes.find(c => c.name === className);
  if (cls) {
    cls.arms = cls.arms || [];
    if (cls.arms.includes(arm)) return toast('Arm already exists', 'warning');
    cls.arms.push(arm);
    input.value = '';
    renderClassesList();
    toast('Arm added', 'success');
  }
};

window.removeArm = function(className, arm) {
  const cls = (App.data.classes || []).find(c => c.name === className);
  if (cls) {
    cls.arms = cls.arms.filter(a => a !== arm);
    renderClassesList();
    toast('Arm removed', 'warning');
  }
};

/* ═══════════════════════════════════════════════════
   DATA MANAGEMENT  (extra exports/imports)
═══════════════════════════════════════════════════ */

window.exportStudentsCSV = function() {
  const rows = [['Name','Admission No','Class','Arm','Gender','DOB']];
  (App.data.students || []).forEach(s => {
    rows.push([s.name, s.admissionNo, s.class, s.arm, s.gender, s.dob || '']);
  });
  downloadCSV(rows, `students_${Date.now()}.csv`);
  toast('Students exported', 'success');
};

window.exportResultsCSV = function() {
  const rows = [['Student','Admission No','Class','Subject','CA1','CA2','Exam','Total','Grade']];
  (App.data.results || []).forEach(r => {
    rows.push([r.studentName, r.admissionNo, r.class, r.subject, r.ca1||'', r.ca2||'', r.exam||'', r.total||'', r.grade||'']);
  });
  downloadCSV(rows, `results_${Date.now()}.csv`);
  toast('Results exported', 'success');
};

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

window.handleImportJSON = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported || typeof imported !== 'object') throw new Error('Invalid format');
      if (!confirm('This will MERGE the imported data with current data. Continue?')) return;
      Object.assign(App.data, imported);
      saveAppData?.();
      toast('Data imported successfully', 'success');
      renderSettings();
    } catch (err) {
      toast('Import failed — invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
};

window.handleImportStudentsCSV = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const lines = e.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
      let added = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g,''));
        const obj = {};
        headers.forEach((h, idx) => obj[h] = vals[idx] || '');
        if (obj.name && obj.class) {
          App.data.students = App.data.students || [];
          App.data.students.push({ id: `s_${Date.now()}_${i}`, ...obj });
          added++;
        }
      }
      saveAppData?.();
      toast(`${added} student(s) imported`, 'success');
    } catch (err) {
      toast('CSV import failed — check file format', 'error');
    }
  };
  reader.readAsText(file);
};

/* ═══════════════════════════════════════════════════
   RESET (unchanged + extended)
═══════════════════════════════════════════════════ */

window.resetAllData = function() {
  if (!confirm('PERMANENTLY DELETE ALL school data?\n\nStudents, results, attendance, classes, teachers, and all records will be lost.\n\nContinue?')) return toast('Reset cancelled.', 'info');

  const confirmation = prompt('Type exactly:\n\n   RESET DATABASE NOW\n\n(case-sensitive)');
  if (confirmation !== 'RESET DATABASE NOW') return toast('Reset aborted — phrase did not match.', 'warning');

  if (!confirm('Last chance. This cannot be undone.\n\nProceed with full reset?')) return toast('Reset cancelled.', 'info');

  try {
    App.data = {
      students: [],
      results: [],
      attendanceRecords: [],
      attendance: [],
      remarks: [],
      classes: [],
      teachers: [],
      domainAssessments: [],
      users: App.data.users || [],
      schoolInfo: App.data.schoolInfo || {},
      gradingScale: defaultGradingScale(),
      domainLabels: App.data.domainLabels || {},
      attendanceSettings: {},
      generalSettings: {},
    };
    saveAppData?.();
    toast('Full database reset completed.', 'warning');
    renderSettings();
  } catch (err) {
    console.error('Reset failed:', err);
    toast('Reset failed — check console for details.', 'error');
  }
};

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */

/** Safe HTML-escape + optional fallback */
function esc(val, fallback = '') {
  if (val == null || val === '') return fallback;
  return String(val)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function getDefaultDomainLabel(score) {
  return { 1:'Excellent', 2:'Very Good', 3:'Good', 4:'Fair', 5:'Poor' }[score] || 'Not rated';
}

/* ─────────────────────────────────────────
   17. MODAL SYSTEM
───────────────────────────────────────── */
/* ── 19.7. CARD / PANEL STYLES ───────────────────────────────────── */

/**
 * cardStyle(opts?)
 * Options: { shadow, bordered, flush, hover, selected, color }
 */
function cardStyle(opts = {}) {
  const shadow = opts.shadow === false ? 'none'
               : opts.shadow === 'lg'  ? TOKENS.shadow.lg
               : opts.shadow === 'sm'  ? TOKENS.shadow.xs
               : TOKENS.shadow.sm;

  const border = opts.bordered !== false
    ? `border:1px solid ${opts.selected ? TOKENS.color.primaryBorder : TOKENS.color.neutralBorder};`
    : 'border:none;';

  const bg = opts.color === 'primary' ? TOKENS.color.primarySurface
           : opts.color === 'success' ? TOKENS.color.successSurface
           : opts.color === 'danger'  ? TOKENS.color.dangerSurface
           : opts.color === 'warning' ? TOKENS.color.warningSurface
           : '#fff';

  return [
    `background:${bg};`,
    border,
    `border-radius:${TOKENS.radius.xl};`,
    `box-shadow:${shadow};`,
    `padding:1.25rem;`,
    opts.hover    ? `transition:${TOKENS.transition.normal};cursor:pointer;` : '',
    opts.selected ? `outline:2px solid ${TOKENS.color.primary};outline-offset:-1px;` : '',
  ].join('');
}


/* ── 19.8. BANNER / CALLOUT STYLES ───────────────────────────────── */

/**
 * bannerStyle(variant?)
 * Variants: info | success | warning | danger | neutral | primary | purple
 */
function bannerStyle(variant = 'info') {
  const C = TOKENS.color;
  const map = {
    info:    { bg: C.infoSurface,    border: C.infoBorder,    text: C.infoText    },
    success: { bg: C.successSurface, border: C.successBorder, text: C.successText },
    warning: { bg: C.warningSurface, border: C.warningBorder, text: C.warningText },
    danger:  { bg: C.dangerSurface,  border: C.dangerBorder,  text: C.dangerText  },
    primary: { bg: C.primarySurface, border: C.primaryBorder, text: C.primaryText },
    purple:  { bg: C.purpleSurface,  border: C.purpleBorder,  text: C.purpleText  },
    neutral: { bg: C.neutralSurface, border: C.neutralBorder, text: C.neutralText },
  };
  const t = map[variant] ?? map.info;
  return `background:${t.bg};border:1px solid ${t.border};border-radius:${TOKENS.radius.md};padding:.75rem 1rem;font-size:${TOKENS.fontSize.base};color:${t.text};display:flex;align-items:flex-start;gap:.6rem;line-height:1.5;`;
}

/** @deprecated — kept for backward compat */
function infoBanner() { return bannerStyle('info'); }


/* ── 19.9. DIVIDER / SECTION SEPARATOR ──────────────────────────── */

function dividerStyle(opts = {}) {
  const margin = opts.tight ? '.75rem 0' : opts.loose ? '2.5rem 0' : '1.5rem 0';
  return `border:none;border-top:1px solid ${TOKENS.color.neutralBorder};margin:${margin};`;
}

function sectionHeadStyle(opts = {}) {
  const size = opts.size === 'sm' ? TOKENS.fontSize.base
             : opts.size === 'lg' ? '1.15rem'
             : '1rem';
  return `font-size:${size};font-weight:700;color:${TOKENS.color.primary};margin:0 0 1rem;letter-spacing:-.01em;display:flex;align-items:center;gap:.5rem;`;
}


/* ── 19.10. AVATAR / ICON BADGE STYLES ──────────────────────────── */

function avatarStyle(size = 'md', opts = {}) {
  const dim = { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3.5rem', xl: '4.5rem' }[size] ?? '2.5rem';
  const font = { xs: '.6rem', sm: '.75rem', md: '.9rem', lg: '1.25rem', xl: '1.5rem' }[size] ?? '.9rem';
  const color = opts.color ?? TOKENS.color.primary;
  return `width:${dim};height:${dim};border-radius:50%;background:${color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:${font};font-weight:700;flex-shrink:0;overflow:hidden;`;
}


/* ── 19.11. MODAL / OVERLAY STYLES ──────────────────────────────── */

function overlayStyle() {
  return 'position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;';
}

function modalStyle(opts = {}) {
  const maxW = opts.size === 'sm' ? '420px' : opts.size === 'lg' ? '760px' : opts.size === 'xl' ? '960px' : '580px';
  return `background:#fff;border-radius:${TOKENS.radius.xl};box-shadow:${TOKENS.shadow.lg};width:100%;max-width:${maxW};max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;`;
}

function modalHeaderStyle() {
  return `padding:1.25rem 1.5rem;border-bottom:1px solid ${TOKENS.color.neutralBorder};display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-shrink:0;`;
}

function modalBodyStyle() {
  return 'padding:1.5rem;flex:1;overflow-y:auto;';
}

function modalFooterStyle() {
  return `padding:1rem 1.5rem;border-top:1px solid ${TOKENS.color.neutralBorder};display:flex;justify-content:flex-end;gap:.75rem;flex-shrink:0;background:${TOKENS.color.neutralSurface};border-radius:0 0 ${TOKENS.radius.xl} ${TOKENS.radius.xl};`;
}


/* ── 19.12. EMPTY STATE ──────────────────────────────────────────── */

function emptyStateStyle() {
  return `display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 2rem;text-align:center;color:${TOKENS.color.muted};gap:.75rem;`;
}

function emptyStateTitleStyle() {
  return `font-size:1rem;font-weight:600;color:${TOKENS.color.neutralText};margin:0;`;
}

function emptyStateTextStyle() {
  return `font-size:${TOKENS.fontSize.base};color:${TOKENS.color.muted};margin:0;max-width:320px;line-height:1.5;`;
}


/* ── 19.13. SKELETON LOADER ──────────────────────────────────────── */

/** Renders an inline skeleton shimmer block. Use inside innerHTML. */
function skeletonStyle(opts = {}) {
  const h = opts.height ?? '1rem';
  const w = opts.width  ?? '100%';
  const r = opts.radius ?? TOKENS.radius.sm;
  return `display:block;height:${h};width:${w};border-radius:${r};background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;`;
}


/* ── 19.14. UTILITY HELPERS ──────────────────────────────────────── */

/** Flex row shorthand */
function flexRow(opts = {}) {
  const justify = opts.justify ?? 'flex-start';
  const align   = opts.align   ?? 'center';
  const gap     = opts.gap     ?? '.75rem';
  const wrap    = opts.wrap    ? 'flex-wrap:wrap;' : '';
  return `display:flex;align-items:${align};justify-content:${justify};gap:${gap};${wrap}`;
}

/** Flex column shorthand */
function flexCol(opts = {}) {
  const gap  = opts.gap  ?? '.75rem';
  const fill = opts.fill ? 'flex:1;' : '';
  return `display:flex;flex-direction:column;gap:${gap};${fill}`;
}

/** Responsive grid shorthand */
function gridStyle(opts = {}) {
  const min = opts.min   ?? '240px';
  const gap = opts.gap   ?? '1rem';
  const cols = opts.cols ? `grid-template-columns:${opts.cols};` : `grid-template-columns:repeat(auto-fit,minmax(${min},1fr));`;
  return `display:grid;${cols}gap:${gap};`;
}

/** Truncate text to one line */
function truncateStyle() {
  return 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
}

/** Screen-reader only */
function srOnly() {
  return 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
}


/* ── 19.15. INJECT BASE STYLES ───────────────────────────────────── */

/**
 * Call once on app init (or after renderSettings / renderApp).
 * Injects hover/focus/active states and the shimmer keyframe that
 * pure inline styles cannot express.
 */
function injectBaseStyles() {
  if (document.getElementById('app-base-styles')) return; // idempotent
  const style = document.createElement('style');
  style.id = 'app-base-styles';
  style.textContent = `
    /* Button hover / active */
    button:not([disabled]):hover  { opacity: .85; }
    button:not([disabled]):active { opacity: .70; transform: scale(.98); }
    button[disabled]              { opacity: .45; cursor: not-allowed; }

    /* Input focus ring */
    input:focus, select:focus, textarea:focus {
      border-color: ${TOKENS.color.primary} !important;
      box-shadow: ${TOKENS.shadow.focus};
    }

    /* Table row hover */
    tr.hoverable:hover td { background: ${TOKENS.color.primarySurface}; }

    /* Skeleton shimmer */
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Smooth scrollbar */
    ::-webkit-scrollbar        { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track  { background: transparent; }
    ::-webkit-scrollbar-thumb  { background: #d1d5db; border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

    /* Fade-in utility */
    .fade-in { animation: fadeIn .2s ease both; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────
   20. INIT  — single, merged entry point
   Reads session from login.js (SHC_Auth) if available,
   falls back to default Admin for standalone testing.
───────────────────────────────────────── */