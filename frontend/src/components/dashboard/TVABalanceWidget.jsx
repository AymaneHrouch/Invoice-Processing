import React from 'react';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fmt = (amount) =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MAD';

const TVABalanceWidget = ({ data, loading }) => {
  if (!data) return null;

  const isPositive = data.net >= 0;

  return (
    <Card
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-opacity ${loading ? 'opacity-60' : ''}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          Balance TVA
          <span className="text-xs font-normal text-gray-400 ml-1">
            ({data.quarter_label})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Collectée
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {fmt(data.collectee)}
            </p>
            <p className="text-xs text-gray-400">Ventes</p>
          </div>
          <div className="text-center border-x border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Déductible
            </p>
            <p className="text-lg font-bold text-orange-500 dark:text-orange-400">
              {fmt(data.deductible)}
            </p>
            <p className="text-xs text-gray-400">Achats</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Net à payer
            </p>
            <p
              className={`text-lg font-bold ${isPositive ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {fmt(Math.abs(data.net))}
            </p>
            <p className="text-xs text-gray-400">
              {isPositive ? 'À reverser' : 'Crédit'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TVABalanceWidget;
