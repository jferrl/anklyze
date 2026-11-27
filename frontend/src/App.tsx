import './i18n/config';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
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
import { NotFoundPage } from './components/NotFoundPage';
import { ClassifyPage } from './pages/ClassifyPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ClassifyRoute } from './components/auth/ClassifyRoute';
import { AppShell } from './components/layout';
import { CommandPalette } from './components/CommandPalette';

// Admin pages load on demand so raters never download the charting code.
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminCasesPage = lazy(() => import('./pages/admin/AdminCasesPage').then((m) => ({ default: m.AdminCasesPage })));
const CaseEditorPage = lazy(() => import('./pages/admin/CaseEditorPage').then((m) => ({ default: m.CaseEditorPage })));
const CaseReportPage = lazy(() => import('./pages/admin/CaseReportPage').then((m) => ({ default: m.CaseReportPage })));
const AdminStudiesPage = lazy(() => import('./pages/admin/AdminStudiesPage').then((m) => ({ default: m.AdminStudiesPage })));
const StudyEditorPage = lazy(() => import('./pages/admin/StudyEditorPage').then((m) => ({ default: m.StudyEditorPage })));
const StudyReliabilityPage = lazy(() => import('./pages/admin/StudyReliabilityPage').then((m) => ({ default: m.StudyReliabilityPage })));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={null}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Public: shared with journal reviewers; the flow diagram stays admin-only. */}
              <Route
                path="/classify"
                element={
                  <ClassifyRoute>
                    <ClassifyPage />
                  </ClassifyRoute>
                }
              />
              <Route
                path="/cases"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <CasesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cases/:id"
                element={
                  <ProtectedRoute>
                    <AppShell breadcrumbs={[{ labelKey: 'cases', href: '/cases' }, { record: true }]}>
                      <CaseDetailPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppShell>
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
                    <AppShell>
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
                    <AppShell>
                      <AdminCasesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'cases', href: '/admin/cases' }, { labelKey: 'newCase' }]}>
                      <CaseEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'cases', href: '/admin/cases' }, { record: true }]}>
                      <CaseEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases/:id/report"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'cases', href: '/admin/cases' }, { record: true, href: '../edit' }, { labelKey: 'report' }]}>
                      <CaseReportPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              {/* The case analytics and reliability pages merged into the report; old links still land there. */}
              <Route path="/admin/cases/:id/analytics" element={<Navigate to="../report" relative="path" replace />} />
              <Route path="/admin/cases/:id/reliability" element={<Navigate to="../report" relative="path" replace />} />

              {/* Admin Study Routes (formerly /admin/cohorts) */}
              {/* Studies are research projects grouping multiple cases for multi-rater reliability analysis */}
              <Route
                path="/admin/studies"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell>
                      <AdminStudiesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'studies', href: '/admin/studies' }, { labelKey: 'newStudy' }]}>
                      <StudyEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'studies', href: '/admin/studies' }, { record: true }]}>
                      <StudyEditorPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studies/:id/reliability"
                element={
                  <ProtectedRoute requireAdmin>
                    <AppShell breadcrumbs={[{ labelKey: 'studies', href: '/admin/studies' }, { record: true, href: '../edit' }, { labelKey: 'reliability' }]}>
                      <StudyReliabilityPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            <CommandPalette />
          </BrowserRouter>
          <Toaster position="bottom-right" closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
