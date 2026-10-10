
CREATE TABLE IF NOT EXISTS timetable_slots (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subject_id  INT NOT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    room        VARCHAR(50) NOT NULL,
    created_by  INT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tt_day (day_of_week, start_time),
    INDEX idx_tt_subject (subject_id),
    CONSTRAINT fk_tt_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
);
