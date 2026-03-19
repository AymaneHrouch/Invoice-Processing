import React from 'react';
import { useTheme } from '@/contexts';

const DashboardHeader = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className="mb-8">
      <div>
        <h1
          className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        >
          Tableau de bord
        </h1>
        <p
          className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
        >
          Vue d&apos;ensemble de votre système de traitement des factures
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
