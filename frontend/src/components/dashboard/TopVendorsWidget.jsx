import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { useNavigate } from 'react-router-dom';

const formatAmount = (amount, currency = 'MAD') =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) +
  ' ' +
  currency;

const TopVendorsWidget = ({ title, items = [], direction }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleRowClick = (vendorName) => {
    const base = direction === 'outgoing' ? '/ventes' : '/achats';
    navigate(`${base}?vendor_name=${encodeURIComponent(vendorName)}`);
  };

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const titleClass = isDarkMode ? 'text-white' : 'text-gray-800';
  const subClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const rowClass = isDarkMode
    ? 'border-gray-700 hover:bg-gray-700/50'
    : 'border-gray-100 hover:bg-gray-50';

  return (
    <Card className={`${cardClass} border`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base font-semibold ${titleClass}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className={`px-4 pb-4 text-sm ${subClass}`}>Aucune donnée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`text-xs uppercase tracking-wide ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Factures</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  onClick={() => handleRowClick(item.vendor)}
                  className={`border-t ${rowClass} cursor-pointer`}
                >
                  <td className={`px-4 py-2.5 font-medium ${titleClass}`}>
                    {item.vendor || '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right ${subClass}`}>
                    {item.total_invoices}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">
                    {formatAmount(item.total_amount, item.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

export default TopVendorsWidget;
