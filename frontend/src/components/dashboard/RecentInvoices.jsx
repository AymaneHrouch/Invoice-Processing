import React from 'react';
import { FiFileText, FiEye } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts';
import { formatCurrency, formatDate } from '@/constants';
import { Link } from 'react-router-dom';

const RecentInvoices = ({ invoices = [] }) => {
  const { isDarkMode } = useTheme();

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'extracted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FiFileText className="w-5 h-5" />
            Recent Invoices
          </CardTitle>
          <Button variant="outline" size="sm">
            <FiEye className="w-4 h-4 mr-2" />
            <Link to="/invoices/list">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id || invoice.invoice_number}
                className={`flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow ${
                  isDarkMode
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p
                      className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {invoice.invoice_number || invoice.id}
                    </p>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      {invoice.vendor_name || invoice.vendor}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {formatCurrency(
                        invoice.total_amount || invoice.amount,
                        'MAD',
                      )}
                    </p>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      {formatDate(invoice.invoice_date || invoice.date)}
                    </p>
                  </div>
                  <Badge
                    className={`${getStatusColor(invoice.status)} border-0 w-20 justify-center`}
                  >
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              No recent invoices found
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentInvoices;
