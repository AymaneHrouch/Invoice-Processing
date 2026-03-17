import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts';
import { getInvoiceStats } from '@/api/invoice';
import { getAEncaisser, getAPayer, getTvaBalance } from '@/api/dashboard';
import {
  DashboardHeader,
  WorkQueueWidgets,
  RecentActivity,
  FinanceWidgets,
  TVABalanceWidget,
  DashboardLoading,
  DashboardError,
} from '@/components/dashboard';

const DashboardPage = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workQueueData, setWorkQueueData] = useState(null);
  const [aEncaisser, setAEncaisser] = useState(null);
  const [aPayer, setAPayer] = useState(null);
  const [tvaBalance, setTvaBalance] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [queue, encaisser, payer, tva] = await Promise.all([
          getInvoiceStats(),
          getAEncaisser(),
          getAPayer(),
          getTvaBalance(),
        ]);
        setWorkQueueData(queue);
        setAEncaisser(encaisser);
        setAPayer(payer);
        setTvaBalance(tva);
      } catch (err) {
        setError(err.message);
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

      <WorkQueueWidgets stats={workQueueData} />

      <FinanceWidgets aEncaisser={aEncaisser} aPayer={aPayer} />

      <div className="mb-6">
        <TVABalanceWidget data={tvaBalance} />
      </div>

      <div className="max-w-2xl">
        <RecentActivity items={workQueueData?.recent_activity ?? []} />
      </div>
    </div>
  );
};

export default DashboardPage;
