
CREATE TABLE IF NOT EXISTS university_contacts (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category    ENUM('Administration','Academic','Admission','Department','Hostel','Technical','Other') NOT NULL DEFAULT 'Administration',
    name        VARCHAR(120) NOT NULL,
    designation VARCHAR(120) NULL,
    phone       VARCHAR(30)  NULL,
    whatsapp    VARCHAR(30)  NULL,
    email       VARCHAR(150) NULL,
    location    VARCHAR(200) NULL,
    office_hours VARCHAR(120) NULL,
    audience    ENUM('all','student','parent','teacher') NOT NULL DEFAULT 'all',
    sort_order  INT NOT NULL DEFAULT 0,
    is_visible  TINYINT(1) NOT NULL DEFAULT 1,
    created_by  INT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_uc_visible (is_visible, audience, category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
