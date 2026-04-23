import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './components/auth/AuthProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import ProjectDetail from './pages/ProjectDetail/ProjectDetail';
import CVEvaluator from './pages/CVEvaluator/CVEvaluator';
import HomeOverview from './pages/HomeOverview/HomeOverview';
import Profile from './pages/Profile/Profile';
import EvaluationCriteria from './pages/EvaluationCriteria/EvaluationCriteria';
import Candidates from './pages/Candidates/Candidates';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard-home" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard-home" element={
            <ProtectedRoute>
              <Layout>
                <HomeOverview />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/project/:id" element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/cv-evaluator" element={
            <ProtectedRoute>
              <Layout>
                <CVEvaluator />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluation-criteria" element={
            <ProtectedRoute>
              <Layout>
                <EvaluationCriteria />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/candidates" element={
            <ProtectedRoute>
              <Layout>
                <Candidates />
              </Layout>
            </ProtectedRoute>
          } />
          {/* Placeholder Route for Sidebar Navigation */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#6B7280' }}>
                  <h2>Module Upcoming</h2>
                  <p>This section is queued for development.</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
