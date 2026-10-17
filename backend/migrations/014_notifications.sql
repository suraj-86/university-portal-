CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    type       VARCHAR(30) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(500) NULL,
    section    VARCHAR(30) NULL,
    ref_id     INT NULL,
    read_at    TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notif_user_read (user_id, read_at, id),
    KEY idx_notif_user_type_ref (user_id, type, ref_id),
    KEY idx_notif_created (created_at),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
