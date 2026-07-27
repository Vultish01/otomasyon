import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import DeviceDetails from "@/pages/DeviceDetails";
import Login from "@/pages/Login";
import Logs from "@/pages/Logs";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/devices/:deviceId" element={<DeviceDetails />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
