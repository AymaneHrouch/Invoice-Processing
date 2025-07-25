import React from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts';
import { Link } from 'react-router-dom';
const DashboardHeader = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1
            className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            Invoice Dashboard
          </h1>
          <p
            className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Overview of your invoice processing system
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <FiDownload className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="flex items-center gap-2">
            <FiFileText className="w-4 h-4" />
            <Link to="/invoices/add">New Invoice</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
