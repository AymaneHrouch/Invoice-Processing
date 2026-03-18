import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts';

const AdminOnly = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  // ADMIN and FIRM_ADMIN can access user management
  if (!user || !['ADMIN', 'FIRM_ADMIN'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminOnly;
