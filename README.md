# University Portal - Project Documentation

## 📌 Project Overview

The **University Portal** is a comprehensive, full-stack College
Management System designed to streamline academic administration,
student tracking, faculty operations, and parent engagement. It features
role-based dashboards, secure authentication, notices and announcements,
attendance tracking, fee management, and results processing.

## 🚀 Key Features & Modules

### 1. **Authentication & Authorization**

- Secure JWT-based authentication supporting multiple roles: **Admin**,
  **Teacher**, **Student**, and **Parent**.
- Protected routes ensuring role-restricted page access and data
  security.
- Automated admin seeding (`seedAdmin.js`) for initial setup.
- Dark Mode Toggle.

### 2. **Admin Dashboard**

- Full oversight of institutional operations.
- Management interfaces for:
  - **Courses & Subjects** (`AdminCourses.jsx`, `AdminSubjects.jsx`)
  - **Users** (Students, Teachers, Parents) (`AdminStudents.jsx`,
    `AdminTeachers.jsx`, `AdminParents.jsx`)
  - **Financials** (Fees, Payments, Transactions) (`AdminFees.jsx`,
    `AdminPayments.jsx`)
  - **Announcements & Notices** (`AdminNotices.jsx`)
  - **System Settings** (`AdminSettings.jsx`)

### 3. **Teacher Portal**

- **Teacher Dashboard**: Centralized hub for educators.
- **Attendance Tracking**: Mark, review, and manage student attendance
  (`TeacherAttendance.jsx`).
- **Marks & Grading**: Upload and update student examination results
  (`TeacherMarks.jsx`).
- **Academics & Notices**: Manage subject allocations and view
  institutional notices (`TeacherSubjects.jsx`, `TeacherNotices.jsx`).
- **Profile & Settings**: Manage personal educator credentials
  (`TeacherSettings.jsx`).

### 4. **Student Portal**

- **Student Dashboard**: Overview of current academic standing.
- **Academic Records**: Check subject lists, semester results, and
  attendance reports (`StudentSubjects.jsx`, `StudentResults.jsx`,
  `StudentAttendance.jsx`).
- **Attendance Dashboard**: View attendance summaries, subject-wise
  attendance, and attendance history.
- **Fee Management**: View fee structures and payment histories
  (`StudentFees.jsx`).
- **Communication & Profile**: Access official notices and manage
  personal profiles (`StudentNotices.jsx`, `StudentProfile.jsx`,
  `StudentSettings.jsx`).

### 5. **Parent Portal**

- **Parent Dashboard**: Monitor child's academic performance and
  activities.
- **Ward Profile**: View the selected ward's academic/profile
  information (`ParentProfile.jsx`).
- **Attendance Dashboard**: Monitor the ward's overall attendance,
  subject-wise attendance, and detailed attendance history
  (`ParentAttendance.jsx`).
- **Academic Results**: View the ward's examination results
  (`ParentResults.jsx`).
- **Fee Management**: View fee status and payment history
  (`ParentFees.jsx`).
- **Campus Notices**: View relevant university notices
  (`ParentNotices.jsx`).
- **Settings**: Manage parent portal settings (`ParentSettings.jsx`).

## 🛠️ Technology Stack

### **Backend**

- **Runtime**: Node.js & Express.js (`server.js`)
- **Database**: MySQL hosted on **Aiven**
- **Authentication**: JSON Web Tokens (JWT)
- **File Uploads**: Multer support for handling document attachments.

### **Frontend**

- **Framework**: React.js with Vite (`vite.config.js`)
- **Routing**: React Router (`ProtectedRoute.jsx`,
  `DashboardLayout.jsx`)
- **State Management**: Context API (`AuthContext.jsx`, `useAuth.jsx`)
- **Styling & UI Components**: Custom modular UI components (Cards,
  Modals, Tables, Navigation bars, and Sidebars)

## 📁 Project Structure

``` text
university-portal/
├── backend/
│   ├── uploads/            # Document and file attachments
│   ├── seedAdmin.js        # Initial admin seeding script
│   ├── server.js           # Express application entry point
│   └── package.json        # Backend dependencies
└── frontend/
    ├── public/             # Public assets, icons, and favicons
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── context/        # React Context providers
    │   ├── hooks/          # Custom hooks
    │   ├── layouts/        # Dashboard layout wrappers
    │   ├── pages/          # Role-specific views (Admin, Teacher, Student, Parent, Auth)
    │   ├── routes/         # Route protection configuration
    │   ├── services/       # API integration services
    │   ├── App.jsx         # Root application component
    │   └── main.jsx        # Frontend entry point
    └── package.json        # Frontend dependencies
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

``` bash
git clone https://github.com/suraj-86/university-portal-.git
cd university-portal-
```

### 2. Database Configuration

The application uses a **MySQL database hosted on Aiven**.

Configure the database connection and credentials in the backend
environment configuration. Do not commit production database credentials
or environment secrets to Git.

### 3. Backend Setup

``` bash
cd backend
npm install

# Seed the initial admin account
node seedAdmin.js

# Start the backend server
npm start
```

### 4. Frontend Setup

``` bash
cd ../frontend
npm install

# Run the development server
npm run dev
```

### 5. Production Build

``` bash
npm run build
```

## ☁️ Deployment

The application utilizes a distributed cloud architecture:

- **Live Application:** [View on
  Vercel](https://university-portal-flax-tau.vercel.app/)
- **Frontend:** Hosted on **Vercel**.
- **Backend (API):** Hosted on **Render**.
- **Database:** Hosted on **Aiven** using MySQL.

## 🧪 Validation & Audit Status

The project has undergone an audit-focused bug-fix cycle covering the
major role-based portal workflows.

- Role-based authentication and protected access verified.
- Parent portal data access and routes corrected.
- Parent attendance page added.
- Student and teacher attendance interfaces aligned with the attendance
  dashboard design.
- Notice visibility and attachment-related issues addressed.
- Backend production startup verified with a successful MySQL
  connection.
- Frontend production build verified successfully with Vite.

## 👥 Team Members

This project was developed and is maintained by:

- **Suraj** - [GitHub Profile](https://github.com/suraj-86)
- **Patrika** - [GitHub Profile](https://github.com/patrika-123)

## ⚙️ Prerequisites

- Node.js **\>= 20.0.0**
- npm
- MySQL-compatible database (production deployment uses Aiven MySQL)

## 📄 License

This project is licensed under the MIT License.
