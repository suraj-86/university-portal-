
ALTER TABLE university_contacts
    MODIFY COLUMN category VARCHAR(60) NOT NULL DEFAULT 'Administration',
    ADD COLUMN department VARCHAR(100) NULL AFTER category,
    ADD COLUMN course_id INT NULL AFTER department,
    ADD KEY idx_uc_department (department),
    ADD KEY idx_uc_course (course_id),
    ADD CONSTRAINT fk_uc_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE;

UPDATE university_contacts SET category = 'Other' WHERE category = 'Department';
UPDATE university_contacts SET category = 'Hostel & Mess' WHERE category = 'Hostel';
