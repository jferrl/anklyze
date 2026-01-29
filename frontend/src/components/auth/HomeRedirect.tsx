import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LandingPage } from '../LandingPage';

/**
 * Smart home redirect component:
 * - Unauthenticated users see the landing page
 * - Authenticated admins go to admin dashboard
 * - Authenticated regular users go to classify
 */
export function HomeRedirect() {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Show nothing while checking auth state
  if (loading) {
    return null;
  }

  // Unauthenticated users see the landing page
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Admins go to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin/studies" replace />;
  }

  // Regular users go to classify
  return <Navigate to="/classify" replace />;
}
