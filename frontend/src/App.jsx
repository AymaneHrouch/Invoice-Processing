import { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { NavBar, Sidebar, AdminOnly } from '@/components';
import {
  InvoiceAddPage,
  InvoiceListPage,
  DashboardPage,
  CompanyProfilePage,
  ContactsPage,
  VenteCreatePage,
} from '@/pages';
import { useTheme, useAuth } from '@/contexts';
import { getCompanyProfile } from '@/api/company';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserManagement from './components/admin/UserManagement';
// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    getCompanyProfile()
      .then(() => setProfileComplete(true))
      .catch((err) => {
        if (err.response?.status === 404) {
          setProfileComplete(false);
          const exempt = ['/company', '/users'];
          if (!exempt.includes(location.pathname)) {
            navigate('/company', { state: { onboarding: true } });
          }
        }
      });
  }, [isAuthenticated, location.pathname]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {isAuthenticated && <NavBar />}
      <div className="flex flex-row flex-1 overflow-hidden">
        {isAuthenticated && <Sidebar profileComplete={profileComplete} />}
        <main
          className={`flex-1 overflow-auto ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-100'} ${!isAuthenticated ? 'p-0' : 'p-6'}`}
        >
          <Routes>
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <LoginPage />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/register"
              element={
                !isAuthenticated ? (
                  <RegisterPage />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            {/* Legacy redirects */}
            <Route
              path="/invoices/add"
              element={<Navigate to="/achats/import" replace />}
            />
            <Route
              path="/invoices/list"
              element={<Navigate to="/achats" replace />}
            />

            {/* Achats */}
            <Route
              path="/achats"
              element={
                <ProtectedRoute>
                  <InvoiceListPage direction="incoming" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achats/import"
              element={
                <ProtectedRoute>
                  <InvoiceAddPage direction="incoming" />
                </ProtectedRoute>
              }
            />

            {/* Ventes */}
            <Route
              path="/ventes"
              element={
                <ProtectedRoute>
                  <InvoiceListPage direction="outgoing" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventes/new"
              element={
                <ProtectedRoute>
                  <VenteCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company"
              element={
                <ProtectedRoute>
                  <CompanyProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/new"
              element={
                <ProtectedRoute>
                  <CompanyProfilePage createMode />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <ContactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <Navigate
                  to={isAuthenticated ? '/dashboard' : '/login'}
                  replace
                />
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={isAuthenticated ? '/dashboard' : '/login'}
                  replace
                />
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <AdminOnly>
                    <UserManagement />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
