import { useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import DeviceDetails from "@/pages/DeviceDetails";
import Login from "@/pages/Login";
import Logs from "@/pages/Logs";
import Settings from "@/pages/Settings";
import { useSessionStore } from "@/store/useSessionStore";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const isLoadingSession = useSessionStore((state) => state.isLoadingSession);

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] text-sm text-slate-300">
        Oturum kontrol ediliyor...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const restoreSession = useSessionStore((state) => state.restoreSession);
  const loadBootstrap = useSessionStore((state) => state.loadBootstrap);

  useEffect(() => {
    void loadBootstrap();
    void restoreSession();
  }, [loadBootstrap, restoreSession]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices/:deviceId"
          element={
            <ProtectedRoute>
              <DeviceDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
