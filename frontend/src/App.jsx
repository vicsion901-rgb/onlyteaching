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
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
