
ALTER TABLE marks
    ADD COLUMN assessment_name VARCHAR(60) NOT NULL DEFAULT '' AFTER exam_type,
    MODIFY COLUMN exam_type ENUM('Sessional 1','Sessional 2','End Sem','Practical','Assignment','Other') NOT NULL,
    ADD UNIQUE KEY uq_marks_assessment (student_id, subject_id, exam_type, assessment_name),
    DROP INDEX unique_exam_marks;
