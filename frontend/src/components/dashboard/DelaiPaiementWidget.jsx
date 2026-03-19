import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DelaiPaiementWidget = ({ data }) => {
  if (!data) return null;

  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-500">
            <Clock className="w-4 h-4 text-white" />
          </div>
          Délai moyen de paiement
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Encaissement clients
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data.delai_encaissement ?? '—'}
            </p>
            <p className="text-xs text-gray-400">jours</p>
          </div>
          <div className="text-center border-l border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Règlement fournisseurs
            </p>
            <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">
              {data.delai_reglement ?? '—'}
            </p>
            <p className="text-xs text-gray-400">jours</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DelaiPaiementWidget;
