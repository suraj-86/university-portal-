# University Portal — V2 Master Roadmap

## 1. Product Direction

University Portal V2 will evolve the existing V1.0.0 system into an **authorized digital campus management platform** for university students, teachers, parents, and administrators.

The project is **not intended to become a public university website**. Public-facing information should remain limited to the useful campus/home information approved for the portal. The main product remains authenticated university management.

### Primary users

- Admin
- Teacher
- Student
- Parent

### Clients

- Web portal
- Android mobile application

### V1 baseline

V1.0.0 is the stable baseline and already contains working authentication, role-based portals, dashboards, attendance, marks, results, fees/payments, notices, and mobile access for Student/Teacher/Parent.

V2 should extend and improve V1 rather than rebuild working functionality unnecessarily.

---

# 2. V2 Development Principles

1. Inspect the current repository before changing anything.
2. Treat the latest repository as the source of truth.
3. Reuse working V1 functionality wherever possible.
4. Backend/database rules must enforce important restrictions; UI-only restrictions are not sufficient.
5. Shared backend changes should support both web and mobile where applicable.
6. Web and mobile UI/UX must be implemented separately where needed.
7. Every feature must be tested locally and against the deployed system.
8. Mobile APK rebuilds are required only when mobile source changes require a new build.
9. Sensitive operations must be auditable.
10. Documentation is updated after meaningful feature completion.
11. Every completed feature receives a Git checkpoint.

### Definition of complete

**Inspect → Design → Implement → Local test → Deploy → Production test → Regression test → Document → Commit → Push**

---

# 3. Priority System

- **P0 — Core:** Required for the V2 target and should be implemented first.
- **P1 — Important:** Strongly recommended for the complete campus-management experience.
- **P2 — Enhancement:** Useful improvements after the core system is stable.

---

# 4. V2 Menu / Functional Scope

The professor's requested menus are the primary scope. Existing V1 menus will be upgraded where required.

1. Fee Details
2. Academic Calendar
3. Contacts / Mobile / WhatsApp
4. Queries
5. Timetable / Daily Scheduled Classes
6. Semester-wise and Subject-wise CGPA / Performance Improvement
7. Overall Percentage / CGPA
8. Attendance Percentage + Graph
9. Hostel Information
10. Announcements
11. Notices
12. Attendance
13. Appointments
14. Marks + Graphs
15. Fee Statement
16. Holidays
17. Results
18. Exam Attendance
19. One-to-one Messages
20. Report Card
21. Timetable
22. Bulk Excel/CSV Data Import

Timetable items 5 and 21 are treated as **one Timetable module** with Daily and Weekly views.

---

# 5. V2-A — Authentication & Account Security [P0]

## A1. Forgot Password

### Requirements

- Forgot-password entry point on web and mobile.
- User ID/username and registered email verification.
- Secure reset mechanism.
- Time-limited reset token or OTP.
- Password confirmation.
- Token/OTP expiration.
- Invalid/expired reset handling.
- Generic responses that do not reveal whether an account exists.
- Rate limiting and abuse protection.
- Successful reset confirmation.

## A2. Account Security

- Change password improvements.
- Password strength validation.
- Session expiration handling.
- Logout from all devices where practical.
- Account active/inactive handling.
- Security-related audit events.

---

# 6. V2-B — Fees & Finance [P0]

## B1. Fee Details

Student/Parent:

- Current semester fee.
- Fee categories.
- Total amount.
- Paid amount.
- Outstanding amount.
- Due date.
- Payment status.

Admin:

- Create/update fees.
- Assign fees.
- View outstanding balances.
- Payment tracking.

## B2. Fee Statement

Detailed statement containing:

- Semester.
- Fee type.
- Date.
- Amount.
- Paid amount.
- Balance.
- Payment/reference information.
- Status.

Optional PDF download.

## B3. Finance Enhancements

- Fee reminders.
- Payment confirmation.
- Semester-wise history.
- Better admin reporting.
- Future-ready online payment integration without forcing a payment gateway immediately.

---

# 7. V2-C — Academic Calendar & Holidays [P0]

## C1. Academic Calendar

Authenticated users can view:

- Semester dates.
- Examination dates.
- Internal assessments.
- Assignment deadlines.
- Result dates.
- University events.
- Important academic dates.

Admin can create/update calendar entries.

## C2. Holiday List

Dedicated upcoming-holiday view, while remaining linked to the academic calendar.

- Holiday name.
- Date.
- Holiday type where required.
- Academic-calendar integration.

---

# 8. V2-D — Timetable & Daily Schedule [P0]

Timetable is one module with multiple views.

## D1. Student

- Today's classes.
- Weekly timetable.
- Subject.
- Teacher.
- Room/class information.
- Time.

## D2. Teacher

- Today's teaching schedule.
- Weekly schedule.
- Assigned classes.
- Subject.
- Room.

## D3. Admin

Manage:

- Course/batch.
- Semester.
- Subject.
- Teacher.
- Day.
- Start/end time.
- Room.

## D4. Mobile

- Today's schedule on dashboard.
- Weekly timetable.
- Upcoming class indication.

---

# 9. V2-E — Attendance 2.0 [P0]

## E1. Existing Attendance Upgrade

Preserve current V1 attendance functionality while adding:

- Confirmation/warning before saving.
- Clear Present/Absent state.
- Backend enforcement of editing rules.
- Same-day/allowed-period editing rules.
- No editing after the permitted class window.

## E2. Attendance Analytics

Student/Parent:

- Overall attendance percentage.
- Semester attendance.
- Subject-wise attendance.
- Classes attended.
- Classes missed.
- Monthly/period trends.
- Attendance graph.
- Shortage warning.

Teacher/Admin:

- Class attendance summary.
- Subject attendance.
- Students below threshold.
- Attendance trends.

## E3. Attendance Audit

Sensitive changes record:

- Old value.
- New value.
- Changed by.
- Changed at.
- Reason where required.

---

# 10. V2-F — Academic Performance, Marks & Results [P0]

## F1. Marks 2.0

Teacher can configure assessments, for example:

- Assignment 1 — 10.
- Viva 1 — 5.
- Viva 2 — 5.
- Midterm — 20.
- Final — 60.

Requirements:

- Custom assessment names.
- Maximum marks.
- Assessment ordering.
- Validation.
- Confirmation before saving.
- Marks editing.
- Modification history.
- Old value → new value.
- Who changed it.
- When it was changed.
- Reason for modification.

## F2. Marks Analytics

- Subject-wise marks.
- Assessment-wise marks.
- Class average.
- Highest/lowest.
- Performance trends.
- Graphs.

## F3. Semester-wise Performance

- SGPA/CGPA by semester.
- Subject-wise performance.
- Credits.
- Grade/grade point.
- Percentage.
- Improvement/decline trend.
- Graphical representation.

## F4. Overall Academic Summary

- Current SGPA.
- Overall CGPA.
- Overall percentage.
- Credits earned.
- Relevant academic status.

## F5. Results

- Semester-wise results.
- Subject results.
- Marks.
- Grades.
- Credits.
- SGPA.
- Result status.
- Parent ward-result access.

## F6. Report Card

Generate an official-style consolidated report containing:

- Student information.
- Program/semester.
- Subject-wise marks.
- Grades.
- SGPA.
- CGPA.
- Percentage.
- Attendance where appropriate.

PDF generation/download is recommended.

---

# 11. V2-G — Exam Attendance [P0]

Separate examination attendance from regular class attendance.

Supported contexts may include:

- Internal examinations.
- Midterm examinations.
- End-semester examinations.
- Practical examinations.

Record:

- Exam.
- Subject.
- Date.
- Student.
- Present/Absent.

Student/Parent can view exam attendance according to permissions.

---

# 12. V2-H — Contacts & Communication Directory [P0]

## H1. Authorized Contacts

Student/Parent/Teacher should only see contacts permitted for their role and relationship.

Possible contact types:

- Class teacher.
- Subject teacher.
- Department faculty.
- Department office.
- Administration.
- Examination office.
- Relevant campus office.

## H2. Contact Methods

Where institutionally permitted:

- Phone/mobile.
- WhatsApp.
- Email.
- In-app message.

Personal contact information must not be exposed broadly. Backend authorization should determine who can access each contact method.

## H3. Department-wise Faculty

- Department.
- Faculty name.
- Designation.
- Subjects.
- Authorized contact options.

---

# 13. V2-I — One-to-One Messaging [P0]

Controlled academic communication.

Supported relationships should include:

- Teacher ↔ Student.
- Teacher ↔ Parent.
- Admin ↔ Student.
- Admin ↔ Parent.
- Admin ↔ Teacher.

Features:

- Conversation history.
- Read/unread status.
- Timestamps.
- Attachments where appropriate.
- Message notifications.
- Permission-controlled communication.

This is an academic messaging system, not a social/WhatsApp clone.

---

# 14. V2-J — Announcements & Notices [P0]

## J1. Announcements

Higher-level targeted information:

- University/campus announcements.
- Department announcements.
- Academic announcements.
- Examination announcements.
- Event announcements.

Targeting:

- All students.
- Department.
- Course.
- Semester.
- Batch.
- Teachers.
- Parents.
- Selected users.

## J2. Notices

Upgrade existing V1 notices with:

- Individual recipients.
- Multiple selected students.
- Parent recipients.
- Student + parent targeting.
- Batch/department targeting.
- Priority.
- Read/unread tracking.
- Better filtering.
- Notice history.
- Attachments.

---

# 15. V2-K — Queries / Student Services [P0]

Students/parents can submit queries.

Categories:

- Academic.
- Attendance.
- Marks/results.
- Fees.
- Hostel.
- Examination.
- Timetable.
- Technical.
- General.

Each query receives:

- Query ID.
- Category.
- Submitted date.
- Status.
- Assigned person/office.
- Response.
- Resolution/closure information.

Statuses:

- Submitted.
- Under Review.
- Responded.
- Resolved.
- Closed.

---

# 16. V2-L — Appointments [P1]

Example: Teacher requests a meeting with a parent.

Appointment data:

- Student.
- Parent.
- Teacher.
- Date.
- Time.
- Location/online option.
- Purpose.
- Message.

Statuses:

- Requested.
- Confirmed.
- Rescheduled.
- Completed.
- Cancelled.

Parent can accept/reject/request another time.

Notifications should integrate with the appointment system.

---

# 17. V2-M — Hostel Information [P1]

Only show hostel information when applicable.

If allotted:

- Hostel name.
- Block.
- Room number.
- Semester/session.
- Warden.
- Warden contact.
- Relevant hostel contact.
- Hostel notices where applicable.

If not allotted:

> No hostel has been allotted.

Parent can view ward hostel information.

Future extension:

- Hostel requests.
- Complaints/maintenance.
- Allotment management.

---

# 18. V2-N — Bulk Excel / CSV Import [P0]

This is a major new requirement from the professor and should be treated as a core administrative feature.

## N1. Supported Import Areas

Admin/authorized teachers may import structured data for permitted modules, such as:

- Students.
- Teachers where appropriate.
- Parents where appropriate.
- Subjects/courses where appropriate.
- Holidays.
- Timetable.
- Marks.
- Attendance.
- Fees where appropriate.
- Exam attendance.
- Other approved bulk datasets.

## N2. Import Workflow

Never directly insert uploaded data without validation.

Recommended flow:

```text
Upload Excel/CSV
       ↓
Detect file/type
       ↓
Validate columns
       ↓
Preview rows
       ↓
Validate data
       ↓
Show errors/warnings
       ↓
User confirms import
       ↓
Transaction/batch import
       ↓
Import summary
       ↓
Audit record
```

## N3. Validation

Check:

- Required columns.
- Data types.
- Dates.
- Numeric ranges.
- Student IDs.
- Subject IDs/codes.
- Duplicate records.
- Invalid relationships.
- Marks exceeding maximum.
- Invalid attendance states.
- Unknown users/classes.

## N4. Import Preview

Before committing:

- Total rows.
- Valid rows.
- Invalid rows.
- Warnings.
- New records.
- Updates.

User must explicitly confirm the import.

## N5. Error Reporting

Provide downloadable or visible error information such as:

```text
Row 14 — Invalid Student ID
Row 27 — Marks greater than maximum
Row 42 — Unknown Subject Code
```

## N6. Safety

- Role-based import permissions.
- File-size/type restrictions.
- Transactional import where possible.
- No partial silent failures.
- Import audit log.
- Clear summary after completion.

## N7. Templates

Provide downloadable templates for each supported dataset:

- Student template.
- Marks template.
- Attendance template.
- Holiday template.
- Timetable template.
- Fee template.
- Exam attendance template.

This should make bulk data entry practical for university staff.

---

# 19. V2-O — Notifications [P1]

One notification system should connect major modules.

Examples:

- New announcement.
- New notice.
- Attendance shortage.
- Result published.
- Fee due.
- Fee payment confirmation.
- Teacher message.
- Parent message.
- Appointment request.
- Appointment confirmation.
- Assignment/deadline where assignments are enabled.
- Academic calendar update.

Channels:

- In-app notifications.
- Mobile push notifications.

---

# 20. V2-P — Assignments [P1]

Teacher:

- Create assignment.
- Description/instructions.
- Attachment.
- Deadline.
- Maximum marks.
- Assign to class/batch.

Student:

- View assignments.
- Download attachments.
- Submit.
- Resubmit where allowed.
- View feedback.

Parent:

- View assignment status.

Teacher grading:

- View submissions.
- Marks.
- Feedback.

---

# 21. V2-Q — Admin Dashboard, Search & Audit [P1]

## Q1. Admin Analytics

Overview:

- Students.
- Teachers.
- Parents.
- Departments.
- Courses.
- Subjects.

Academic:

- Attendance.
- Results.
- Performance.

Finance:

- Fees.
- Payments.
- Outstanding amounts.

Operations:

- Notices.
- Queries.
- Appointments.
- Messages.
- Recent activity.

## Q2. Global Search

Authorized search across permitted entities:

- Students.
- Teachers.
- Parents.
- Subjects.
- Courses.
- Notices.
- Relevant contacts.

## Q3. System Audit Log

Sensitive operations should record:

- Actor.
- Action.
- Target.
- Old value.
- New value.
- Timestamp.
- Reason where applicable.

Especially important for:

- Marks.
- Attendance.
- Fees.
- Notices.
- Account changes.
- Bulk imports.

---

# 22. V2-R — Reports & Export [P1]

Reports may include:

- Attendance reports.
- Marks reports.
- Results.
- Fee statements.
- Student reports.
- Teacher reports.
- Appointment reports.
- Query reports.
- Bulk import summaries.
- Report cards.

Formats where appropriate:

- PDF.
- CSV.
- Excel.

---

# 23. V2-S — Mobile 2.0 [P0/P1]

Mobile must reflect the appropriate authorized functionality after backend/web features are stable.

## Student

- Dashboard.
- Timetable/daily schedule.
- Attendance + graph.
- Marks + graphs.
- Results.
- Academic performance.
- CGPA/percentage.
- Report card.
- Fees/fee statement.
- Academic calendar.
- Holidays.
- Hostel.
- Announcements.
- Notices.
- Messages.
- Appointments.
- Queries.
- Contacts.

## Teacher

- Dashboard.
- Today's schedule.
- Timetable.
- Subjects.
- Attendance.
- Exam attendance.
- Marks.
- Notices.
- Announcements.
- Messages.
- Parent contacts.
- Appointments.
- Queries.
- Calendar.

## Parent

- Ward dashboard.
- Timetable.
- Attendance + graph.
- Marks + graphs.
- Results.
- Academic performance.
- CGPA/percentage.
- Report card.
- Fees/fee statement.
- Calendar.
- Holidays.
- Hostel.
- Announcements.
- Notices.
- Messages.
- Teacher contacts.
- Appointments.
- Queries.

Mobile-specific improvements:

- Better loading/error states.
- Pull-to-refresh where useful.
- Navigation polish.
- Scroll/header improvements previously deferred from V1.
- Push notifications.

---

# 24. V2-T — Campus/Home Information [P2]

The portal may retain a limited authenticated home/campus information area, without turning the product into a public website.

Useful information can include:

- Campus overview.
- Important campus contacts.
- Department information.
- Department-wise faculty information.
- Campus news.
- Campus events.
- Important links.

This information should remain appropriate to an authorized university portal and should not dominate the management functionality.

---

# 25. V2-U — Performance, Accessibility & Production Hardening [P1]

## Performance

- API optimization.
- Database query optimization.
- Pagination.
- Appropriate caching.
- Mobile performance.
- Lazy loading.

## Accessibility

- Keyboard accessibility.
- Clear labels.
- Form feedback.
- Contrast/readability.
- Screen-reader-friendly controls where practical.
- Responsive layouts.

## Reliability

- Better error handling.
- Validation.
- Logging.
- Graceful API failures.
- Backup strategy.
- Deployment checks.

## Production

- Environment management.
- Security review.
- Monitoring.
- Database backup/recovery planning.
- Android release/distribution improvements.

---

# 26. Role-Based Menu Direction

## Student

- Dashboard
- Timetable / Daily Schedule
- Attendance
- Marks
- Results
- Academic Performance
- Overall CGPA / Percentage
- Report Card
- Fees
- Fee Statement
- Academic Calendar
- Holidays
- Hostel
- Announcements
- Notices
- Messages
- Appointments
- Queries
- Contacts

## Parent

- Dashboard
- Ward Selection
- Timetable / Daily Schedule
- Attendance
- Marks
- Results
- Academic Performance
- Overall CGPA / Percentage
- Report Card
- Fees
- Fee Statement
- Academic Calendar
- Holidays
- Hostel
- Announcements
- Notices
- Messages
- Appointments
- Queries
- Teacher/Faculty/Office Contacts

## Teacher

- Dashboard
- My Timetable
- Daily Schedule
- Subjects
- Attendance
- Exam Attendance
- Marks
- Students
- Notices
- Announcements
- Messages
- Parent Contacts
- Appointments
- Queries
- Academic Calendar
- Holidays

## Admin

- Dashboard
- Students
- Teachers
- Parents
- Departments/Courses/Subjects
- Timetable
- Academic Calendar
- Holidays
- Attendance
- Exam Attendance
- Marks
- Results
- Fees
- Payments
- Fee Statements
- Notices
- Announcements
- Messages
- Queries
- Appointments
- Hostel
- Reports
- Bulk Import
- Audit Logs
- Settings

Menus are subject to actual permission design and should not expose functionality to unauthorized roles.

---

# 27. Cross-Platform Rule

A backend feature can serve both web and mobile, but a new user-facing mobile experience must still be implemented in the mobile application.

Therefore:

```text
Backend/database
       │
       ├──────── Web
       │
       └──────── Mobile
```

For example, creating an Attendance Analytics API does not automatically create the mobile graph. The mobile UI still needs implementation.

Mobile source changes require a new EAS build when a new installed APK is needed.

---

# 28. V2 Feature Classification Method

Before implementing each feature, inspect the current repository and classify every relevant component as:

- **KEEP** — existing V1 functionality already satisfies the requirement.
- **MODIFY** — existing functionality needs changes.
- **EXTEND** — existing functionality needs new backend/database/UI capabilities.
- **NEW** — no suitable implementation exists.
- **REMOVE/REPLACE** — existing behavior conflicts with the new design.

This prevents unnecessary rewrites.

---

# 29. Feature-by-Feature Development Workflow

For every V2 feature:

### Step 1 — Inspect

Read the current repository implementation and relevant database/API/frontend/mobile code.

### Step 2 — Map

Identify KEEP / MODIFY / EXTEND / NEW / REMOVE.

### Step 3 — Design

Define:

- Database changes.
- Backend endpoints.
- Authorization rules.
- Web UI.
- Mobile UI.
- Validation.
- Error states.
- Audit requirements.

### Step 4 — Implement

Implement the smallest complete slice without breaking V1 functionality.

### Step 5 — Local test

Test API, web, mobile where applicable, and edge cases.

### Step 6 — Deploy

Deploy backend/web changes to their respective production environments.

### Step 7 — Production test

Test the actual deployed system with real role-based workflows.

### Step 8 — Regression test

Verify existing V1 functionality affected by the change.

### Step 9 — Documentation

Update the relevant documentation and V2 roadmap status.

### Step 10 — Git checkpoint

```bash
git status
git diff
git add .
git commit -m "feat: <feature>"
git push
```

Only then mark the feature complete and move to the next one.

---

# 30. Suggested V2 Implementation Order

This is a working order, not permission to skip the inspect/design step.

### Foundation

1. Authentication & security
2. Database/data-model groundwork
3. Contacts/permissions foundation

### Academic core

4. Academic calendar + holidays
5. Timetable + daily schedule
6. Attendance 2.0
7. Marks 2.0
8. Results + academic performance + CGPA/percentage
9. Exam attendance
10. Report card

### Finance

11. Fee details
12. Fee statement

### Communication

13. Announcements
14. Notices 2.0
15. Contacts
16. Messages
17. Queries
18. Appointments

### Student services

19. Hostel information
20. Assignments

### Administration

21. Bulk Excel/CSV import
22. Admin analytics
23. Search
24. Audit logs
25. Reports/export

### Mobile

26. Mobile parity and UX updates
27. Push notifications

### Final hardening

28. Performance
29. Accessibility
30. Security/production hardening
31. Final regression testing

The exact order may change after inspecting dependencies in the actual repository.

---

# 31. V2 Definition of Done

V2 is considered complete only when:

- Core requested menus are implemented.
- Existing V1 functionality remains stable.
- Role-based permissions are enforced.
- Student/Teacher/Parent workflows are tested.
- Admin workflows are tested.
- Web functionality is deployed and verified.
- Mobile functionality is implemented and verified where applicable.
- Bulk imports are validated and safe.
- Sensitive changes are auditable.
- Academic/attendance/marks calculations are verified.
- Reports work correctly.
- Notifications/messages work according to permissions.
- Documentation is updated.
- Production configuration is verified.
- Git history contains clean feature checkpoints.

---

# 32. Current Status

**V1.0.0:** Stable baseline.

**V2:** Roadmap/scope definition stage.

**Current implementation status:** No V2 feature should be marked complete until it passes the agreed workflow.

The next development task is to inspect the current V1 repository against this roadmap and create a precise **KEEP / MODIFY / EXTEND / NEW** map before implementation begins.
