CREATE TABLE IF NOT EXISTS marks_history (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id         INT NOT NULL,
    subject_id         INT NOT NULL,
    exam_type          ENUM('Sessional 1','Sessional 2','End Sem','Practical','Assignment') NOT NULL,
    old_score          DECIMAL(5,2) NULL,
    new_score          DECIMAL(5,2) NOT NULL,
    old_max            INT NULL,
    new_max            INT NOT NULL,
    changed_by_user_id INT NOT NULL,
    reason             VARCHAR(255) NULL,
    changed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mh_assessment (subject_id, exam_type, changed_at),
    INDEX idx_mh_student (student_id),
    CONSTRAINT fk_mh_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_mh_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
);
