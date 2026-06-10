import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import useFeature from "./hooks/useFeature.js";

// Pages (create as empty placeholders for now)
const Dashboard  = React.lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const Login      = React.lazy(() => import("./pages/auth/Login.jsx"));
const NotFound   = () => <div className="p-8 text-center">404 — Page not found</div>;

export default function App() {
  return (
    <React.Suspense fallback={<div className="p-8">Loading...</div>}>
      <Routes>
        <Route path="/"        element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*"        element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
}
