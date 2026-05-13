enroll.html
    │
    │  POST /admissions/bulk-enroll
    │  { admission_id, class_id, arm }
    ▼
Backend PHP
    │  1. Validates status === 'Approved'
    │  2. INSERT into students table
    │  3. UPDATE admissions SET status='Enrolled'
    ▼
Database: u156099858_shcaba_db
    students table  ←──── student record created here
    admissions table ←─── status updated to 'Enrolled'
    │
    ▼
dashboard.html → Students section
    GET /students  (renderStudents fetches from DB)
    → student appears in the table immediately
    → class column shows the class they were enrolled into
    
dashboard.html → Classes section  
    GET /classes + GET /students
    → student count per class updates automatically
    
dashboard.html → Dashboard stats
    GET /reports/dashboard
    → "Total Students" count increases
    → "Pending Admissions" count decreases