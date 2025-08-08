import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  FiX,
  FiExternalLink,
  FiDollarSign,
  FiCalendar,
  FiUser,
  FiFileText,
} from 'react-icons/fi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts';
import { formatCurrency } from '@/constants';
import { getTopInvoicesByCategory } from '@/api/invoice';

const CategoryInvoicesModal = ({ isOpen, onClose, category }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && category) {
      fetchTopInvoices();
    }
  }, [isOpen, category]);

  const fetchTopInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTopInvoicesByCategory(category.category, 10);
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandToListPage = () => {
    navigate(
      `/invoices/list?category=${encodeURIComponent(category.category)}&sort_by=total_amount&order=desc`,
    );
    onClose();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`!max-w-[95vw] sm:!max-w-[85vw] lg:!max-w-[80vw] !w-[95vw] sm:!w-[85vw] lg:!w-[80vw] max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl ${
          isDarkMode
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-gray-200'
        }`}
        showCloseButton={false}
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        {/* Custom Header */}
        <div
          className={`flex items-center justify-between p-4 sm:p-6 border-b shrink-0 ${
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          <DialogHeader className="flex-1">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold">
              <FiFileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <span
                className={`${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}
              >
                Top Invoices - {category.category}
              </span>
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs w-fit">
                {category.percentage}% of total
              </Badge>
              <span
                className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Total: {formatCurrency(category.total_amount, 'MAD')}
              </span>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-2 ml-2 sm:ml-4">
            <Button onClick={onClose} variant="ghost" size="sm" className="p-2">
              <FiX className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <div className="absolute inset-0 rounded-full h-12 w-12 border-2 border-gray-200 dark:border-slate-600"></div>
              </div>
              <span
                className={`mt-4 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Loading invoices...
              </span>
              <span
                className={`mt-1 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
              >
                Fetching top invoices for {category.category}
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiFileText className="w-8 h-8 text-red-500" />
              </div>
              <h3
                className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Error Loading Invoices
              </h3>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <Button
                onClick={fetchTopInvoices}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FiFileText className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && invoices.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <FiFileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3
                className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                No Invoices Found
              </h3>
              <p
                className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                No invoices found for the category &ldquo;{category.category}
                &rdquo;
              </p>
            </div>
          )}

          {!loading && !error && invoices.length > 0 && (
            <div className="space-y-3">
              {invoices.map((invoice, index) => (
                <div
                  key={invoice.id}
                  className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {/* Mobile Layout */}
                  <div className="block sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <h3
                          className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                        >
                          #{invoice.invoice_number}
                        </h3>
                      </div>
                      <Badge
                        className={`${getStatusColor(invoice.status)} text-xs px-2 py-1`}
                      >
                        {invoice.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <FiUser className="w-3 h-3 text-blue-500" />
                      <span
                        className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}
                      >
                        {invoice.vendor_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-green-500" />
                        <span
                          className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          {formatDate(invoice.invoice_date)}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      >
                        {formatCurrency(invoice.total_amount, 'MAD')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <FiCalendar className="w-3 h-3 text-orange-500" />
                      <span
                        className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        Due: {formatDate(invoice.due_date)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-1 flex justify-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold">
                        {index + 1}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <h3
                        className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      >
                        #{invoice.invoice_number}
                      </h3>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <FiUser className="w-3 h-3 text-blue-500" />
                        <span
                          className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}
                        >
                          {invoice.vendor_name}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-green-500" />
                        <span
                          className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          {formatDate(invoice.invoice_date)}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3 text-orange-500" />
                        <span
                          className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          {formatDate(invoice.due_date)}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <Badge
                        className={`${getStatusColor(invoice.status)} text-xs px-2 py-1`}
                      >
                        {invoice.status}
                      </Badge>
                    </div>

                    <div className="col-span-2 text-right">
                      <div
                        className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      >
                        {formatCurrency(invoice.total_amount, 'MAD')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && invoices.length > 0 && (
          <div
            className={`px-4 sm:px-6 py-3 border-t shrink-0 ${
              isDarkMode
                ? 'border-slate-700 bg-slate-800/50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p
                className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Showing top {invoices.length} invoices for {category.category}
              </p>
              <Button
                onClick={handleExpandToListPage}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 w-full sm:w-auto"
                size="sm"
              >
                <FiExternalLink className="w-3 h-3" />
                View All Invoices
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

CategoryInvoicesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  category: PropTypes.shape({
    category: PropTypes.string.isRequired,
    percentage: PropTypes.number.isRequired,
    total_amount: PropTypes.number.isRequired,
  }),
};

export default CategoryInvoicesModal;
