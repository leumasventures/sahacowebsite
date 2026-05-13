/**
 * persistence-patch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Patches script2.js so every mutation that was previously in-memory only
 * is now persisted to the server via api-bridge.js helpers.
 *
 * Load order in HTML (AFTER api-bridge.js, AFTER script2.js):
 *   <script type="module" src="api.js"></script>
 *   <script type="module" src="api-bridge.js"></script>
 *   <script src="script.js"></script>
 *   <script src="script2.js"></script>
 *   <script src="persistence-patch.js"></script>   ← add this line
 *   <script src="script3.js"></script>
 *
 * What this patch covers:
 *   1. Class add / edit  (openClassModal form submit)
 *   2. Student add / edit (openStudentModal form submit)
 *   3. Subject add        (openSubjectModal form submit)
 *   4. Staff add / edit   (smSubmitForm)
 *   5. Fixture add        (openFixtureModal form submit)
 *   6. Domain attSaveDomain (single cell save)
 *   7. loadAppData() called on DOMContentLoaded as fallback
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── Wait for everything to be ready ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  /* Bootstrap: hydrate App.data from the server on every page load */
  if (typeof window.loadAppData === 'function') {
    await window.loadAppData();
  }

  /* Re-render whichever section is active after data is loaded */
  if (typeof window.renderSection === 'function' && window.App?.currentSection) {
    window.renderSection(window.App.currentSection);
  }

  /* ── Patch 1: Classes ──────────────────────────────────────────────────── */
  const _origOpenClassModal = window.openClassModal;
  window.openClassModal = function (cls) {
    _origOpenClassModal?.(cls);

    /* Give the modal a tick to render, then wrap its submit */
    setTimeout(() => {
      const form = document.getElementById('class-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      const origSubmit = form.onsubmit;
      form.onsubmit = async function (e) {
        e.preventDefault();

        const name     = document.getElementById('cls-name')?.value.trim();
        const level    = window._activeTierModal || 'Junior'; // openClassModal sets activeLevel
        const arms     = window._modalArms ?? [];             // openClassModal exposes this

        if (!name) return;

        const isEdit = !!cls;
        const id     = cls?.id;
        const data   = { name, level, arms };

        /* Optimistic in-memory update (script2.js already does this via origSubmit)
           but we need the API call too */
        if (isEdit) {
          Object.assign(cls, data);
          /* Propagate rename to students/teachers */
          (App.data.students || []).forEach(s => { if (s.class === cls._prevName) s.class = name; });
          (App.data.teachers || []).forEach(t => { if (t.assignedClass === cls._prevName) t.assignedClass = name; });
        } else {
          const newCls = { id: Date.now(), ...data };
          App.data.classes = App.data.classes || [];
          App.data.classes.push(newCls);
        }

        /* API persist */
        if (typeof window.apiSaveClass === 'function') {
          await window.apiSaveClass({ id, ...data }, isEdit);
        }

        if (typeof window.closeModal === 'function') closeModal();
        if (typeof window.renderClasses === 'function') renderClasses();
        if (typeof window.toast === 'function') toast(isEdit ? 'Class updated!' : `${data.name} added!`, 'success');
      };
    }, 80);
  };

  /* Patch confirmDeleteClass to hit the API */
  window.confirmDeleteClass = async function (id) {
    const cls = (App.data.classes || []).find(c => c.id === id);
    if (!cls) return;
    if (App.data.teachers) {
      App.data.teachers.forEach(t => { if (t.assignedClass === cls.name) { t.assignedClass = ''; t.assignedArm = ''; } });
    }
    App.data.classes = App.data.classes.filter(c => c.id !== id);

    if (typeof window.apiDeleteClass === 'function') {
      await window.apiDeleteClass(id);
    }
    if (typeof window.closeModal === 'function') closeModal();
    if (typeof window.renderClasses === 'function') renderClasses();
    if (typeof window.toast === 'function') toast(`"${cls.name}" deleted.`, 'warning');
  };

  /* ── Patch 2: Students ─────────────────────────────────────────────────── */
  const _origOpenStudentModal = window.openStudentModal;
  window.openStudentModal = function (student) {
    _origOpenStudentModal?.(student);

    setTimeout(() => {
      const form = document.getElementById('student-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = async function (e) {
        e.preventDefault();
        const isEdit = !!student;

        const data = {
          name:       document.getElementById('st-name')?.value.trim(),
          class:      document.getElementById('st-class')?.value,
          arm:        document.getElementById('st-arm')?.value,
          gender:     document.getElementById('st-gender')?.value,
          dob:        document.getElementById('st-dob')?.value,
          parent:     document.getElementById('st-parent')?.value.trim(),
          phone:      document.getElementById('st-phone')?.value.trim(),
        };
        if (!data.name) return;

        if (isEdit) {
          data.attendance = parseInt(document.getElementById('st-attendance')?.value) || student.attendance;
          Object.assign(student, data);
        } else {
          data.attendance = 100;
        }

        const result = await window.apiSaveStudent?.(data, isEdit ? student.id : null);

        if (!isEdit && result?.id) data.id = result.id;
        else if (!isEdit) data.id = `SHC/${String(App.data.students.length).padStart(3,'0')}`;

        if (!isEdit) {
          App.data.students = App.data.students || [];
          App.data.students.push({ ...data, id: data.id || result?.id });
        }

        if (typeof window.closeModal === 'function') closeModal();
        if (typeof window.renderStudents === 'function') {
          renderStudents(window._currentFilter || '', window._currentFilters || {});
        }
        if (typeof window.toast === 'function') toast(isEdit ? 'Student updated!' : `Student added! ID: ${data.id}`, 'success');
      };
    }, 80);
  };

  window.confirmDeleteStudent = async function (id) {
    const s = (App.data.students || []).find(st => st.id === id);
    const name = s?.name || 'Student';

    if (typeof window.apiDeleteStudent === 'function') {
      await window.apiDeleteStudent(id);
    } else {
      App.data.students = App.data.students.filter(st => st.id !== id);
      if (App.data.results) App.data.results = App.data.results.filter(r => r.studentId !== id);
    }
    if (typeof window.closeModal === 'function') closeModal();
    if (typeof window.renderStudents === 'function') {
      renderStudents(window._currentFilter || '', window._currentFilters || {});
    }
    if (typeof window.toast === 'function') toast(`${name} deleted.`, 'warning');
  };

  window.confirmTransfer = async function (id) {
    const newCls = document.getElementById('transfer-class')?.value;
    const newArm = document.getElementById('transfer-arm')?.value;
    if (!newCls || !newArm) return;
    const s = (App.data.students || []).find(st => st.id === id);
    const old = `${s?.class} ${s?.arm}`;

    if (typeof window.apiTransferStudent === 'function') {
      await window.apiTransferStudent(id, newCls, newArm);
    } else {
      if (s) { s.class = newCls; s.arm = newArm; }
    }
    if (typeof window.closeModal === 'function') closeModal();
    if (typeof window.renderStudents === 'function') {
      renderStudents(window._currentFilter || '', window._currentFilters || {});
    }
    if (typeof window.toast === 'function') toast(`${s?.name} transferred from ${old} → ${newCls} ${newArm}.`, 'success');
  };

  /* ── Patch 3: Subjects ─────────────────────────────────────────────────── */
  const _origOpenSubjectModal = window.openSubjectModal;
  window.openSubjectModal = function () {
    _origOpenSubjectModal?.();

    setTimeout(() => {
      const form = document.getElementById('subj-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = async function (e) {
        e.preventDefault();
        const name  = document.getElementById('sb-name')?.value.trim();
        const code  = document.getElementById('sb-code')?.value.trim().toUpperCase();
        const level = document.getElementById('sb-level')?.value;
        const type  = document.getElementById('sb-type')?.value;
        if (!name || !code) return;

        const data = { name, code, level, type };

        if (typeof window.apiSaveSubject === 'function') {
          await window.apiSaveSubject(data, null);
        } else {
          App.data.subjects = App.data.subjects || [];
          App.data.subjects.push({ id: Date.now(), ...data });
        }

        if (typeof window.closeModal === 'function') closeModal();
        if (typeof window.renderSubjects === 'function') renderSubjects();
        if (typeof window.toast === 'function') toast('Subject added!', 'success');
      };
    }, 80);
  };

  window.deleteSubject = async function (id) {
    if (!confirm('Remove this subject?')) return;
    if (typeof window.apiDeleteSubject === 'function') {
      await window.apiDeleteSubject(id);
    } else {
      App.data.subjects = App.data.subjects.filter(s => s.id !== id);
    }
    if (typeof window.renderSubjects === 'function') renderSubjects();
    if (typeof window.toast === 'function') toast('Subject removed.', 'warning');
  };

  /* ── Patch 4: Staff ────────────────────────────────────────────────────── */
  const _origSmSubmitForm = window.smSubmitForm;
  window.smSubmitForm = async function () {
    /* Let script2.js do its in-memory update first */
    if (typeof _origSmSubmitForm === 'function') _origSmSubmitForm();

    const id   = window._currentEditStaffId || null;
    const name = document.getElementById('sf-name')?.value.trim();
    if (!name) return;

    const data = {
      name,
      gender:        document.getElementById('sf-gender')?.value,
      phone:         document.getElementById('sf-phone')?.value,
      email:         document.getElementById('sf-email')?.value,
      dateJoined:    document.getElementById('sf-joined')?.value,
      status:        document.getElementById('sf-status')?.value,
      category:      document.getElementById('sf-category')?.value,
      position:      document.getElementById('sf-position')?.value,
      department:    document.getElementById('sf-department')?.value,
      subject:       document.getElementById('sf-subject')?.value,
      classUnit:     document.getElementById('sf-class')?.value,
      arm:           document.getElementById('sf-arm')?.value,
      qualification: document.getElementById('sf-qual')?.value,
      experience:    document.getElementById('sf-exp')?.value,
      notes:         document.getElementById('sf-notes')?.value,
    };

    if (typeof window.apiSaveStaff === 'function') {
      await window.apiSaveStaff(data, id);
    }
  };

  /* ── Patch 5: Fixtures ─────────────────────────────────────────────────── */
  const _origOpenFixtureModal = window.openFixtureModal;
  window.openFixtureModal = function () {
    _origOpenFixtureModal?.();

    setTimeout(() => {
      const form = document.getElementById('fixture-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      form.onsubmit = async function (e) {
        e.preventDefault();
        const teamA = document.getElementById('fix-teamA')?.value;
        const teamB = document.getElementById('fix-teamB')?.value;
        if (teamA === teamB) { if (typeof window.toast === 'function') toast('Teams must be different.', 'error'); return; }

        const data = {
          type:   document.getElementById('fix-type')?.value,
          teamA, teamB,
          date:   document.getElementById('fix-date')?.value,
          time:   document.getElementById('fix-time')?.value || '10:00',
          venue:  document.getElementById('fix-venue')?.value || 'School Field',
          status: 'Upcoming',
        };

        if (typeof window.apiSaveFixture === 'function') {
          await window.apiSaveFixture(data, null);
        } else {
          App.data.fixtures = App.data.fixtures || [];
          App.data.fixtures.push({ id: Date.now(), ...data });
        }

        if (typeof window.closeModal === 'function') closeModal();
        if (typeof window.renderFixtures === 'function') renderFixtures();
        if (typeof window.toast === 'function') toast('Fixture added!', 'success');
      };
    }, 80);
  };

  /* ── Patch 6: attSaveDomain (single cell) ──────────────────────────────── */
  const _origAttSaveDomain = window.attSaveDomain;
  window.attSaveDomain = function (studentId, key, value) {
    /* In-memory first */
    if (typeof _origAttSaveDomain === 'function') _origAttSaveDomain(studentId, key, value);
    /* Then persist */
    const { term, session } = window._attCtx || {};
    if (term && typeof window.apiSaveDomainAssessment === 'function') {
      window.apiSaveDomainAssessment(studentId, term, session, key, value);
    }
  };

  /* ── Patch 7: Subject allocation saves ─────────────────────────────────── */
  const _origSaveStudentAllocation = window.saveStudentAllocation;
  window.saveStudentAllocation = async function (studentId, cls, arm) {
    if (typeof _origSaveStudentAllocation === 'function') _origSaveStudentAllocation(studentId, cls, arm);
    const allocated = window._currentModalAllocation?.() || [];
    if (typeof window.apiSaveSubjectAllocation === 'function') {
      await window.apiSaveSubjectAllocation(studentId, allocated);
    }
  };

  const _origSaveClassAllocation = window.saveClassAllocation;
  window.saveClassAllocation = async function (cls, arm) {
    if (typeof _origSaveClassAllocation === 'function') _origSaveClassAllocation(cls, arm);
    const key = `${cls}_${arm}`;
    const subjects = App.data.subjectAllocations?.[key] || [];
    if (typeof window.apiSaveSubjectAllocation === 'function') {
      await window.apiSaveSubjectAllocation(key, subjects);
    }
  };

  /* ── Patch 8: Arms CRUD ─────────────────────────────────────────────────── */
  /* addArm form submit */
  const _origAddArm = window.addArm;
  window.addArm = function (classId) {
    const cls = App.data.classes?.find(c => c.id === classId);
    if (!cls) return;

    /* Show modal (script2.js does this) then wrap submit */
    if (typeof _origAddArm === 'function') _origAddArm(classId);

    setTimeout(() => {
      const form = document.getElementById('arm-form');
      if (!form || form.dataset.bridged) return;
      form.dataset.bridged = '1';

      const origSubmit = form.onsubmit;
      form.onsubmit = async function (e) {
        e.preventDefault();
        const raw     = document.getElementById('arm-letter')?.value || '';
        const letters = raw.split(',').map(l => l.trim().toUpperCase()).filter(Boolean);
        const errEl   = document.getElementById('arm-error');

        if (!letters.length) { if (errEl) { errEl.textContent = 'Enter at least one arm letter.'; errEl.style.display = ''; } return; }
        const dupes = letters.filter(l => cls.arms?.includes(l));
        if (dupes.length) { if (errEl) { errEl.textContent = `Already exists: ${dupes.join(', ')}`; errEl.style.display = ''; } return; }

        /* In-memory */
        letters.forEach(l => { if (!cls.arms) cls.arms = []; cls.arms.push(l); });

        /* API */
        if (typeof window.apiAddArm === 'function') {
          await window.apiAddArm(classId, letters);
        }

        if (typeof window.closeModal === 'function') closeModal();
        if (typeof window.refreshArmsGrid === 'function') refreshArmsGrid(cls);
        if (typeof window.toast === 'function') toast(`Arm${letters.length > 1 ? 's' : ''} added!`, 'success');
      };
    }, 80);
  };

  window.confirmDeleteArm = async function (classId, arm) {
    const cls = App.data.classes?.find(c => c.id === classId);
    if (!cls) return;

    (App.data.teachers || []).forEach(t => {
      if (t.assignedClass === cls.name && t.assignedArm === arm) t.assignedArm = '';
    });
    cls.arms = cls.arms?.filter(a => a !== arm) || [];

    if (typeof window.apiDeleteArm === 'function') {
      await window.apiDeleteArm(classId, arm);
    }

    if (typeof window.closeModal === 'function') closeModal();
    if (typeof window.refreshArmsGrid === 'function') refreshArmsGrid(cls);
    if (typeof window.toast === 'function') toast(`Arm ${cls.name} ${arm} removed.`, 'warning');
  };

  /* ── Patch 9: Results single-entry save ─────────────────────────────────── */
  /* saveAllResults is already patched in api-bridge.js — no double-patch needed */

  console.info('[persistence-patch] All mutation handlers wired to API.');
});