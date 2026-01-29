import './i18n/config';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
import { LandingPage } from './components/LandingPage';
import { ClassifyPage } from './pages/ClassifyPage';
import { StudiesPage } from './pages/StudiesPage';
import { StudyDetailPage } from './pages/StudyDetailPage';
import { AdminStudiesPage } from './pages/admin/AdminStudiesPage';
import { StudyEditorPage } from './pages/admin/StudyEditorPage';
import { StudyAnalyticsPage } from './pages/admin/StudyAnalyticsPage';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/classify"
              element={
                <ProtectedRoute>
                  <ClassifyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studies"
              element={
                <ProtectedRoute>
                  <StudiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studies/:id"
              element={
                <ProtectedRoute>
                  <StudyDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin/studies"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminStudiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/studies/new"
              element={
                <ProtectedRoute requireAdmin>
                  <StudyEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/studies/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <StudyEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/studies/:id/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <StudyAnalyticsPage />
                </ProtectedRoute>
              }
            />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
