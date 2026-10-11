
CREATE TABLE IF NOT EXISTS assessment_settings (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subject_id   INT NOT NULL,
    exam_type    ENUM('Sessional 1','Sessional 2','End Sem','Practical','Assignment') NOT NULL,
    display_name VARCHAR(60) NULL,
    max_score    INT NULL,
    updated_by   INT NULL,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_assessment_settings (subject_id, exam_type),
    CONSTRAINT fk_as_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
);
