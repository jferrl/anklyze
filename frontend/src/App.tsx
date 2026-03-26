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
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminCasesPage } from './pages/admin/AdminCasesPage';
import { CaseEditorPage } from './pages/admin/CaseEditorPage';
import { CaseAnalyticsPage } from './pages/admin/CaseAnalyticsPage';
import { CaseReliabilityPage } from './pages/admin/CaseReliabilityPage';
import { AdminStudiesPage } from './pages/admin/AdminStudiesPage';
import { StudyEditorPage } from './pages/admin/StudyEditorPage';
import { StudyReliabilityPage } from './pages/admin/StudyReliabilityPage';
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
                path="/cases"
                element={
                  <ProtectedRoute>
                    <AppShell breadcrumbs={[{ labelKey: 'cases' }]}>
                      <CasesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cases/:id"
                element={
                  <ProtectedRoute>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'cases', href: '/cases' },
                        { labelKey: 'caseDetail' },
                      ]}
                    >
                      <CaseDetailPage />
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
              {/* Admin Case Routes (formerly /admin/studies) */}
              <Route
                path="/admin/cases"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin', href: '/admin' },
                        { labelKey: 'cases' },
                      ]}
                    >
                      <AdminCasesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cases', href: '/admin/cases' },
                        { labelKey: 'newCase' },
                      ]}
                    >
                      <CaseEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cases', href: '/admin/cases' },
                        { labelKey: 'editCase' },
                      ]}
                    >
                      <CaseEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/:id/analytics"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cases', href: '/admin/cases' },
                        { labelKey: 'analytics' },
                      ]}
                    >
                      <CaseAnalyticsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/:id/reliability"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell
                      breadcrumbs={[
                        { labelKey: 'admin' },
                        { labelKey: 'cases', href: '/admin/cases' },
                        { labelKey: 'reliability' },
                      ]}
                    >
                      <CaseReliabilityPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />

              {/* Admin Study Routes (formerly /admin/cohorts) */}
              {/* Studies are research projects grouping multiple cases for multi-rater reliability analysis */}
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
