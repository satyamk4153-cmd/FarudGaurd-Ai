import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { BatchAnalysisPage } from './pages/BatchAnalysisPage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { AlertsPage } from './pages/AlertsPage';
import { InvestigationsPage } from './pages/InvestigationsPage';
import { InvestigationDetailPage } from './pages/InvestigationDetailPage';
import { ModelsPage } from './pages/ModelsPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { CopilotPage } from './pages/CopilotPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

// Guard for protected authenticated routes
const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  requiredAdmin?: boolean;
  requiredAnalyst?: boolean;
}> = ({
  children,
  requiredAdmin = false,
  requiredAnalyst = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin, isAnalyst } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-sm">
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredAnalyst && !isAnalyst) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated Application Console */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/batch-analysis" element={<BatchAnalysisPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/live-monitor" element={<LiveMonitorPage />} />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute requiredAnalyst>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investigations"
          element={
            <ProtectedRoute requiredAnalyst>
              <InvestigationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investigations/:id"
          element={
            <ProtectedRoute requiredAnalyst>
              <InvestigationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/models"
          element={
            <ProtectedRoute requiredAnalyst>
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets"
          element={
            <ProtectedRoute requiredAdmin>
              <DatasetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitoring"
          element={
            <ProtectedRoute requiredAnalyst>
              <MonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/copilot"
          element={
            <ProtectedRoute requiredAnalyst>
              <CopilotPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requiredAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/models"
          element={
            <ProtectedRoute requiredAnalyst>
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/datasets"
          element={
            <ProtectedRoute requiredAdmin>
              <DatasetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitoring"
          element={
            <ProtectedRoute requiredAnalyst>
              <MonitoringPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
