import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/contexts';
import { fetchDashboardAll } from '@/api/dashboard';
import {
  DashboardHeader,
  WorkQueueWidgets,
  RecentActivity,
  FinanceWidgets,
  TVABalanceWidget,
  TopVendorsWidget,
  DashboardLoading,
  DashboardError,
  CAEvolutionWidget,
  AlertsWidget,
  TresorerieWidget,
  DelaiPaiementWidget,
  CategoryBreakdownWidget,
} from '@/components/dashboard';

const getCurrentBasePeriod = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3),
  };
};

const PERIOD_OPTIONS = [
  { value: 'this_quarter', label: 'Ce trimestre' },
  { value: 'last_quarter', label: 'Trimestre dernier' },
  { value: 'this_year', label: 'Cette année' },
];

const SafeWidget = ({ data, refetch, children }) => {
  // If data is null, undefined, or an array containing null (for multiple data dependencies)
  if (
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.includes(null))
  ) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center h-full min-h-[150px] border border-gray-100 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400 mb-3 text-sm">
          Données indisponibles
        </p>
        <button
          onClick={() => refetch()}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }
  return children;
};

const DashboardPage = () => {
  const { isDarkMode } = useTheme();
  const [tvaPeriod, setTvaPeriod] = useState('this_quarter');
  const [categoryDirection, setCategoryDirection] = useState('incoming');

  const basePeriod = getCurrentBasePeriod();

  const fetchParams = {
    ...basePeriod,
    vendorLimit: 5,
    activityLimit: 15,
    encaisserLimit: 10,
    payerLimit: 10,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardAll', fetchParams],
    queryFn: () => fetchDashboardAll(fetchParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <DashboardLoading />;
  if (error) return <DashboardError error={error.message} onRetry={refetch} />;

  const alertsData =
    data.factures_retard !== null &&
    data.echeances_proches !== null &&
    data.kpis !== null
      ? {
          factures_retard: data.factures_retard,
          echeances_proches: data.echeances_proches,
          non_exportees: data.kpis.non_exportees ?? 0,
        }
      : null;

  return (
    <div
      className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}
    >
      <DashboardHeader />

      <SafeWidget data={data.kpis} refetch={refetch}>
        <WorkQueueWidgets stats={data.kpis} />
      </SafeWidget>

      <div className="mt-6">
        <SafeWidget data={[data.a_encaisser, data.a_payer]} refetch={refetch}>
          <FinanceWidgets aEncaisser={data.a_encaisser} aPayer={data.a_payer} />
        </SafeWidget>
      </div>

      <div className="mb-6 mt-6">
        <SafeWidget data={data.ca_evolution} refetch={refetch}>
          <CAEvolutionWidget data={data.ca_evolution} />
        </SafeWidget>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SafeWidget data={alertsData} refetch={refetch}>
          <AlertsWidget data={alertsData} />
        </SafeWidget>
        <SafeWidget data={data.tresorerie} refetch={refetch}>
          <TresorerieWidget data={data.tresorerie} />
        </SafeWidget>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SafeWidget data={data.delai_paiement} refetch={refetch}>
          <DelaiPaiementWidget data={data.delai_paiement} />
        </SafeWidget>

        <SafeWidget
          data={data.category_breakdown?.[categoryDirection]}
          refetch={refetch}
        >
          <CategoryBreakdownWidget
            data={data.category_breakdown?.[categoryDirection] || []}
            onDirectionChange={setCategoryDirection}
          />
        </SafeWidget>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2
            className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
          >
            Balance TVA
          </h2>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTvaPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tvaPeriod === opt.value
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <SafeWidget data={data.tva_balance?.[tvaPeriod]} refetch={refetch}>
          <TVABalanceWidget
            data={data.tva_balance?.[tvaPeriod]}
            loading={false}
          />
        </SafeWidget>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SafeWidget data={data.top_clients} refetch={refetch}>
          <TopVendorsWidget
            title="Top 5 clients (CA)"
            items={data.top_clients}
            direction="outgoing"
          />
        </SafeWidget>
        <SafeWidget data={data.top_suppliers} refetch={refetch}>
          <TopVendorsWidget
            title="Top 5 fournisseurs (Achats)"
            items={data.top_suppliers}
            direction="incoming"
          />
        </SafeWidget>
      </div>

      <div className="max-w-2xl">
        <SafeWidget data={data.recent_activity} refetch={refetch}>
          <RecentActivity items={data.recent_activity} />
        </SafeWidget>
      </div>
    </div>
  );
};

export default DashboardPage;
