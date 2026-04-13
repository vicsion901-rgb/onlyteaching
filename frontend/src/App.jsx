import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentRecords from './pages/StudentRecords';
import Schedule from './pages/Schedule';
import Semester1Schedule from './pages/Semester1Schedule';
import Semester2Schedule from './pages/Semester2Schedule';
import LifeRecords from './pages/LifeRecords';
import SubjectEvaluation from './pages/SubjectEvaluation';
import Neis from './pages/Neis';
import Newsletter from './pages/Newsletter';
import Counseling from './pages/Counseling';
import AbsenceReport from './pages/AbsenceReport';
import ExamGrading from './pages/ExamGrading';
import CreativeActivities from './pages/CreativeActivities';
import AcademicCalendar from './pages/AcademicCalendar';
import AutobiographyCompilation from './pages/AutobiographyCompilation';
import TodayMeal from './pages/TodayMeal';
import CareClassroom from './pages/CareClassroom';
import PresenterPicker from './pages/PresenterPicker';
import SeatArrangement from './pages/SeatArrangement';
import RoleAssignment from './pages/RoleAssignment';
import TeacherVerification from './pages/TeacherVerification';
import ResetPassword from './pages/ResetPassword';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Policy from './pages/Policy';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/semester1-schedule" element={<Semester1Schedule />} />
          <Route path="/semester2-schedule" element={<Semester2Schedule />} />
          <Route path="/student-records" element={<StudentRecords />} />
          <Route path="/subject-evaluation" element={<SubjectEvaluation />} />
          <Route path="/life-records" element={<LifeRecords />} />
          <Route path="/neis" element={<Neis />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/counseling" element={<Counseling />} />
          <Route path="/absence-report" element={<AbsenceReport />} />
          <Route path="/exam-grading" element={<ExamGrading />} />
          <Route path="/creative-activities" element={<CreativeActivities />} />
          <Route path="/academic-calendar" element={<AcademicCalendar />} />
          <Route path="/autobiography-compilation" element={<AutobiographyCompilation />} />
          <Route path="/today-meal" element={<TodayMeal />} />
          <Route path="/care-classroom" element={<CareClassroom />} />
          <Route path="/presenter-picker" element={<PresenterPicker />} />
          <Route path="/seat-arrangement" element={<SeatArrangement />} />
          <Route path="/role-assignment" element={<RoleAssignment />} />
          <Route path="/teacher-verification" element={<TeacherVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
