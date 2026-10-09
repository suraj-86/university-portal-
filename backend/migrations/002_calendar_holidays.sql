
CREATE TABLE IF NOT EXISTS holidays (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    holiday_date DATE NOT NULL,
    name         VARCHAR(150) NOT NULL,
    description  VARCHAR(255) NULL,
    created_by   INT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_holiday (holiday_date, name),
    INDEX idx_holiday_date (holiday_date)
);

CREATE TABLE IF NOT EXISTS academic_events (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    event_type  ENUM('Semester Start','Semester End','Examination','Result','Event','Deadline','Other') NOT NULL DEFAULT 'Event',
    start_date  DATE NOT NULL,
    end_date    DATE NULL,
    description VARCHAR(500) NULL,
    created_by  INT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_event (title, start_date),
    INDEX idx_event_start (start_date)
);
