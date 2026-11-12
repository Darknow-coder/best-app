import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n } from '@/i18n';
import { ToastProvider } from '@/ui/Toast';
import { ConfirmProvider } from './Confirm';
import { Layout } from './Layout';
import { isOnboarded } from './settings';
import { useTheme } from './settings';

const TodayPage = lazy(() => import('@/features/today/TodayPage'));
const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
const BuilderPage = lazy(() => import('@/features/builder/BuilderPage'));
const ExperimentsPage = lazy(() => import('@/features/experiments/ExperimentsPage'));
const ExperimentDetailPage = lazy(() => import('@/features/experiments/ExperimentDetailPage'));
const ResultsPage = lazy(() => import('@/features/results/ResultsPage'));
const NotebookPage = lazy(() => import('@/features/notebook/NotebookPage'));
const MethodPage = lazy(() => import('@/features/method/MethodPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const WelcomePage = lazy(() => import('@/features/onboarding/WelcomePage'));

function Loading() {
  const { t } = useI18n();
  return (
    <p className="muted center" style={{ padding: 'var(--space-7)' }}>
      {t('common.loading')}
    </p>
  );
}

function Gate({ children }: { children: JSX.Element }) {
  const loc = useLocation();
  if (!isOnboarded() && loc.pathname !== '/welcome') return <Navigate to="/welcome" replace />;
  return children;
}

function Shell() {
  useTheme();
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route
          element={
            <Gate>
              <Layout />
            </Gate>
          }
        >
          <Route index element={<TodayPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="new" element={<BuilderPage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="experiments/:id" element={<ExperimentDetailPage />} />
          <Route path="experiments/:id/edit" element={<BuilderPage />} />
          <Route path="experiments/:id/results" element={<ResultsPage />} />
          <Route path="notebook" element={<NotebookPage />} />
          <Route path="method" element={<MethodPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <BrowserRouter basename={base}>
      <I18nProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Shell />
          </ConfirmProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
