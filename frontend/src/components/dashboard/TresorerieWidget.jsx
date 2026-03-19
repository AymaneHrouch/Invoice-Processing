import React from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fmt = (amount) =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' MAD';

const TresorerieWidget = ({ data }) => {
  if (!data) return null;

  const windows = [
    { key: '30j', label: '30 jours' },
    { key: '60j', label: '60 jours' },
    { key: '90j', label: '90 jours' },
  ];

  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          Prévision de trésorerie
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4">
          {windows.map(({ key, label }) => {
            const enc = data[key]?.encaissements?.total ?? 0;
            const dec = data[key]?.decaissements?.total ?? 0;
            const net = enc - dec;
            return (
              <div key={key} className="text-center">
                <p className="text-xs text-gray-400 mb-2 font-medium">
                  {label}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ↑ {fmt(enc)}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                  ↓ {fmt(dec)}
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-700">
                  <p
                    className={`text-sm font-bold ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {net >= 0 ? '+' : ''}
                    {fmt(net)}
                  </p>
                  <p className="text-xs text-gray-400">Net</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TresorerieWidget;
