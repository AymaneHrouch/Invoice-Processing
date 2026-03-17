import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fmt = (amount, currency = 'MAD') =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) +
  ' ' +
  currency;

const fmtDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const OverdueBadge = ({ days }) => {
  if (!days) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
      <AlertTriangle className="w-3 h-3" />
      {days}j
    </span>
  );
};

const FinanceTable = ({
  title,
  icon: Icon,
  iconColor,
  items,
  nameKey,
  total,
  overdue_count,
  linkBase,
  emptyText,
}) => (
  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${iconColor}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          {title}
        </CardTitle>
        {overdue_count > 0 && (
          <Badge variant="destructive" className="text-xs">
            {overdue_count} en retard
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {fmt(total)}
      </p>
    </CardHeader>
    <CardContent className="pt-0">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`${linkBase}/${item.id}`}
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {item[nameKey]}
                </p>
                <p className="text-xs text-gray-400">
                  {item.invoice_number} · échéance {fmtDate(item.due_date)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <OverdueBadge days={item.days_overdue} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {fmt(item.total_amount, item.currency)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const FinanceWidgets = ({ aEncaisser, aPayer }) => {
  if (!aEncaisser || !aPayer) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <FinanceTable
        title="À encaisser"
        icon={TrendingUp}
        iconColor="bg-green-500"
        items={aEncaisser.items}
        nameKey="client_name"
        total={aEncaisser.total_amount}
        overdue_count={aEncaisser.overdue_count}
        linkBase="/ventes"
        emptyText="Aucune vente en attente de paiement"
      />
      <FinanceTable
        title="À payer"
        icon={TrendingDown}
        iconColor="bg-orange-500"
        items={aPayer.items}
        nameKey="vendor_name"
        total={aPayer.total_amount}
        overdue_count={aPayer.overdue_count}
        linkBase="/achats"
        emptyText="Aucun achat en attente de paiement"
      />
    </div>
  );
};

export default FinanceWidgets;
