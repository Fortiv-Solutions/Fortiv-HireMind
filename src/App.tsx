import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import ProjectDetail from './pages/ProjectDetail/ProjectDetail';
import CVEvaluator from './pages/CVEvaluator/CVEvaluator';
import HomeOverview from './pages/HomeOverview/HomeOverview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        <Route path="/dashboard-home" element={
          <Layout>
            <HomeOverview />
          </Layout>
        } />
        <Route path="/project/:id" element={
          <Layout>
            <ProjectDetail />
          </Layout>
        } />
        <Route path="/cv-evaluator" element={
          <Layout>
            <CVEvaluator />
          </Layout>
        } />
        {/* Placeholder Route for Sidebar Navigation */}
        <Route path="*" element={
          <Layout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#6B7280' }}>
              <h2>Module Upcoming</h2>
              <p>This section is queued for development.</p>
            </div>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
