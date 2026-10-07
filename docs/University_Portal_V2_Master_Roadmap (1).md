# University Portal — V2 Master Roadmap

**Project:** University Portal
**Release baseline:** V1.0.0
**V2 status:** Planning / Roadmap Definition
**Document status:** V2 Source of Truth — Draft for Approval

---

## 1. Purpose

This document defines the complete Version 2 roadmap for the University Portal.

Version 1.0.0 is treated as the stable baseline. V2 extends the existing web portal, backend API, MySQL database, and Android application without intentionally destabilizing the V1 feature set.

The V2 goal is to move the project from a functional university portal to a more complete academic-management platform with stronger security, academic workflows, communication, reporting, mobile capabilities, and production quality.

---

## 2. V1 Baseline

V1 currently provides:

- Web roles: Admin, Teacher, Student, Parent
- Mobile roles: Student, Teacher, Parent
- Admin remains web-only in V1
- JWT authentication and bcrypt password verification
- Role-based protected routes
- Student, teacher, parent, and admin dashboards
- Subjects/courses
- Attendance
- Marks/results
- Fees and payments
- Notices and notice attachments
- Parent-to-student relationship handling
- Teacher academic workflows
- Production web deployment
- Production backend deployment
- MySQL production database
- Android application built with Expo/EAS

The stable V1 Git tag is `v1.0.0`.

---

# 3. V2 Principles

## 3.1 Preserve V1 stability

V1 remains the rollback checkpoint. V2 changes must not casually rewrite working V1 workflows.

## 3.2 Backend is the source of truth

Important rules must be enforced on the backend, not only through web/mobile UI.

Examples:

- Attendance editing restrictions
- Marks modification rules
- Authorization
- Recipient permissions
- Password reset validation
- Audit records

## 3.3 Shared backend, separate clients

Web and mobile should use the same backend capabilities where possible. However, web and mobile UI implementation remains separate.

A backend feature does not automatically create a mobile UI feature.

## 3.4 Incremental implementation

Each V2 feature should be implemented in small, testable units.

Preferred workflow:

> Inspect actual source → understand current implementation → design → backend → API testing → web → web testing → mobile → mobile testing → documentation → commit → push

## 3.5 Documentation remains the source of truth

After a meaningful feature is completed, update the relevant documentation before moving to the next major feature.

---

# 4. V2 Priority System

### P0 — Core / High Priority
Required for the main V2 objective or important for security/data integrity.

### P1 — Important
Strongly recommended for V2 but can follow the P0 foundation.

### P2 — Enhancement
Useful improvements that should be implemented after the core platform is stable.

---

# 5. V2 Major Blocks

| Block | Focus | Priority |
|---|---|---|
| V2-A | Authentication & Security | P0 |
| V2-B | Academic System | P0 |
| V2-C | Attendance & Marks 2.0 | P0 |
| V2-D | Communication & Notifications | P0 |
| V2-E | Assignment Management | P1 |
| V2-F | Fees, Reports & Administration | P1 |
| V2-G | Digital Identity & Mobile 2.0 | P1 |
| V2-H | Performance, Accessibility & Production | P1/P2 |

---

# 6. V2-A — Authentication & Security

## V2-A1 — Forgot Password

**Priority:** P0

### Objective
Provide a secure password recovery mechanism for users who cannot remember their password.

### Requirements

- Forgot Password entry point on login page
- User ID/username input
- Registered email verification
- Secure reset token or OTP
- Expiration for reset token/OTP
- New password form
- Password confirmation
- Invalid/expired token handling
- Success confirmation
- Rate limiting for repeated recovery attempts
- Do not reveal whether an account exists through unsafe error messages

### Acceptance criteria

- A legitimate user can recover access.
- An attacker cannot reset another user's password using only public identity information.
- Expired recovery credentials cannot be reused.
- Reset credentials cannot be reused after successful completion.

### Client coverage

- Web login
- Mobile login

---

## V2-A2 — Password & Account Security

**Priority:** P0

### Features

- Change password from Settings
- Password strength validation
- Session/token expiration handling
- Logout from all devices where technically supported
- Better invalid-session handling
- Admin account disable/suspend capability
- Clear security-related error states

### Acceptance criteria

Security changes are enforced by the backend and reflected consistently on web and mobile.

---

## V2-A3 — Security Hardening

**Priority:** P0

### Scope

- Review API authorization
- Review role permissions
- Validate request bodies and parameters
- Review file-upload validation
- Rate-limit sensitive endpoints
- Protect sensitive information in logs
- Review CORS and production configuration
- Review JWT handling
- Review database queries and injection risks
- Review error responses for information leakage

### Deliverable

A V2 security checklist and final audit record.

---

# 7. V2-B — Academic System

## V2-B1 — Advanced Academic Performance

**Priority:** P0

### Student/Parent

- Semester-wise performance
- GPA/CGPA display
- Subject-wise performance
- Internal/external marks where applicable
- Attendance percentage
- Attendance shortage warning
- Performance trends

### Teacher

- Student performance overview
- Subject statistics
- Class average
- Assessment statistics

### Admin

- Academic overview
- Semester statistics
- Course/subject performance summaries

### Acceptance criteria

Academic figures must be calculated from authoritative database values and must not rely on duplicated client-side calculations as the source of truth.

---

## V2-B2 — Timetable

**Priority:** P1

### Student

- Today's classes
- Weekly timetable
- Subject
- Teacher
- Room/class information

### Teacher

- Today's classes
- Weekly teaching schedule
- Assigned room/class

### Design requirement

Timetable data should be reusable by dashboards, notifications, and mobile screens rather than duplicated separately for each client.

---

## V2-B3 — Academic Calendar

**Priority:** P1

### Events

- Semester start/end
- Exams
- Holidays
- Assignment deadlines
- Result dates
- University events

### Admin capability

Admin should manage calendar entries.

### User capability

Students and teachers can view relevant calendar events.

---

# 8. V2-C — Attendance 2.0

## V2-C1 — Attendance Confirmation

**Priority:** P0

Before attendance is saved, show a confirmation/warning step.

Example:

> You are about to save attendance for this class. Continue?

The confirmation should summarize the relevant class/date where practical.

---

## V2-C2 — Attendance Editing Rules

**Priority:** P0

### Required rule

Attendance should only be editable within the permitted period for that class/day.

Once the class has finished and the allowed editing period has expired, the teacher cannot modify the attendance through the normal workflow.

### Important

This rule must be enforced on the backend.

The UI should also disable unavailable editing actions for clarity.

---

## V2-C3 — Attendance Audit History

**Priority:** P0

For allowed modifications, record:

- Student
- Attendance record
- Previous status
- New status
- Changed by
- Changed at
- Reason for change where required

### Example

`Present → Absent`

Teacher: Teacher A

Time: 12 Oct, 10:42 AM

Reason: Incorrect marking

---

## V2-C4 — Attendance Analytics

**Priority:** P1

- Daily attendance
- Weekly/monthly attendance
- Subject-wise percentage
- Student shortage list
- Attendance trends
- Students below required threshold

---

# 9. V2-C — Marks & Assessment 2.0

## V2-C5 — Configurable Assessments

**Priority:** P0

Teachers should no longer be limited to fixed assessment names.

Example:

- Assignment 1 — 10
- Viva 1 — 5
- Viva 2 — 5
- Midterm — 20
- Final — 60

### Teacher controls

- Assessment name
- Maximum marks
- Assessment type where required
- Ordering/sequence
- Active/inactive status where useful

---

## V2-C6 — Marks Confirmation

**Priority:** P0

Before saving marks, show a confirmation step.

The teacher should be able to verify the assessment and entered values before committing them.

---

## V2-C7 — Marks Validation

**Priority:** P0

- Prevent marks greater than maximum marks
- Validate numeric values
- Handle missing values safely
- Validate assessment ownership/authorization
- Prevent unauthorized updates

---

## V2-C8 — Marks Modification Audit

**Priority:** P0

Teachers can edit marks later, but every meaningful modification must create an audit record.

Record:

- Student
- Assessment
- Old value
- New value
- Changed by
- Changed at
- Reason for modification

The system must not silently overwrite the previous value.

### Goal

Protect both the institution and teacher by creating an accountable history of changes.

---

## V2-C9 — Marks Analytics

**Priority:** P1

- Class average
- Highest/lowest marks
- Pass/fail statistics
- Assessment statistics
- Student performance
- Assessment-wise performance

---

# 10. V2-D — Communication & Notifications

## V2-D1 — Advanced Notices

**Priority:** P0

### Recipient targeting

Teacher/Admin can send notices to:

- One student
- Multiple selected students
- Entire class/batch
- Selected group
- Parent of one student
- Parents of selected students
- Student + parent together

### Notice categories

- General
- Academic
- Attendance
- Examination
- Fee
- Urgent
- Personal

### Tracking

Future-ready support for:

- Sent
- Delivered
- Read

---

## V2-D2 — Internal Messaging

**Priority:** P1

### Supported relationships

- Teacher ↔ Student
- Teacher ↔ Parent
- Admin ↔ Student
- Admin ↔ Parent
- Admin ↔ Teacher

### Features

- 1-to-1 conversations
- Read/unread state
- Timestamps
- Conversation history
- Attachments where appropriate
- Basic reporting/moderation controls

### Scope control

This is an academic communication system, not a general-purpose social chat application.

---

## V2-D3 — Teacher-to-Parent Communication

**Priority:** P0/P1

Teachers should have a controlled way to contact parents of their assigned students.

### Requirements

- Select student
- Resolve linked parent(s)
- View permitted parent information
- Start conversation
- Send academic/attendance/performance messages
- Maintain communication history

Personal phone/email information should not be unnecessarily exposed when in-portal messaging is sufficient.

---

## V2-D4 — Notification System

**Priority:** P1

### Notification events

- New notice
- Personal notice
- Assignment created
- Assignment deadline approaching
- Result published
- Attendance shortage
- Fee due
- Payment confirmation
- New message
- Teacher/parent communication

### Channels

- Web in-app notification center
- Mobile push notification

---

# 11. V2-E — Assignment Management

## V2-E1 — Teacher Assignment Creation

**Priority:** P1

Teacher can create:

- Title
- Description
- Instructions
- Attachment
- Maximum marks
- Deadline
- Target class/batch

Teacher can edit/delete assignments subject to ownership/permissions.

---

## V2-E2 — Student Submission

**Priority:** P1

Students can:

- View assignments
- View deadlines
- Download attachments
- Upload submissions
- Resubmit when permitted
- View submission status

---

## V2-E3 — Assignment Grading

**Priority:** P1

Teacher can:

- View submissions
- Give marks
- Add feedback
- Track submitted/missing/late work

---

## V2-E4 — Parent Assignment Visibility

**Priority:** P2

Parents can see:

- Assignment status
- Pending work
- Submission status
- Important deadlines

---

# 12. V2-F — Fees, Reports & Administration

## V2-F1 — Enhanced Fees & Payments

**Priority:** P1

### Student/Parent

- Fee breakdown
- Semester-wise fees
- Outstanding balance
- Payment history
- Due dates
- Receipts

### Notifications

- Upcoming fee
- Overdue fee
- Payment confirmation

### Admin

- Payment management
- Outstanding fees
- Student fee history
- Payment reports

### Architecture

Keep the design ready for future online payment integration without requiring a payment gateway immediately.

---

## V2-F2 — System-wide Audit Log

**Priority:** P0/P1

Track important actions such as:

- Student created/updated
- Teacher updated
- Attendance changed
- Marks changed
- Notice deleted
- Fee updated
- Account disabled
- Security events

Record:

- Actor
- Action
- Target
- Old value where applicable
- New value where applicable
- Timestamp

Admin should have filtering/search capability.

---

## V2-F3 — Global Search

**Priority:** P1

Search entities:

- Students
- Teachers
- Parents
- Courses
- Subjects
- Notices

Possible filters:

- Role
- Batch
- Semester
- Department
- Course

Start with Admin, then extend to other roles if useful.

---

## V2-F4 — Admin Analytics Dashboard

**Priority:** P1

### Overview

- Students
- Teachers
- Parents
- Courses
- Subjects

### Academic

- Attendance statistics
- Performance statistics
- Result statistics

### Finance

- Fees collected
- Outstanding fees
- Payment statistics

### Activity

- Recent notices
- Recent users
- Recent system activity

---

## V2-F5 — Reports & Export

**Priority:** P1

Export/report areas:

- Attendance → CSV/Excel/PDF
- Marks → CSV/Excel/PDF
- Student lists
- Fee reports
- Payment reports
- Notice reports
- Academic reports

Reports should use authoritative backend data and consistent formatting.

---

# 13. V2-G — Digital Identity & Mobile 2.0

## V2-G1 — Digital Student ID

**Priority:** P1

Mobile digital ID should contain:

- Student photo
- Name
- Student ID
- Programme
- Semester
- Validity/status
- QR code

The QR code should be designed for future verification workflows.

---

## V2-G2 — Mobile Student Experience

**Priority:** P1

Student mobile should progressively provide:

- Today's timetable
- Attendance warnings
- Results
- Notices
- Assignments
- Fees
- Digital ID
- Notifications

---

## V2-G3 — Mobile Teacher Experience

**Priority:** P1

Teacher mobile should provide:

- Today's classes
- Quick attendance
- Quick marks
- Student information
- Notices
- Parent communication

---

## V2-G4 — Mobile Parent Experience

**Priority:** P1

Parent mobile should provide:

- Ward overview
- Attendance
- Results
- Fees
- Notices
- Assignments where applicable
- Teacher communication

---

## V2-G5 — Mobile UI/UX Refinement

**Priority:** P2

Previously postponed V2 improvements should be considered here.

### Header behavior

- Hide top header while scrolling down
- Show header again while scrolling up

### General UX

- Better transitions
- Loading states
- Empty states
- Pull-to-refresh
- Better error states
- Consistent navigation
- Consistent spacing and components

---

# 14. V2-H — Performance, Accessibility & Production

## V2-H1 — Performance

**Priority:** P1

- Optimize API calls
- Optimize database queries
- Add pagination where needed
- Avoid unnecessary frontend requests
- Lazy-load large screens/data
- Improve mobile performance
- Add caching only where justified

---

## V2-H2 — Accessibility

**Priority:** P2

- Keyboard navigation
- Accessible form labels
- Better contrast
- Screen-reader-friendly controls
- Clear validation messages
- Focus management
- Responsive layouts

---

## V2-H3 — Reliability & Error Handling

**Priority:** P1

- Consistent API error format
- Better client error handling
- Graceful network failures
- Retry handling where appropriate
- Logging
- Production-safe error messages
- Monitoring readiness

---

## V2-H4 — Production & Release Improvements

**Priority:** P1/P2

- Environment configuration cleanup
- Database backup strategy
- Deployment checklist
- Production monitoring
- Release checklist
- Android release/distribution improvements
- Play Store readiness as a future target

---

# 15. Cross-Platform Rule

Every V2 feature must be classified during implementation as one of:

1. Backend only
2. Backend + Web
3. Backend + Mobile
4. Backend + Web + Mobile
5. Admin web only
6. Shared infrastructure

A backend implementation does not automatically mean the feature is available in the mobile application.

If mobile source code changes, a new Android build is required before the mobile feature can be delivered in an APK.

---

# 16. Data Integrity Rules

V2 must protect academic and financial data carefully.

### Attendance

Never silently overwrite historical modifications.

### Marks

Never silently overwrite previous marks.

### Fees

Maintain payment/fee history rather than destructive replacement wherever practical.

### Notices

Maintain appropriate sender/recipient information and timestamps.

### Messaging

Enforce recipient authorization on the backend.

### Audit

Sensitive administrative/academic operations should produce traceable records.

---

# 17. V2 Testing Strategy

Every major feature should be tested at multiple levels.

## Backend

- Authentication tests
- Authorization tests
- Validation tests
- Business-rule tests
- Error cases
- Database behavior

## Web

- Role access
- UI behavior
- Form validation
- Success/error states
- Responsive behavior

## Mobile

- Android navigation
- API behavior
- Authentication
- Loading/error states
- Role-specific workflows
- Physical-device verification

## Regression

Existing V1 workflows must continue working after each major V2 change.

---

# 18. V2 Documentation Strategy

The following should remain updated:

- README
- Architecture documentation
- API specification
- Database/schema documentation
- Authentication/security documentation
- Feature specifications
- Release notes/changelog
- V2 progress/status document

Documentation should be updated after meaningful completed work, not after every tiny code edit.

---

# 19. Git & Release Strategy

V1 stable checkpoint:

```text
v1.0.0
```

V2 development should proceed from the V1 baseline.

Recommended release progression:

```text
v1.0.0
   ↓
V2 development
   ↓
v2.0.0-alpha / internal milestone
   ↓
v2.0.0-beta / broader testing
   ↓
v2.0.0
```

Exact tagging can be decided when V2 implementation reaches release readiness.

For each meaningful development session:

1. Inspect current source
2. Make focused changes
3. Test
4. Review regression impact
5. Update documentation if needed
6. Commit
7. Push

---

# 20. Suggested Dependency Order

This is not yet an implementation phase schedule. It is a dependency map for deciding the order later.

```text
Authentication & Security
        │
        ├── Forgot Password
        ├── Account Security
        └── Security Hardening
                │
                ▼
Academic Data Improvements
        │
        ├── Performance
        ├── Timetable
        └── Calendar
                │
                ▼
Attendance + Marks 2.0
        │
        ├── Confirmation
        ├── Restrictions
        ├── Configurable Assessments
        └── Audit History
                │
                ▼
Communication Infrastructure
        │
        ├── Notices
        ├── Messaging
        └── Notifications
                │
                ├───────────────┐
                ▼               ▼
          Assignments       Fees/Reports
                │               │
                └───────┬───────┘
                        ▼
                Mobile 2.0
                        │
                        ▼
          Performance / Accessibility
                        │
                        ▼
                 V2 Release
```

The dependency map does not prevent us from adjusting implementation order after inspecting the actual codebase.

---

# 21. V2 Definition of Done

V2 should not be considered complete merely because the new screens exist.

A feature is considered complete when:

- Backend rules are implemented
- Database changes are stable
- API behavior is tested
- Web UI is implemented where applicable
- Mobile UI is implemented where applicable
- Authorization is verified
- Error cases are handled
- Existing V1 behavior still works
- Documentation is updated
- Changes are committed and pushed

For sensitive academic operations such as marks and attendance, auditability is part of the feature definition, not an optional enhancement.

---

# 22. Final V2 Feature Inventory

The agreed V2 feature inventory contains the following 17 areas:

1. Authentication & security
2. Academic performance improvements
3. Timetable & academic calendar
4. Advanced notifications
5. Internal communication/messaging
6. Assignment management
7. Enhanced fees/payment management
8. Attendance improvements and audit
9. Marks/assessment improvements and audit
10. System-wide audit/activity logs
11. Global search
12. Reports and export
13. Digital student ID
14. Admin analytics
15. Mobile-specific capabilities
16. Web/mobile UX and accessibility improvements
17. Performance, reliability, and production hardening

---

# 23. V2 Status

**Current status:** Roadmap defined; implementation not started from this document.

The next step is to review this master roadmap once more, lock the scope, and then implement the agreed features one at a time using the existing University Portal source as the source of truth.

---

## V2 Guiding Principle

> **Build V2 as a controlled evolution of the stable V1 system — not as a rewrite.**
