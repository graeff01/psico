import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./lib/auth-client";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientsPage } from "./pages/PatientsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { ConsultationsPage } from "./pages/ConsultationsPage";
import { ConsultationDetailPage } from "./pages/ConsultationDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SessionPage } from "./pages/SessionPage";
import { PatientTimelinePage } from "./pages/PatientTimelinePage";
import { CalendarPage } from "./pages/CalendarPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ScalesPage } from "./pages/ScalesPage";
import { AIChatFloat } from "./components/AIChatFloat";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) return null;
  if (session) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/session"
          element={
            <ProtectedRoute>
              <SessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="consultations" element={<ConsultationsPage />} />
          <Route path="consultations/:id" element={<ConsultationDetailPage />} />
          <Route path="patients/:id/timeline" element={<PatientTimelinePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="scales" element={<ScalesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <AIChatFloat />
    </>
  );
}
