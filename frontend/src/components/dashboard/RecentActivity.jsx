import React from 'react';
import { FiCheckCircle, FiUpload, FiAlertTriangle } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const RecentActivity = ({ items = [] }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const getIcon = (item) => {
    if (item.status === 'failed') return FiAlertTriangle;
    if (item.is_exported) return FiUpload;
    return FiCheckCircle;
  };

  const getIconColor = (item) => {
    if (item.status === 'failed') return 'text-red-500';
    if (item.is_exported) return 'text-gray-500';
    return 'text-green-500';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return formatDistanceToNow(d, { addSuffix: true, locale: fr });
    } catch {
      return '—';
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Activité récente
          </CardTitle>
          <Button variant="outline" size="sm">
            <Link to="/invoices/list">Tout voir</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = getIcon(item);
              const iconColor = getIconColor(item);
              const label =
                item.status === 'failed'
                  ? 'Extraction échouée'
                  : item.is_exported
                    ? 'Exporté'
                    : item.status === 'validated'
                      ? 'Validé'
                      : 'Extrait';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/invoices/list?edit=${item.id}`)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    isDarkMode
                      ? 'border-gray-700 hover:bg-gray-800'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                    <div>
                      <p
                        className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {item.invoice_number || item.vendor_name || '—'}
                      </p>
                      {item.vendor_name && (
                        <p
                          className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {item.vendor_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {label}
                    </p>
                    <p
                      className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(item.updated_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p
              className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Aucune activité récente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
