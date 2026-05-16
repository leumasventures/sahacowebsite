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
  var _origOpenClassModal = window.openClassModal;
  window.openClassModal = function (cls) {
    if (typeof _origOpenClassModal === 'function') _origOpenClassModal(cls);

    setTimeout(function () {
      var form = document.getElementById('class-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = function (e) {
        e.preventDefault();
        var name  = (document.getElementById('cls-name') || {}).value.trim();
        var level = window._activeTierModal || 'Junior';
        var arms  = window._modalArms || [];
        if (!name) return;

        var isEdit = !!cls;
        var id     = cls && cls.id;
        var data   = { name: name, level: level, arms: arms };

        if (isEdit) {
          Object.assign(cls, data);
          (App.data.students || []).forEach(function (s) { if (s.class === cls._prevName) s.class = name; });
          (App.data.teachers || []).forEach(function (t) { if (t.assignedClass === cls._prevName) t.assignedClass = name; });
        } else {
          var newCls = Object.assign({ id: Date.now() }, data);
          App.data.classes = App.data.classes || [];
          App.data.classes.push(newCls);
        }

        if (typeof window.apiSaveClass === 'function') {
          window.apiSaveClass(Object.assign({ id: id }, data), isEdit);
        }

        if (typeof window.closeModal   === 'function') closeModal();
        if (typeof window.renderClasses === 'function') renderClasses();
        if (typeof window.toast === 'function') toast(isEdit ? 'Class updated!' : data.name + ' added!', 'success');
      };
    }, 80);
  };

  window.confirmDeleteClass = function (id) {
    var cls = (App.data.classes || []).find(function (c) { return c.id === id; });
    if (!cls) return;
    if (App.data.teachers) {
      App.data.teachers.forEach(function (t) {
        if (t.assignedClass === cls.name) { t.assignedClass = ''; t.assignedArm = ''; }
      });
    }
    App.data.classes = App.data.classes.filter(function (c) { return c.id !== id; });

    var p = typeof window.apiDeleteClass === 'function'
      ? window.apiDeleteClass(id)
      : Promise.resolve();

    p.then(function () {
      if (typeof window.closeModal    === 'function') closeModal();
      if (typeof window.renderClasses === 'function') renderClasses();
      if (typeof window.toast === 'function') toast('"' + cls.name + '" deleted.', 'warning');
    });
  };

  /* ── Patch 2: Students ─────────────────────────────────────────────────── */
  var _origOpenStudentModal = window.openStudentModal;
  window.openStudentModal = function (student) {
    if (typeof _origOpenStudentModal === 'function') _origOpenStudentModal(student);

    setTimeout(function () {
      var form = document.getElementById('student-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = function (e) {
        e.preventDefault();
        var isEdit = !!student;
        var data = {
          name:   ((document.getElementById('st-name')   || {}).value || '').trim(),
          class:   (document.getElementById('st-class')  || {}).value,
          arm:     (document.getElementById('st-arm')    || {}).value,
          gender:  (document.getElementById('st-gender') || {}).value,
          dob:     (document.getElementById('st-dob')    || {}).value,
          parent:  ((document.getElementById('st-parent')|| {}).value || '').trim(),
          phone:   ((document.getElementById('st-phone') || {}).value || '').trim(),
        };
        if (!data.name) return;

        if (isEdit) {
          data.attendance = parseInt((document.getElementById('st-attendance') || {}).value) || student.attendance;
          Object.assign(student, data);
        } else {
          data.attendance = 100;
        }

        var p = typeof window.apiSaveStudent === 'function'
          ? window.apiSaveStudent(data, isEdit ? student.id : null)
          : Promise.resolve(null);

        p.then(function (result) {
          if (!isEdit) {
            var newId = (result && result.id) || ('SHC/' + String((App.data.students || []).length).padStart(3, '0'));
            data.id = newId;
            App.data.students = App.data.students || [];
            App.data.students.push(Object.assign({}, data));
          }
          if (typeof window.closeModal      === 'function') closeModal();
          if (typeof window.renderStudents  === 'function') {
            renderStudents(window._currentFilter || '', window._currentFilters || {});
          }
          if (typeof window.toast === 'function') toast(isEdit ? 'Student updated!' : 'Student added! ID: ' + data.id, 'success');
        });
      };
    }, 80);
  };

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
  var _origOpenSubjectModal = window.openSubjectModal;
  window.openSubjectModal = function () {
    if (typeof _origOpenSubjectModal === 'function') _origOpenSubjectModal();

    setTimeout(function () {
      var form = document.getElementById('subj-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = function (e) {
        e.preventDefault();
        var name  = ((document.getElementById('sb-name')  || {}).value || '').trim();
        var code  = ((document.getElementById('sb-code')  || {}).value || '').trim().toUpperCase();
        var level = (document.getElementById('sb-level')  || {}).value;
        var type  = (document.getElementById('sb-type')   || {}).value;
        if (!name || !code) return;

        var data = { name: name, code: code, level: level, type: type };

        var p = typeof window.apiSaveSubject === 'function'
          ? window.apiSaveSubject(data, null)
          : Promise.resolve();

        p.then(function () {
          if (typeof window.closeModal     === 'function') closeModal();
          if (typeof window.renderSubjects === 'function') renderSubjects();
          if (typeof window.toast === 'function') toast('Subject added!', 'success');
        });
      };
    }, 80);
  };

  window.deleteSubject = function (id) {
    if (!confirm('Remove this subject?')) return;
    var p = typeof window.apiDeleteSubject === 'function'
      ? window.apiDeleteSubject(id)
      : Promise.resolve();

    p.then(function () {
      if (typeof window.renderSubjects === 'function') renderSubjects();
      if (typeof window.toast === 'function') toast('Subject removed.', 'warning');
    });
  };

  /* ── Patch 4: Staff ────────────────────────────────────────────────────── */
  var _origSmSubmitForm = window.smSubmitForm;
  window.smSubmitForm = function () {
    if (typeof _origSmSubmitForm === 'function') _origSmSubmitForm();

    var id   = window._currentEditStaffId || null;
    var name = ((document.getElementById('sf-name') || {}).value || '').trim();
    if (!name) return;

    var data = {
      name:          name,
      gender:        (document.getElementById('sf-gender')     || {}).value,
      phone:         (document.getElementById('sf-phone')      || {}).value,
      email:         (document.getElementById('sf-email')      || {}).value,
      dateJoined:    (document.getElementById('sf-joined')     || {}).value,
      status:        (document.getElementById('sf-status')     || {}).value,
      category:      (document.getElementById('sf-category')   || {}).value,
      position:      (document.getElementById('sf-position')   || {}).value,
      department:    (document.getElementById('sf-department') || {}).value,
      subject:       (document.getElementById('sf-subject')    || {}).value,
      classUnit:     (document.getElementById('sf-class')      || {}).value,
      arm:           (document.getElementById('sf-arm')        || {}).value,
      qualification: (document.getElementById('sf-qual')       || {}).value,
      experience:    (document.getElementById('sf-exp')        || {}).value,
      notes:         (document.getElementById('sf-notes')      || {}).value,
    };

    if (typeof window.apiSaveStaff === 'function') {
      window.apiSaveStaff(data, id);
    }
  };

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
  var _origAddArm = window.addArm;
  window.addArm = function (classId) {
    var cls = App.data.classes && App.data.classes.find(function (c) { return c.id === classId; });
    if (!cls) return;
    if (typeof _origAddArm === 'function') _origAddArm(classId);

    setTimeout(function () {
      var form = document.getElementById('arm-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = function (e) {
        e.preventDefault();
        var raw     = (document.getElementById('arm-letter') || {}).value || '';
        var letters = raw.split(',').map(function (l) { return l.trim().toUpperCase(); }).filter(Boolean);
        var errEl   = document.getElementById('arm-error');

        if (!letters.length) {
          if (errEl) { errEl.textContent = 'Enter at least one arm letter.'; errEl.style.display = ''; }
          return;
        }
        var dupes = letters.filter(function (l) { return cls.arms && cls.arms.indexOf(l) !== -1; });
        if (dupes.length) {
          if (errEl) { errEl.textContent = 'Already exists: ' + dupes.join(', '); errEl.style.display = ''; }
          return;
        }

        letters.forEach(function (l) { if (!cls.arms) cls.arms = []; cls.arms.push(l); });

        var p = typeof window.apiAddArm === 'function'
          ? window.apiAddArm(classId, letters)
          : Promise.resolve();

        p.then(function () {
          if (typeof window.closeModal       === 'function') closeModal();
          if (typeof window.refreshArmsGrid  === 'function') refreshArmsGrid(cls);
          if (typeof window.toast === 'function') toast('Arm' + (letters.length > 1 ? 's' : '') + ' added!', 'success');
        });
      };
    }, 80);
  };

  window.confirmDeleteArm = function (classId, arm) {
    var cls = App.data.classes && App.data.classes.find(function (c) { return c.id === classId; });
    if (!cls) return;

    (App.data.teachers || []).forEach(function (t) {
      if (t.assignedClass === cls.name && t.assignedArm === arm) t.assignedArm = '';
    });
    cls.arms = (cls.arms || []).filter(function (a) { return a !== arm; });

    var p = typeof window.apiDeleteArm === 'function'
      ? window.apiDeleteArm(classId, arm)
      : Promise.resolve();

    p.then(function () {
      if (typeof window.closeModal      === 'function') closeModal();
      if (typeof window.refreshArmsGrid === 'function') refreshArmsGrid(cls);
      if (typeof window.toast === 'function') toast('Arm ' + cls.name + ' ' + arm + ' removed.', 'warning');
    });
  };

  console.info('[persistence-patch] All mutation handlers wired to API.');
});