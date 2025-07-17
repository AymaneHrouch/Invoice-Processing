import React from 'react';
import { FiUsers } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { formatCurrency } from '@/constants';

const TopVendors = ({ vendors = [] }) => {
  const { isDarkMode } = useTheme();

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiUsers className="w-5 h-5" />
          Top Vendors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vendors.length > 0 ? (
          <div className="space-y-4">
            {vendors.map((vendor, index) => (
              <div
                key={vendor.vendor}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : index === 1
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : index === 3
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : index === 4
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : index === 5
                                  ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                                  : index === 6
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                    : index === 7
                                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                                      : index === 8
                                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p
                      className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {vendor.vendor}
                    </p>
                    <p
                      className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      {vendor.total_invoices}{' '}
                      {`invoice${vendor.total_invoices === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {formatCurrency(vendor.total_amount, 'MAD')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              No vendor data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopVendors;
