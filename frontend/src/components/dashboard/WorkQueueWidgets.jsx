import React from 'react';
import {
  FiFileText,
  FiCheckCircle,
  FiUpload,
  FiDownload,
} from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { Link } from 'react-router-dom';

const WorkQueueWidgets = ({ stats }) => {
  const { isDarkMode } = useTheme();

  if (!stats) return null;

  const widgets = [
    {
      key: 'all_invoices',
      title: 'Toutes les factures',
      value: stats.all_invoices ?? 0,
      icon: FiFileText,
      color: 'slate',
      href: '/invoices/list',
      clickable: true,
    },
    {
      key: 'to_validate',
      title: 'À valider',
      value: stats.to_validate ?? 0,
      icon: FiCheckCircle,
      color: 'blue',
      href: '/invoices/list?status=extracted',
      clickable: true,
    },
    {
      key: 'ready_to_export',
      title: 'Prêt à exporter',
      value: stats.ready_to_export ?? 0,
      icon: FiUpload,
      color: 'green',
      href: '/invoices/list?status=validated&is_exported=false',
      clickable: true,
    },
    {
      key: 'exported_this_month',
      title: 'Exporté ce mois',
      value: stats.exported_this_month ?? 0,
      icon: FiDownload,
      color: 'gray',
      href: '/invoices/list?is_exported=true',
      clickable: true,
    },
  ];

  const colorClasses = {
    slate: {
      icon: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-900',
      border: 'border-slate-200 dark:border-slate-700',
    },
    blue: {
      icon: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900',
      border: 'border-blue-200 dark:border-blue-800',
    },
    green: {
      icon: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900',
      border: 'border-green-200 dark:border-green-800',
    },
    gray: {
      icon: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-200 dark:border-gray-700',
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {widgets.map((w) => {
        const Icon = w.icon;
        const colors = colorClasses[w.color];
        const content = (
          <Card
            className={`bg-white dark:bg-slate-800 border ${colors.border} ${
              w.clickable
                ? 'cursor-pointer hover:shadow-lg transition-shadow'
                : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {w.title}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {w.value}
                  </p>
                </div>
                <div className={`p-3 ${colors.bg} rounded-full`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );

        return w.clickable ? (
          <Link key={w.key} to={w.href}>
            {content}
          </Link>
        ) : (
          <div key={w.key}>{content}</div>
        );
      })}
    </div>
  );
};

export default WorkQueueWidgets;
