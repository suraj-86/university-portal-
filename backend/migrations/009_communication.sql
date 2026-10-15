
ALTER TABLE notices
    MODIFY COLUMN target_role ENUM('all','teacher','student','parent','targeted') DEFAULT 'all';

CREATE TABLE IF NOT EXISTS notice_recipients (
    notice_id INT NOT NULL,
    user_id   INT NOT NULL,
    PRIMARY KEY (notice_id, user_id),
    KEY idx_nr_user (user_id),
    CONSTRAINT fk_nr_notice FOREIGN KEY (notice_id) REFERENCES notices (id) ON DELETE CASCADE,
    CONSTRAINT fk_nr_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS notice_reads (
    notice_id INT NOT NULL,
    user_id   INT NOT NULL,
    read_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notice_id, user_id),
    KEY idx_nrd_user (user_id),
    CONSTRAINT fk_nrd_notice FOREIGN KEY (notice_id) REFERENCES notices (id) ON DELETE CASCADE,
    CONSTRAINT fk_nrd_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS announcements (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    content      TEXT NOT NULL,
    category     ENUM('University','Department','Academic','Event','Other') NOT NULL DEFAULT 'University',
    audience     ENUM('all','teacher','student','parent') NOT NULL DEFAULT 'all',
    course_id    INT NULL,
    semester     INT NULL,
    priority     ENUM('Normal','High') NOT NULL DEFAULT 'Normal',
    pinned       TINYINT(1) NOT NULL DEFAULT 0,
    published_by INT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ann_created (created_at),
    CONSTRAINT fk_ann_course FOREIGN KEY (course_id)    REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_ann_user   FOREIGN KEY (published_by) REFERENCES users (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS announcement_reads (
    announcement_id INT NOT NULL,
    user_id         INT NOT NULL,
    read_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (announcement_id, user_id),
    KEY idx_ar_user (user_id),
    CONSTRAINT fk_ar_ann  FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_user FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS message_threads (
    id                  INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    teacher_user_id     INT NOT NULL,
    participant_user_id INT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_thread_pair (teacher_user_id, participant_user_id),
    KEY idx_thread_participant (participant_user_id),
    CONSTRAINT fk_th_teacher     FOREIGN KEY (teacher_user_id)     REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_th_participant FOREIGN KEY (participant_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS messages (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    thread_id      INT NOT NULL,
    sender_user_id INT NOT NULL,
    body           TEXT NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at        TIMESTAMP NULL DEFAULT NULL,
    KEY idx_msg_thread (thread_id, id),
    KEY idx_msg_unread (read_at),
    CONSTRAINT fk_msg_thread FOREIGN KEY (thread_id)      REFERENCES message_threads (id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_user_id) REFERENCES users (id)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
