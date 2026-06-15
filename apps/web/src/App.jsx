import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "./store/index.js";
import api from "./services/api.js";
import AppLayout from "./components/layout/AppLayout.jsx";
// import { useAuthStore } from "./store/index.js";
const AdminLayout = React.lazy(() => import("./pages/admin/AdminLayout.jsx"));
// Add AdminRoute guard
const AdminRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
};


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

const Profile = React.lazy(() => import("./pages/profile/Profile.jsx"));
const AdvanceTax = React.lazy(() => import("./pages/calculator/AdvanceTax.jsx"));

const RefundTracker = React.lazy(() => import("./pages/filing/RefundTracker.jsx"));

export default function App() {
  const setFlags = useFlagsStore((s) => s.setFlags);

  useEffect(() => {
    api.get("/features").then((res) => setFlags(res.data)).catch(() => {});
  }, []);

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
          <Route path="profile" element={<Profile />} />
          <Route path="advance-tax" element={<AdvanceTax />} />
          <Route path="refund-tracker" element={<RefundTracker />} />
          <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>} />
        </Route>
        
      </Routes>
      
    </React.Suspense>
  );
}
