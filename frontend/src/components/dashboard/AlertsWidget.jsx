import React from 'react';
import { AlertTriangle, Clock, FileOutput } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const fmt = (amount) =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' MAD';

const AlertsWidget = ({ data }) => {
  if (!data) return null;
  const { factures_retard, echeances_proches, non_exportees } = data;

  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-red-500">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          Alertes opérationnelles
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Overdue buckets */}
        {factures_retard?.total_count > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Factures en retard (
              {factures_retard.total_count})
            </p>
            <div className="space-y-1.5">
              {factures_retard.buckets
                .filter((b) => b.count > 0)
                .map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {b.label}
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {b.count} — {fmt(b.total)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Upcoming due */}
        {(echeances_proches?.['7j']?.count > 0 ||
          echeances_proches?.['15j']?.count > 0) && (
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Échéances proches
            </p>
            <div className="space-y-1.5">
              {echeances_proches['7j']?.count > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Dans 7 jours
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {echeances_proches['7j'].count} —{' '}
                    {fmt(echeances_proches['7j'].total)}
                  </span>
                </div>
              )}
              {echeances_proches['15j']?.count > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Dans 15 jours
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {echeances_proches['15j'].count} —{' '}
                    {fmt(echeances_proches['15j'].total)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Non exported */}
        {non_exportees > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <FileOutput className="w-3.5 h-3.5 text-blue-500" />
              Non exportées (comptabilité)
            </span>
            <Link
              to="/achats?status=validated&is_exported=false"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {non_exportees} factures
            </Link>
          </div>
        )}

        {/* No alerts */}
        {factures_retard?.total_count === 0 &&
          echeances_proches?.['7j']?.count === 0 &&
          non_exportees === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">
              Aucune alerte en cours ✓
            </p>
          )}
      </CardContent>
    </Card>
  );
};

export default AlertsWidget;
