import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "./store/index.js";
import api from "./services/api.js";
import AppLayout from "./components/layout/AppLayout.jsx";
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
const TaxCalculator   = React.lazy(() => import("./pages/calculator/TaxCalculator.jsx"));
const ITR1Filing      = React.lazy(() => import("./pages/filing/itr1/ITR1Filing.jsx"));
const EFilingPage     = React.lazy(() => import("./pages/filing/efiling/EFilingPage.jsx"));
const CADashboard     = React.lazy(() => import("./pages/ca/CADashboard.jsx"));
const AddEditClient   = React.lazy(() => import("./pages/ca/clients/AddEditClient.jsx"));
const ClientWorkspace = React.lazy(() => import("./pages/ca/clients/ClientWorkspace.jsx"));
const CAITRFiling     = React.lazy(() => import("./pages/ca/filing/CAITRFiling.jsx"));
const ApprovePage     = React.lazy(() => import("./pages/approve/ApprovePage.jsx"));

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
  const setFlags        = useFlagsStore((s) => s.setFlags);
  const { token, user, setUser, logout } = useAuthStore();

  // Restore the user object after a page refresh.
  // The token survives in localStorage but the Zustand user is in-memory only,
  // so it resets to null on every refresh. Fetch /auth/me once on mount when
  // we have a token but no user object yet.
  useEffect(() => {
    if (token && !user) {
      api.get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => logout());
    }
  }, []);

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
        <Route path="/login"            element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"         element={<PublicRoute><Register /></PublicRoute>} />
        {/* Public approval page — no auth required */}
        <Route path="/approve/:token"   element={<ApprovePage />} />

        {/* Protected — wrapped in layout */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index                element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="*"             element={<NotFound />} />
          <Route path="calculator"       element={<TaxCalculator />} />
          <Route path="filing/itr1"      element={<ITR1Filing />} />
          <Route path="efiling"           element={<EFilingPage />} />
          {/* CA Portal routes */}
          <Route path="ca/dashboard"                        element={<CADashboard />} />
          <Route path="ca/clients/new"                      element={<AddEditClient />} />
          <Route path="ca/clients/:clientId"                element={<ClientWorkspace />} />
          <Route path="ca/clients/:clientId/edit"           element={<AddEditClient />} />
          <Route path="ca/clients/:clientId/itr1"           element={<CAITRFiling />} />
          <Route path="profile" element={<Profile />} />
          <Route path="advance-tax" element={<AdvanceTax />} />
          <Route path="refund-tracker" element={<RefundTracker />} />
          <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>} />
        </Route>
        
      </Routes>
      
    </React.Suspense>
  );
}
