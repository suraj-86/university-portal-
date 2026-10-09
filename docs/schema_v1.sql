CREATE TABLE `attendance` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `daily_class_id` int NOT NULL,
  `status` enum('Present','Absent','Late','Excused') COLLATE utf8mb4_general_ci NOT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `marked_by` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `courses` (
  `id` int NOT NULL,
  `course_code` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `course_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `duration_years` int NOT NULL,
  `total_semesters` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `daily_classes` (
  `id` int NOT NULL,
  `subject_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `class_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room_number` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('Scheduled','Cancelled','Completed') COLLATE utf8mb4_general_ci DEFAULT 'Scheduled',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `fees` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `semester` int NOT NULL,
  `fee_type` enum('Tuition','Hostel','Library Fine','Exam') COLLATE utf8mb4_general_ci DEFAULT 'Tuition',
  `total_fee` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) DEFAULT '0.00',
  `due_date` date NOT NULL,
  `status` enum('Pending','Partial','Paid') COLLATE utf8mb4_general_ci DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `marks` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `exam_type` enum('Sessional 1','Sessional 2','End Sem','Practical','Assignment') COLLATE utf8mb4_general_ci NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `max_score` int DEFAULT '100',
  `remarks` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `notices` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `content` text COLLATE utf8mb4_general_ci NOT NULL,
  `target_role` enum('all','teacher','student') COLLATE utf8mb4_general_ci DEFAULT 'all',
  `subject_id` int DEFAULT NULL,
  `priority` enum('Low','Normal','High') COLLATE utf8mb4_general_ci DEFAULT 'Normal',
  `attachment_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `posted_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `file_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `parents` (
  `parent_id` int NOT NULL,
  `user_id` int NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `parent_student_map` (
  `id` int NOT NULL,
  `parent_id` int NOT NULL,
  `student_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payments` (
  `id` int NOT NULL,
  `fee_id` int NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method` enum('Online','Cash','Bank Transfer') COLLATE utf8mb4_general_ci NOT NULL,
  `transaction_reference` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_by` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `students` (
  `student_id` int NOT NULL,
  `user_id` int NOT NULL,
  `course_id` int NOT NULL,
  `enrollment_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `roll_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `blood_group` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profile_picture_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `city` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pin_code` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `guardian_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `guardian_phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `guardian_relation` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `semester` int NOT NULL,
  `admission_date` date NOT NULL,
  `status` enum('Active','Graduated','Suspended') COLLATE utf8mb4_general_ci DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `subjects` (
  `id` int NOT NULL,
  `course_id` int NOT NULL,
  `semester` int NOT NULL,
  `subject_code` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `subject_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `subject_type` enum('Core','Elective','Practical') COLLATE utf8mb4_general_ci DEFAULT 'Core',
  `credits` int NOT NULL DEFAULT '3'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `teachers` (
  `teacher_id` int NOT NULL,
  `user_id` int NOT NULL,
  `employee_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `profile_picture_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `qualification` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `designation` enum('Professor','Assistant Professor','Guest Lecturer') COLLATE utf8mb4_general_ci NOT NULL,
  `joining_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `teacher_assignments` (
  `id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `academic_year` varchar(9) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('admin','teacher','student','parent') COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_session_attendance` (`student_id`,`daily_class_id`),
  ADD KEY `daily_class_id` (`daily_class_id`),
  ADD KEY `attendance_ibfk_3` (`marked_by`);

ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_code` (`course_code`);

ALTER TABLE `daily_classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `teacher_id` (`teacher_id`);

ALTER TABLE `fees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_student_fee` (`student_id`,`semester`,`fee_type`);

ALTER TABLE `marks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_exam_marks` (`student_id`,`subject_id`,`exam_type`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `marks_ibfk_3` (`uploaded_by`);

ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `posted_by` (`posted_by`),
  ADD KEY `subject_id` (`subject_id`);

ALTER TABLE `parents`
  ADD PRIMARY KEY (`parent_id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `parent_student_map`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_parent_student` (`parent_id`,`student_id`),
  ADD KEY `student_id` (`student_id`);

ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_reference` (`transaction_reference`),
  ADD KEY `fee_id` (`fee_id`),
  ADD KEY `payments_ibfk_2` (`processed_by`);

ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `enrollment_number` (`enrollment_number`),
  ADD KEY `students_ibfk_2` (`course_id`),
  ADD KEY `fk_user_student` (`user_id`),
  ADD KEY `email` (`email`) USING BTREE;

ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subject_code` (`subject_code`),
  ADD KEY `course_id` (`course_id`);

ALTER TABLE `teachers`
  ADD PRIMARY KEY (`teacher_id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `teacher_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_assignment` (`teacher_id`,`subject_id`,`academic_year`),
  ADD KEY `subject_id` (`subject_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

ALTER TABLE `attendance`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=453;

ALTER TABLE `courses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

ALTER TABLE `daily_classes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

ALTER TABLE `fees`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

ALTER TABLE `marks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

ALTER TABLE `notices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

ALTER TABLE `parents`
  MODIFY `parent_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

ALTER TABLE `parent_student_map`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

ALTER TABLE `payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

ALTER TABLE `students`
  MODIFY `student_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

ALTER TABLE `subjects`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

ALTER TABLE `teachers`
  MODIFY `teacher_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

ALTER TABLE `teacher_assignments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=240;

ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`daily_class_id`) REFERENCES `daily_classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`marked_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE;

ALTER TABLE `daily_classes`
  ADD CONSTRAINT `daily_classes_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `daily_classes_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE;

ALTER TABLE `marks`
  ADD CONSTRAINT `marks_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marks_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `marks_ibfk_3` FOREIGN KEY (`uploaded_by`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE;

ALTER TABLE `notices`
  ADD CONSTRAINT `notices_ibfk_1` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notices_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

ALTER TABLE `parents`
  ADD CONSTRAINT `parents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `parent_student_map`
  ADD CONSTRAINT `ps_map_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`parent_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ps_map_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`fee_id`) REFERENCES `fees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `students`
  ADD CONSTRAINT `fk_user_student` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `students_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `teacher_assignments`
  ADD CONSTRAINT `teacher_assignments_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_assignments_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;
