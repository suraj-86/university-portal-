
ALTER TABLE marks_history
    ADD COLUMN assessment_name VARCHAR(60) NOT NULL DEFAULT '' AFTER exam_type,
    MODIFY COLUMN exam_type ENUM('Sessional 1','Sessional 2','End Sem','Practical','Assignment','Other') NOT NULL;
