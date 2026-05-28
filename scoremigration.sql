-- ═══════════════════════════════════════════════════════════════════════════
-- SAHARCO — Score Storage SQL
-- Sacred Heart College School Management System
-- 
-- Run once on Hostinger MySQL (auth-db1777.hstgr.io)
-- Database: u156099858_shcaba_db
--
-- IMPORTANT: The `total` column is GENERATED ALWAYS AS (ca + exam) STORED
-- Never INSERT or UPDATE the total column — MySQL computes it automatically.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Results table (scores) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id   VARCHAR(30)      NOT NULL,
  class_id     INT UNSIGNED     DEFAULT NULL,
  arm          VARCHAR(10)      DEFAULT NULL,
  subject_id   INT UNSIGNED     DEFAULT NULL,
  subject_name VARCHAR(80)      NOT NULL,
  term         VARCHAR(30)      NOT NULL,
  session      VARCHAR(20)      NOT NULL,
  ca           TINYINT UNSIGNED DEFAULT 0,
  exam         TINYINT UNSIGNED DEFAULT 0,
  -- total is COMPUTED automatically — never write to this column
  total        TINYINT UNSIGNED GENERATED ALWAYS AS (ca + exam) STORED,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- One row per student+subject+term+session
  UNIQUE KEY   uniq_result (student_id, subject_name, term, session),
  INDEX idx_class_arm_term (class_id, arm, term, session),
  INDEX idx_student        (student_id),
  INDEX idx_subject        (subject_name),
  FOREIGN KEY  (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY  (class_id)   REFERENCES classes(id)  ON DELETE SET NULL,
  FOREIGN KEY  (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── 2. INSERT a single score (from result entry form) ────────────────────
-- If a score already exists for this student+subject+term+session, update it.
-- NOTE: do NOT include `total` in the column list.

INSERT INTO results
  (student_id, class_id, arm, subject_id, subject_name, term, session, ca, exam)
VALUES
  ('SHC/001', 1, 'A', 3, 'Mathematics', 'First Term', '2025/2026', 32, 55)
ON DUPLICATE KEY UPDATE
  ca   = VALUES(ca),
  exam = VALUES(exam);
-- total updates automatically: 32 + 55 = 87


-- ── 3. BULK INSERT — multiple students, same subject (Save All Results) ───
-- Replace the VALUES list with one row per student.

INSERT INTO results
  (student_id, class_id, arm, subject_id, subject_name, term, session, ca, exam)
VALUES
  ('SHC/001', 1, 'A', 3, 'Mathematics', 'First Term', '2025/2026', 32, 55),
  ('SHC/002', 1, 'A', 3, 'Mathematics', 'First Term', '2025/2026', 28, 49),
  ('SHC/003', 1, 'A', 3, 'Mathematics', 'First Term', '2025/2026', 35, 60),
  ('SHC/004', 1, 'A', 3, 'Mathematics', 'First Term', '2025/2026', 20, 40)
ON DUPLICATE KEY UPDATE
  ca   = VALUES(ca),
  exam = VALUES(exam);


-- ── 4. UPDATE a single score by ID ───────────────────────────────────────
UPDATE results
SET   ca = 35, exam = 58
WHERE id = 42;
-- total recalculates to 93 automatically


-- ── 5. READ scores — one class, one subject, one term ────────────────────
SELECT
  r.id,
  r.student_id       AS studentId,
  s.name             AS studentName,
  c.name             AS class,
  r.arm,
  r.subject_name     AS subject,
  r.term,
  r.session,
  r.ca,
  r.exam,
  r.total,           -- computed by MySQL: ca + exam
  r.updated_at
FROM results r
  JOIN students s ON s.id = r.student_id
  LEFT JOIN classes c ON c.id = r.class_id
WHERE c.name       = 'JS 1'
  AND r.arm        = 'A'
  AND r.subject_name = 'Mathematics'
  AND r.term       = 'First Term'
  AND r.session    = '2025/2026'
ORDER BY s.name;


-- ── 6. READ all scores for one student ───────────────────────────────────
SELECT
  r.subject_name, r.term, r.session,
  r.ca, r.exam, r.total
FROM results r
WHERE r.student_id = 'SHC/001'
  AND r.session    = '2025/2026'
ORDER BY r.term, r.subject_name;


-- ── 7. Class performance summary (for report card / stats) ───────────────
SELECT
  r.subject_name                         AS subject,
  COUNT(*)                               AS students_scored,
  ROUND(AVG(r.total), 1)                 AS class_average,
  MAX(r.total)                           AS highest,
  MIN(r.total)                           AS lowest,
  SUM(r.total >= 40)                     AS passed,
  SUM(r.total < 40)                      AS failed,
  ROUND(SUM(r.total >= 40)/COUNT(*)*100, 1) AS pass_rate_pct
FROM results r
  JOIN students s ON s.id = r.student_id
  LEFT JOIN classes c ON c.id = r.class_id
WHERE c.name   = 'JS 1'
  AND r.arm    = 'A'
  AND r.term   = 'First Term'
  AND r.session= '2025/2026'
GROUP BY r.subject_name
ORDER BY class_average DESC;


-- ── 8. DELETE scores for a student (e.g. when student is removed) ────────
DELETE FROM results WHERE student_id = 'SHC/001';

-- Delete one subject's scores for a class (reset for re-entry)
DELETE FROM results
WHERE class_id    = 1
  AND arm         = 'A'
  AND subject_name= 'Mathematics'
  AND term        = 'First Term'
  AND session     = '2025/2026';


-- ── 9. Class subject allocations ─────────────────────────────────────────
-- Which subjects are taught in each class/arm?

CREATE TABLE IF NOT EXISTS class_subject_allocations (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  class_id   INT UNSIGNED NOT NULL,
  arm        VARCHAR(10)  NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uniq_alloc (class_id, arm, subject_id),
  FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assign subjects to JS 1 A
INSERT IGNORE INTO class_subject_allocations (class_id, arm, subject_id)
SELECT 1, 'A', id FROM subjects WHERE name IN
  ('Mathematics','English Language','Biology','Physics','Chemistry','Economics','Government','Literature','CRS / MRS');

-- View what's allocated to a class
SELECT s.name AS subject, s.code, s.level
FROM class_subject_allocations a
  JOIN subjects s ON s.id = a.subject_id
  JOIN classes  c ON c.id = a.class_id
WHERE c.name = 'JS 1' AND a.arm = 'A'
ORDER BY s.name;


-- ── 10. Score completion check — which subjects still have missing scores? ──
-- Shows students with NO score for a subject (useful for verification tab)

SELECT
  s.id         AS student_id,
  s.name       AS student_name,
  sub.name     AS subject,
  'MISSING'    AS status
FROM students s
  JOIN classes c ON c.id = s.class_id
  JOIN class_subject_allocations a ON a.class_id = s.class_id AND a.arm = s.arm
  JOIN subjects sub ON sub.id = a.subject_id
  LEFT JOIN results r ON
    r.student_id   = s.id AND
    r.subject_name = sub.name AND
    r.term         = 'First Term' AND
    r.session      = '2025/2026'
WHERE c.name  = 'JS 1'
  AND s.arm   = 'A'
  AND r.id IS NULL          -- no result row exists
ORDER BY s.name, sub.name;


-- ── 11. Cumulative results across 3 terms ────────────────────────────────
-- Average of T1 + T2 + T3 per student per subject

SELECT
  s.id          AS student_id,
  s.name        AS student_name,
  r.subject_name AS subject,
  MAX(CASE WHEN r.term='First Term'  THEN r.total END) AS term1,
  MAX(CASE WHEN r.term='Second Term' THEN r.total END) AS term2,
  MAX(CASE WHEN r.term='Third Term'  THEN r.total END) AS term3,
  ROUND(AVG(r.total), 1)                               AS cumulative_avg
FROM results r
  JOIN students s ON s.id = r.student_id
  LEFT JOIN classes c ON c.id = r.class_id
WHERE c.name   = 'JS 1'
  AND r.arm    = 'A'
  AND r.session= '2025/2026'
GROUP BY s.id, s.name, r.subject_name
ORDER BY s.name, r.subject_name;