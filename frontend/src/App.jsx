import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// 1. Core & Layouts
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout';
import NotFound from './pages/NotFound'; // <-- The 404 Safety Net

// 2. Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentFees from './pages/student/StudentFees';
import StudentNotices from './pages/student/StudentNotices';
import StudentResults from './pages/student/StudentResults';
import StudentSubjects from './pages/student/StudentSubjects';

// 3. Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminCourses from './pages/admin/AdminCourses';
import AdminSubjects from './pages/admin/AdminSubjects';
//import AdminAttendance from '../hidden for later/AdminAttendance';
import AdminFees from './pages/admin/AdminFees';
//import AdminMarks from '../hidden for later/AdminMarks';
import AdminPayments from './pages/admin/AdminPayments';
import AdminNotices from './pages/admin/AdminNotices';

// 4. Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherMarks from './pages/teacher/TeacherMarks';
import TeacherSubjects from './pages/teacher/TeacherSubjects'; // <-- Plural updated!
import TeacherNotices from './pages/teacher/TeacherNotices';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Portal Routes (Wrapped in the Sidebar Layout) */}
          <Route element={<DashboardLayout />}>
            
            {/* --- STUDENT ROUTES --- */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/fees" element={<StudentFees />} />
            <Route path="/student/notices" element={<StudentNotices />} />
            <Route path="/student/results" element={<StudentResults />} />
            <Route path="/student/subjects" element={<StudentSubjects />} />

            {/* --- ADMIN ROUTES --- */}
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/teachers" element={<AdminTeachers />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/subjects" element={<AdminSubjects />} />
            {/* <Route path="/admin/attendance" element={<AdminAttendance />} /> */}
            <Route path="/admin/fees" element={<AdminFees />} />
            {/* <Route path="/admin/marks" element={<AdminMarks />} /> */}
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/notices" element={<AdminNotices />} />

            {/* --- TEACHER ROUTES --- */}
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/attendance" element={<TeacherAttendance />} />
            <Route path="/teacher/marks" element={<TeacherMarks />} />
            <Route path="/teacher/subjects" element={<TeacherSubjects />} />
            <Route path="/teacher/notices" element={<TeacherNotices />} />

          </Route>

          {/* Catch-All 404 Route (Outside the layout so it stays full-screen!) */}
          <Route path="*" element={<NotFound />} />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
