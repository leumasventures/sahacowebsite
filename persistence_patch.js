/**
 * persistence_patch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Patches script2.js so every mutation that was previously in-memory only
 * is now persisted to the server via api.js helpers.
 *
 * Load order in HTML:
 *   <script src="auth.js"></script>
 *   <script src="api.js"></script>
 *   <script src="script.js"></script>
 *   <script src="script2.js"></script>
 *   <script src="persistence_patch.js"></script>   ← this file
 *   <script src="script3.js"></script>
 *
 * KEY FIX: loadAppData() is gated behind SHC_Auth.ready so it only fires
 * after the session cookie has been verified.  Without this gate, every API
 * call returns 401 because the browser hasn't yet confirmed the session.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── Bootstrap: wait for session, THEN load data ─────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  /* SHC_Auth.ready resolves once auth.js has either confirmed the session
     (cache hit or /auth/me round-trip) or decided to redirect to login.
     If SHC_Auth isn't available for some reason, fall back to a resolved promise. */
  var authReady = (window.SHC_Auth && window.SHC_Auth.ready)
    ? window.SHC_Auth.ready
    : Promise.resolve(null);

  authReady.then(function (session) {

    /* No session — auth.js is already redirecting; don't fire data requests */
    if (!session) return;

    /* Hydrate App.data from the server */
    if (typeof window.loadAppData === 'function' && !window._appDataLoaded) {
      window.loadAppData().then(function () {
        window._appDataLoaded = true;

        /* Re-render once after data loaded */
        if (!window._initialRenderDone) {
          window._initialRenderDone = true;
          if (typeof window.renderSection === 'function' &&
              window.App && window.App.currentSection) {
            window.renderSection(window.App.currentSection);
          }
        }
      }).catch(function (err) {
        console.error('[persistence-patch] loadAppData failed:', err);
      });
    }
  });

  /* ── Patch 1: Classes ──────────────────────────────────────────────────── */
  /* script.js now handles class API calls directly — persistence_patch only
     handles confirmDeleteClass which is called from inline onclick */

  window.confirmDeleteClass = function (id) {
    var cls = (App.data.classes || []).find(function (c) { return c.id === id; });
    if (!cls) return;
    if (App.data.teachers) {
      App.data.teachers.forEach(function (t) {
        if (t.assignedClass === cls.name) { t.assignedClass = ''; t.assignedArm = ''; }
      });
    }
    var p = typeof window.apiDeleteClass === 'function'
      ? window.apiDeleteClass(id)
      : Promise.resolve();
    p.then(function () {
      App.data.classes = App.data.classes.filter(function (c) { return c.id !== id; });
      if (typeof window.closeModal    === 'function') closeModal();
      if (typeof window.renderClasses === 'function') renderClasses();
      if (typeof window.toast === 'function') toast('"' + cls.name + '" deleted.', 'warning');
    }).catch(function (err) {
      if (typeof window.toast === 'function') toast('Error deleting class: ' + (err.message || 'Unknown error'), 'error');
    });
  };

  /* ── Patch 2: Students ─────────────────────────────────────────────────── */
  /* script.js now handles student create/update API calls directly.
     Only confirmDeleteStudent and confirmTransfer are handled here. */

  window.confirmDeleteStudent = function (id) {
    var s    = (App.data.students || []).find(function (st) { return st.id === id; });
    var name = s && s.name || 'Student';

    var p = typeof window.apiDeleteStudent === 'function'
      ? window.apiDeleteStudent(id)
      : Promise.resolve();

    p.then(function () {
      if (typeof window.closeModal     === 'function') closeModal();
      if (typeof window.renderStudents === 'function') {
        renderStudents(window._currentFilter || '', window._currentFilters || {});
      }
      if (typeof window.toast === 'function') toast(name + ' deleted.', 'warning');
    });
  };

  window.confirmTransfer = function (id) {
    var newCls = (document.getElementById('transfer-class') || {}).value;
    var newArm = (document.getElementById('transfer-arm')   || {}).value;
    if (!newCls || !newArm) return;
    var s   = (App.data.students || []).find(function (st) { return st.id === id; });
    var old = s ? (s.class + ' ' + s.arm) : '';

    var p = typeof window.apiTransferStudent === 'function'
      ? window.apiTransferStudent(id, newCls, newArm)
      : Promise.resolve();

    p.then(function () {
      if (typeof window.closeModal     === 'function') closeModal();
      if (typeof window.renderStudents === 'function') {
        renderStudents(window._currentFilter || '', window._currentFilters || {});
      }
      if (typeof window.toast === 'function') {
        toast((s && s.name || 'Student') + ' transferred from ' + old + ' → ' + newCls + ' ' + newArm + '.', 'success');
      }
    });
  };

  /* ── Patch 3: Subjects ─────────────────────────────────────────────────── */
  /* script.js now handles subject create API calls directly.
     Only deleteSubject is handled here. */

  window.deleteSubject = function (id) {
    if (!confirm('Remove this subject?')) return;
    var p = typeof window.apiDeleteSubject === 'function'
      ? window.apiDeleteSubject(id)
      : Promise.resolve();

    p.then(function () {
      App.data.subjects = (App.data.subjects || []).filter(function (s) { return s.id !== id; });
      if (typeof window.renderSubjects === 'function') renderSubjects();
      if (typeof window.toast === 'function') toast('Subject removed.', 'warning');
    }).catch(function (err) {
      if (typeof window.toast === 'function') toast('Error removing subject: ' + (err.message || 'Unknown error'), 'error');
    });
  };

  /* ── Patch 4: Staff ────────────────────────────────────────────────────── */
  /* script.js smSubmitForm now calls the API directly (async).
     persistence_patch must NOT call apiSaveStaff again — it was causing
     double submissions (409 Email already in use / 500 duplicate key). */

  /* Staff is fully handled by script.js smSubmitForm — no patch needed here */

  /* ── Patch 5: Fixtures ─────────────────────────────────────────────────── */
  var _origOpenFixtureModal = window.openFixtureModal;
  window.openFixtureModal = function () {
    if (typeof _origOpenFixtureModal === 'function') _origOpenFixtureModal();

    setTimeout(function () {
      var form = document.getElementById('fixture-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = function (e) {
        e.preventDefault();
        var teamA = (document.getElementById('fix-teamA') || {}).value;
        var teamB = (document.getElementById('fix-teamB') || {}).value;
        if (teamA === teamB) {
          if (typeof window.toast === 'function') toast('Teams must be different.', 'error');
          return;
        }

        var data = {
          type:   (document.getElementById('fix-type')  || {}).value,
          teamA:  teamA,
          teamB:  teamB,
          date:   (document.getElementById('fix-date')  || {}).value,
          time:   (document.getElementById('fix-time')  || {}).value  || '10:00',
          venue:  (document.getElementById('fix-venue') || {}).value  || 'School Field',
          status: 'Upcoming',
        };

        var p = typeof window.apiSaveFixture === 'function'
          ? window.apiSaveFixture(data, null)
          : Promise.resolve();

        p.then(function () {
          if (typeof window.closeModal     === 'function') closeModal();
          if (typeof window.renderFixtures === 'function') renderFixtures();
          if (typeof window.toast === 'function') toast('Fixture added!', 'success');
        });
      };
    }, 80);
  };

  /* ── Patch 6: attSaveDomain (single cell) ──────────────────────────────── */
  var _origAttSaveDomain = window.attSaveDomain;
  window.attSaveDomain = function (studentId, key, value) {
    if (typeof _origAttSaveDomain === 'function') _origAttSaveDomain(studentId, key, value);
    var ctx     = window._attCtx || {};
    var term    = ctx.term;
    var session = ctx.session;
    if (term && typeof window.apiSaveDomainAssessment === 'function') {
      window.apiSaveDomainAssessment(studentId, term, session, key, value);
    }
  };

  /* ── Patch 7: Subject allocation saves ─────────────────────────────────── */
  var _origSaveStudentAllocation = window.saveStudentAllocation;
  window.saveStudentAllocation = function (studentId, cls, arm) {
    if (typeof _origSaveStudentAllocation === 'function') _origSaveStudentAllocation(studentId, cls, arm);
    var allocated = typeof window._currentModalAllocation === 'function'
      ? window._currentModalAllocation()
      : [];
    if (typeof window.apiSaveSubjectAllocation === 'function') {
      window.apiSaveSubjectAllocation(studentId, allocated);
    }
  };

  var _origSaveClassAllocation = window.saveClassAllocation;
  window.saveClassAllocation = function (cls, arm) {
    if (typeof _origSaveClassAllocation === 'function') _origSaveClassAllocation(cls, arm);
    var key      = cls + '_' + arm;
    var subjects = (App.data.subjectAllocations && App.data.subjectAllocations[key]) || [];
    if (typeof window.apiSaveSubjectAllocation === 'function') {
      window.apiSaveSubjectAllocation(key, subjects);
    }
  };

  /* ── Patch 8: Arms CRUD ─────────────────────────────────────────────────── */
  /* script.js addArm and confirmDeleteArm now call Classes.addArm /
     Classes.deleteArm directly — no patch needed here */

  console.info('[persistence-patch] All mutation handlers wired to API.');
});