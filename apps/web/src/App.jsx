import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/index.js";
import AppLayout from "./components/layout/AppLayout.jsx";


const Login      = React.lazy(() => import("./pages/auth/Login.jsx"));
const Register   = React.lazy(() => import("./pages/auth/Register.jsx"));
const Dashboard  = React.lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const TaxCalculator = React.lazy(() => import("./pages/calculator/TaxCalculator.jsx"));
const ITR1Filing    = React.lazy(() => import("./pages/filing/itr1/ITR1Filing.jsx"));

const NotFound   = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <h2 style={{ fontSize: 48, color: "#d9d9d9" }}>404</h2>
    <p>Page not found</p>
  </div>
);

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return !token ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    }>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected — wrapped in layout */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index                element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="*"             element={<NotFound />} />
          <Route path="calculator"       element={<TaxCalculator />} />
          <Route path="filing/itr1"      element={<ITR1Filing />} />

        </Route>
        
      </Routes>
      
    </React.Suspense>
  );
}
