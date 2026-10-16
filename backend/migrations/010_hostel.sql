
CREATE TABLE IF NOT EXISTS hostels (
    id             INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    warden_name    VARCHAR(100) NULL,
    warden_contact VARCHAR(30)  NULL,
    hostel_contact VARCHAR(30)  NULL,
    created_by     INT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hostel_allocations (
    id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id       INT NOT NULL,
    hostel_id        INT NOT NULL,
    block            VARCHAR(50) NULL,
    room_number      VARCHAR(20) NOT NULL,
    academic_session VARCHAR(9)  NOT NULL,
    semester         INT NULL,
    status           ENUM('Allotted','Vacated') NOT NULL DEFAULT 'Allotted',
    allotted_on      DATE NOT NULL,
    vacated_on       DATE NULL,
    remarks          VARCHAR(255) NULL,
    created_by       INT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ha_student (student_id, status),
    KEY idx_ha_hostel (hostel_id, status),
    CONSTRAINT fk_ha_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_ha_hostel  FOREIGN KEY (hostel_id)  REFERENCES hostels (id)          ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
