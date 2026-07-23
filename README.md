# University Portal - Project Documentation & README

---

## 📌 Project Overview
The **University Portal** is a comprehensive, full-stack College Management System designed to streamline academic administration, student tracking, faculty operations, and parent engagement. It features role-based dashboards, secure authentication, real-time notices, attendance tracking, fee management, and results processing.

---

## 🚀 Key Features & Modules

### 1. **Authentication & Authorization**
* Secure JWT-based authentication supporting multiple roles: **Admin**, **Teacher**, **Student**, and **Parent**.
* Protected routes ensuring role-restricted page access and data security.
* Automated admin seeding (`seedAdmin.js`) for initial setup.

### 2. **Admin Dashboard**
* Full oversight of institutional operations.
* Management interfaces for:
  * **Courses & Subjects** (`AdminCourses.jsx`, `AdminSubjects.jsx`)
  * **Users** (Students, Teachers, Parents) (`AdminStudents.jsx`, `AdminTeachers.jsx`, `AdminParents.jsx`)
  * **Financials** (Fees, Payments, Transactions) (`AdminFees.jsx`, `AdminPayments.jsx`)
  * **Announcements & Notices** (`AdminNotices.jsx`)
  * **System Settings** (`AdminSettings.jsx`)

### 3. **Teacher Portal**
* **Teacher Dashboard**: Centralized hub for educators.
* **Attendance Tracking**: Log and review student attendance (`TeacherAttendance.jsx`).
* **Marks & Grading**: Upload and update student examination results (`TeacherMarks.jsx`).
* **Academics & Notices**: Manage subject allocations and view institutional notices (`TeacherSubjects.jsx`, `TeacherNotices.jsx`).
* **Profile & Settings**: Manage personal educator credentials (`TeacherSettings.jsx`).

### 4. **Student Portal**
* **Student Dashboard**: Overview of current academic standing.
* **Academic Records**: Check subject lists, semester results, and attendance reports (`StudentSubjects.jsx`, `StudentResults.jsx`, `StudentAttendance.jsx`).
* **Fee Management**: View fee structures and payment histories (`StudentFees.jsx`).
* **Communication & Profile**: Access official notices and manage personal profiles (`StudentNotices.jsx`, `StudentProfile.jsx`, `StudentSettings.jsx`).

### 5. **Parent Portal**
* **Parent Dashboard**: Monitor child's academic performance and activities.
* **Tracking Tools**: View attendance records, examination results, fee statuses, and school notices (`ParentResults.jsx`, `ParentAttendance.jsx`, `ParentFees.jsx`, `ParentNotices.jsx`, `ParentProfile.jsx`).

---

## 🛠️ Technology Stack

### **Backend**
* **Runtime**: Node.js & Express.js (`server.js`)
* **Database**: MySQL (`database/college_ms (1).sql`)
* **Authentication**: JSON Web Tokens (JWT)
* **File Uploads**: Multer support for handling document attachments (syllabi, notices, patches)

### **Frontend**
* **Framework**: React.js with Vite (`vite.config.js`)
* **Routing**: React Router (`ProtectedRoute.jsx`, `DashboardLayout.jsx`)
* **State Management**: Context API (`AuthContext.jsx`, `useAuth.jsx`)
* **Styling & UI Components**: Custom modular UI components (Cards, Modals, Tables, Navigation bars, and Sidebars)

---

## 📁 Project Structure

```text
university-portal/
├── backend/
│   ├── uploads/            # Document and file attachments
│   ├── seedAdmin.js        # Initial admin seeding script
│   ├── server.js           # Express application entry point
│   └── package.json        # Backend dependencies
├── database/
│   └── college_ms (1).sql  # MySQL database schema and initial data
└── frontend/
    ├── public/             # Public assets, icons, and favicons
    ├── src/
    │   ├── components/     # Reusable UI components (Buttons, Modals, Tables, etc.)
    │   ├── context/        # React Context providers (AuthContext)
    │   ├── hooks/          # Custom hooks (useAuth)
    │   ├── layouts/        # Dashboard layout wrappers
    │   ├── pages/          # Role-specific views (Admin, Teacher, Student, Parent, Auth)
    │   ├── routes/         # Route protection configuration
    │   ├── services/       # API integration services (axios config)
    │   ├── App.jsx         # Root application component
    │   └── main.jsx        # Frontend entry point
    └── package.json        # Frontend dependencies
```

> ## ⚙️ Installation & Setup
> 
> ### 1. Clone the Repository
> ```bash
> git clone <repository-url>
> cd university-portal
> ```
> 
> ### 2. Database Configuration
> * Import the provided SQL dump (`database/college_ms (1).sql`) into your local MySQL server instance.
> * Configure your database credentials in the backend environment configuration.
> 
> ### 3. Backend Setup
> ```bash
> cd backend
> npm install
> # Seed the initial admin account
> node seedAdmin.js
> # Start the backend server
> npm start
> ```
> 
> ### 4. Frontend Setup
> ```bash
> cd ../frontend
> npm install
> # Run the development server
> npm run dev
> ```



## ☁️ Deployment

The application utilizes a modern, distributed cloud architecture for optimal performance and scalability:

* **Live Application:** [View on Vercel](https://your-vercel-deployment-link.vercel.app)
* **Frontend:** Hosted on **Vercel** for fast global CDN delivery and CI/CD integration.
* **Backend (API):** Hosted on **Render**, providing a robust and scalable environment for the Node.js/Express server.
* **Database:** Hosted on **Aiven**, ensuring a secure, reliable, and managed MySQL database instance.

---

## 👥 Team Members

This project was developed and is maintained by:

* **Suraj** - [GitHub Profile](https://github.com/your-github-username)
* **Patrika** - [GitHub Profile](https://github.com/patrika-github-username)

---

## ⚙️ Prerequisites

- Node.js **>= 20.0.0**
- MySQL(via XAMPP)
- npm

---


📄 License

This project is licensed under the MIT License.
