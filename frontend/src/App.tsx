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

import { HomeRedirect } from './components/auth/HomeRedirect';
import { ClassifyPage } from './pages/ClassifyPage';
import { StudiesPage } from './pages/StudiesPage';
import { StudyDetailPage } from './pages/StudyDetailPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStudiesPage } from './pages/admin/AdminStudiesPage';
import { StudyEditorPage } from './pages/admin/StudyEditorPage';
import { StudyAnalyticsPage } from './pages/admin/StudyAnalyticsPage';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes with AppShell */}
              <Route
                path="/classify"
                element={
                  <ProtectedRoute>
                    <AppShell breadcrumbs={[{ label: 'Classify' }]}>
                      <ClassifyPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/studies"
                element={
                  <ProtectedRoute>
                    <AppShell breadcrumbs={[{ label: 'Studies' }]}>
                      <StudiesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/studies/:id"
                element={
                  <ProtectedRoute>
                    <AppShell
                      breadcrumbs={[
                        { label: 'Studies', href: '/studies' },
                        { label: 'Study Detail' },
                      ]}
                    >
                      <StudyDetailPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}>
                      <AdminDashboardPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Studies' },
                      ]}
                    >
                      <AdminStudiesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { label: 'Admin' },
                        { label: 'Studies', href: '/admin/studies' },
                        { label: 'New Study' },
                      ]}
                    >
                      <StudyEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { label: 'Admin' },
                        { label: 'Studies', href: '/admin/studies' },
                        { label: 'Edit Study' },
                      ]}
                    >
                      <StudyEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/:id/analytics"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { label: 'Admin' },
                        { label: 'Studies', href: '/admin/studies' },
                        { label: 'Analytics' },
                      ]}
                    >
                      <StudyAnalyticsPage />
                    </AppShell>
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
