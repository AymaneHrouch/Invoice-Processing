import { Routes, Route, Navigate } from 'react-router-dom';
import { NavBar, Sidebar } from '@/components';
import { InvoiceAddPage, InvoiceListPage, DashboardPage } from '@/pages';
import { useTheme, useAuth } from '@/contexts';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {isAuthenticated && <NavBar />}
      <div className="flex flex-row flex-1 overflow-hidden">
        {isAuthenticated && <Sidebar />}
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

            <Route
              path="/invoices/add"
              element={
                <ProtectedRoute>
                  <InvoiceAddPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/list"
              element={
                <ProtectedRoute>
                  <InvoiceListPage />
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
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
