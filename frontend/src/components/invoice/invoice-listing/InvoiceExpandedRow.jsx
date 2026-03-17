import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  Send,
  RotateCcw,
  CircleDollarSign,
  BadgeCheck,
  History,
} from 'lucide-react';
import { useTheme } from '@/contexts';
import { formatDate, formatCurrency } from '@/constants';
import { AmountWarningBanner } from '@/components/invoice';
import { fetchInvoiceHistory } from '@/api/invoice';

const HISTORY_CFG = {
  validated: {
    label: 'Validée',
    icon: ShieldCheck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
  },
  invalidated: {
    label: 'Invalidée',
    icon: ShieldOff,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  sent: {
    label: 'Marquée envoyée',
    icon: Send,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
  },
  unmark_sent: {
    label: 'Envoi annulé',
    icon: RotateCcw,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  paid: {
    label: 'Marquée payée',
    icon: CircleDollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  unmark_paid: {
    label: 'Paiement annulé',
    icon: RotateCcw,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  created: {
    label: 'Créée',
    icon: BadgeCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
  },
  _default: {
    label: 'Mis à jour',
    icon: History,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
};

const InvoiceExpandedRow = ({ invoice, colSpan = 13 }) => {
  const { isDarkMode } = useTheme();
  const isArchived = invoice?.is_archived === true;
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const id = invoice?._id || invoice?.id;
    if (!id) return;
    fetchInvoiceHistory(id)
      .then(setHistory)
      .catch(() => {});
  }, [invoice?._id, invoice?.id]);
  const amountWarnings =
    invoice?.status === 'extracted' ? (invoice?.amount_warnings ?? []) : [];

  return (
    <tr
      className={
        isArchived
          ? isDarkMode
            ? 'bg-slate-900 border-l-4 border-slate-600'
            : 'bg-slate-300 border-l-4 border-slate-500'
          : isDarkMode
            ? 'bg-gray-700'
            : 'bg-gray-50'
      }
    >
      <td colSpan={colSpan} className="px-6 py-6">
        <div className="space-y-8">
          {amountWarnings.length > 0 && (
            <AmountWarningBanner warnings={amountWarnings} />
          )}
          <div className="space-y-6">
            <div>
              <h4
                className={`text-lg font-semibold mb-4 pb-2 border-b ${
                  isDarkMode
                    ? 'text-gray-200 border-gray-600'
                    : 'text-gray-800 border-gray-200'
                }`}
              >
                Items
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5
                          className={`text-sm font-semibold ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-800'
                          }`}
                        >
                          {item.name}
                        </h5>
                        <span className="text-green-600 font-semibold text-sm">
                          {formatCurrency(item.total, invoice.currency)}
                        </span>
                      </div>
                      <p
                        className={`text-sm mb-3 leading-relaxed ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        {item.description}
                      </p>
                      <div
                        className={`space-y-1 text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        <span className="block">
                          Unit Price:{' '}
                          {formatCurrency(item.unit_price, invoice.currency)}
                        </span>
                        <span className="block">Quantity: {item.quantity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className={`col-span-full text-center text-sm italic ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    No items
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4
                className={`text-lg font-semibold mb-4 pb-2 border-b ${
                  isDarkMode
                    ? 'text-gray-200 border-gray-600'
                    : 'text-gray-800 border-gray-200'
                }`}
              >
                Additional Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Tags:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {invoice.tags && invoice.tags.length > 0 ? (
                      invoice.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`inline-block text-xs px-2 py-1 rounded-full ${
                            isDarkMode
                              ? 'bg-blue-900 text-blue-200'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span
                        className={`text-xs italic ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        No tags
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Due Date:
                  </label>
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {invoice.invoice_due_date
                      ? formatDate(invoice.invoice_due_date)
                      : 'No due date'}
                  </span>
                </div>
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Created:
                  </label>
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {formatDate(invoice.created_at)}
                  </span>
                </div>
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Updated:
                  </label>
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {invoice.updated_at
                      ? formatDate(invoice.updated_at)
                      : 'Never updated'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Historique */}
          <div>
            <h4
              className={`text-lg font-semibold mb-4 pb-2 border-b flex items-center gap-2 ${
                isDarkMode
                  ? 'text-gray-200 border-gray-600'
                  : 'text-gray-800 border-gray-200'
              }`}
            >
              <History className="w-4 h-4" />
              Historique
              {history.length > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-500'}`}
                >
                  {history.length}
                </span>
              )}
            </h4>
            {history.length === 0 ? (
              <p
                className={`text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
              >
                Aucun historique disponible.
              </p>
            ) : (
              <div className="space-y-0 max-w-sm">
                {history.map((entry, i) => {
                  const isLast = i === history.length - 1;
                  const cfg = HISTORY_CFG[entry.action] || HISTORY_CFG._default;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        </div>
                        {!isLast && (
                          <div
                            className={`w-px flex-1 mt-1 mb-1 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                          />
                        )}
                      </div>
                      <div className="pb-4">
                        <p
                          className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                        >
                          {cfg.label}
                        </p>
                        <p
                          className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          {entry.user}
                          {entry.timestamp && (
                            <>
                              {' '}
                              ·{' '}
                              {new Date(entry.timestamp).toLocaleString(
                                'fr-FR',
                                { dateStyle: 'short', timeStyle: 'short' },
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default InvoiceExpandedRow;
