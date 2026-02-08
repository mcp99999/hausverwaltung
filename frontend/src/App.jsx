import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import MeterReadings from './pages/MeterReadings';
import Tariffs from './pages/Tariffs';
import Contacts from './pages/Contacts';
import Expenses from './pages/Expenses';
import RecurringCosts from './pages/RecurringCosts';
import Users from './pages/Users';
import Reports from './pages/Reports';
import ActivityLog from './pages/ActivityLog';
import Backup from './pages/Backup';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/meter-readings" element={<MeterReadings />} />
            <Route path="/tariffs" element={<Tariffs />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/recurring-costs" element={<RecurringCosts />} />
            <Route path="/users" element={<Users />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/backup" element={<Backup />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
