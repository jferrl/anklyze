import './i18n/config';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

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
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStudiesPage } from './pages/admin/AdminStudiesPage';
import { StudyEditorPage } from './pages/admin/StudyEditorPage';
import { StudyAnalyticsPage } from './pages/admin/StudyAnalyticsPage';
import { StudyReliabilityPage } from './pages/admin/StudyReliabilityPage';
import { StudyDivergencePage } from './pages/admin/StudyDivergencePage';
import { AdminCohortsPage } from './pages/admin/AdminCohortsPage';
import { CohortEditorPage } from './pages/admin/CohortEditorPage';
import { CohortReliabilityPage } from './pages/admin/CohortReliabilityPage';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout';
import { CommandPalette } from './components/CommandPalette';

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
                    <AppShell breadcrumbs={[{ labelKey: 'classify' }]}>
                      <ClassifyPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/studies"
                element={
                  <ProtectedRoute>
                    <AppShell breadcrumbs={[{ labelKey: 'studies' }]}>
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
                        { labelKey: 'studies', href: '/studies' },
                        { labelKey: 'studyDetail' },
                      ]}
                    >
                      <StudyDetailPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppShell breadcrumbs={[{ labelKey: 'profile' }]}>
                      <ProfilePage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'admin' }, { labelKey: 'dashboard' }]}>
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
                        { labelKey: 'admin', href: '/admin' },
                        { labelKey: 'studies' },
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
                        { labelKey: 'admin' },
                        { labelKey: 'studies', href: '/admin/studies' },
                        { labelKey: 'newStudy' },
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
                        { labelKey: 'admin' },
                        { labelKey: 'studies', href: '/admin/studies' },
                        { labelKey: 'editStudy' },
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
                        { labelKey: 'admin' },
                        { labelKey: 'studies', href: '/admin/studies' },
                        { labelKey: 'analytics' },
                      ]}
                    >
                      <StudyAnalyticsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/:id/reliability"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'studies', href: '/admin/studies' },
                        { labelKey: 'reliability' },
                      ]}
                    >
                      <StudyReliabilityPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/:id/divergence"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'studies', href: '/admin/studies' },
                        { labelKey: 'divergence' },
                      ]}
                    >
                      <StudyDivergencePage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Cohort Routes */}
              <Route
                path="/admin/cohorts"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin', href: '/admin' },
                        { labelKey: 'cohorts' },
                      ]}
                    >
                      <AdminCohortsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cohorts/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cohorts', href: '/admin/cohorts' },
                        { labelKey: 'newCohort' },
                      ]}
                    >
                      <CohortEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cohorts/:id"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cohorts', href: '/admin/cohorts' },
                        { labelKey: 'cohortDetail' },
                      ]}
                    >
                      <CohortEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cohorts/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cohorts', href: '/admin/cohorts' },
                        { labelKey: 'editCohort' },
                      ]}
                    >
                      <CohortEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cohorts/:id/reliability"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cohorts', href: '/admin/cohorts' },
                        { labelKey: 'reliability' },
                      ]}
                    >
                      <CohortReliabilityPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <CommandPalette />
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
