import React from 'react';
import { FiLoader, FiAlertTriangle } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts';

export const DashboardLoading = () => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
    >
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <FiLoader className="w-6 h-6 animate-spin text-blue-600" />
          <span
            className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            Loading dashboard...
          </span>
        </div>
      </div>
    </div>
  );
};

export const DashboardError = ({ error, onRetry }) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
    >
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2
            className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            Failed to Load Dashboard
          </h2>
          <p
            className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {error}
          </p>
          <Button onClick={onRetry} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
};
