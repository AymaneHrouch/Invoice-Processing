import React from 'react';
import { TrendingUp, TrendingDown, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { Link } from 'react-router-dom';

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const WorkQueueWidgets = ({ stats }) => {
  const { isDarkMode } = useTheme();

  if (!stats) return null;

  const widgets = [
    {
      key: 'ca_ventes',
      title: 'CA Ventes ce mois',
      value: formatAmount(stats.ca_ventes_ce_mois) + ' MAD',
      icon: TrendingUp,
      color: 'green',
      href: '/ventes?status=validated',
    },
    {
      key: 'depenses_achats',
      title: 'Dépenses Achats ce mois',
      value: formatAmount(stats.depenses_achats_ce_mois) + ' MAD',
      icon: TrendingDown,
      color: 'orange',
      href: '/achats',
    },
    {
      key: 'ventes_brouillons',
      title: 'Ventes brouillons',
      value: stats.ventes_brouillons ?? 0,
      icon: FileText,
      color: 'blue',
      href: '/ventes?status=draft',
    },
    {
      key: 'achats_a_valider',
      title: 'Achats à valider',
      value: stats.achats_a_valider ?? 0,
      icon: AlertCircle,
      color: 'amber',
      href: '/achats?status=extracted',
    },
  ];

  const colorClasses = {
    green: {
      icon: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/40',
      border: 'border-green-200 dark:border-green-800',
    },
    orange: {
      icon: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/40',
      border: 'border-orange-200 dark:border-orange-800',
    },
    blue: {
      icon: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      border: 'border-blue-200 dark:border-blue-800',
    },
    amber: {
      icon: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      border: 'border-amber-200 dark:border-amber-800',
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {widgets.map((w) => {
        const Icon = w.icon;
        const colors = colorClasses[w.color];
        return (
          <Link key={w.key} to={w.href}>
            <Card
              className={`bg-white dark:bg-slate-800 border ${colors.border} cursor-pointer hover:shadow-lg transition-shadow`}
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
                      className={`text-2xl font-bold mt-1 ${
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
          </Link>
        );
      })}
    </div>
  );
};

export default WorkQueueWidgets;
