import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts';
import {
  getPmeKpis,
  getTopVendors,
  getAEncaisser,
  getAPayer,
  getTvaBalance,
  getRecentActivity,
} from '@/api/dashboard';
import {
  DashboardHeader,
  WorkQueueWidgets,
  RecentActivity,
  FinanceWidgets,
  TVABalanceWidget,
  TopVendorsWidget,
  DashboardLoading,
  DashboardError,
} from '@/components/dashboard';

// Compute year/quarter params from a period key
const getPeriodParams = (period) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3); // 0-based

  if (period === 'this_quarter') {
    return { year: currentYear, quarter: currentQuarter };
  }
  if (period === 'last_quarter') {
    const q = currentQuarter - 1;
    if (q < 0) return { year: currentYear - 1, quarter: 3 };
    return { year: currentYear, quarter: q };
  }
  if (period === 'this_year') {
    return { year: currentYear }; // no quarter = full year
  }
  return { year: currentYear, quarter: currentQuarter };
};

const PERIOD_OPTIONS = [
  { value: 'this_quarter', label: 'Ce trimestre' },
  { value: 'last_quarter', label: 'Trimestre dernier' },
  { value: 'this_year', label: 'Cette année' },
];

const DashboardPage = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pmeKpis, setPmeKpis] = useState(null);
  const [aEncaisser, setAEncaisser] = useState(null);
  const [aPayer, setAPayer] = useState(null);
  const [tvaBalance, setTvaBalance] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tvaPeriod, setTvaPeriod] = useState('this_quarter');
  const [tvaLoading, setTvaLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const periodParams = getPeriodParams('this_quarter');
        const [kpis, encaisser, payer, tva, clients, suppliers, activity] =
          await Promise.all([
            getPmeKpis(),
            getAEncaisser(),
            getAPayer(),
            getTvaBalance(periodParams),
            getTopVendors(5, 'outgoing'),
            getTopVendors(5, 'incoming'),
            getRecentActivity(15),
          ]);
        setPmeKpis(kpis);
        setAEncaisser(encaisser);
        setAPayer(payer);
        setTvaBalance(tva);
        setTopClients(clients);
        setTopSuppliers(suppliers);
        setRecentActivity(activity);
      } catch (err) {
        setError(err.message);
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePeriodChange = useCallback(async (period) => {
    setTvaPeriod(period);
    setTvaLoading(true);
    try {
      const params = getPeriodParams(period);
      const tva = await getTvaBalance(params);
      setTvaBalance(tva);
    } catch (err) {
      console.error('TVA balance fetch error:', err);
    } finally {
      setTvaLoading(false);
    }
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <DashboardError error={error} onRetry={() => window.location.reload()} />
    );
  }

  return (
    <div
      className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}
    >
      <DashboardHeader />

      <WorkQueueWidgets stats={pmeKpis} />

      <FinanceWidgets aEncaisser={aEncaisser} aPayer={aPayer} />

      {/* TVA Balance with period selector */}
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
                onClick={() => handlePeriodChange(opt.value)}
                disabled={tvaLoading}
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
        <TVABalanceWidget data={tvaBalance} loading={tvaLoading} />
      </div>

      {/* Top 5 clients & fournisseurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TopVendorsWidget
          title="Top 5 clients (CA)"
          items={topClients}
          direction="outgoing"
        />
        <TopVendorsWidget
          title="Top 5 fournisseurs (Achats)"
          items={topSuppliers}
          direction="incoming"
        />
      </div>

      <div className="max-w-2xl">
        <RecentActivity items={recentActivity} />
      </div>
    </div>
  );
};

export default DashboardPage;
