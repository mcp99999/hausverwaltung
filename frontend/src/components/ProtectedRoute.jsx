import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: theme.colors.textMuted }}>Laden...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}
