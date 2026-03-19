import {
  ShieldCheck,
  ShieldOff,
  Send,
  RotateCcw,
  CircleDollarSign,
  BadgeCheck,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_CONFIG = {
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

const formatTime = (ts) => {
  if (!ts) return '—';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: fr });
  } catch {
    return '—';
  }
};

const RecentActivity = ({ items = [] }) => {
  const { isDarkMode } = useTheme();

  return (
    <Card
      className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" />
          Dernières actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p
            className={`text-sm text-center py-6 italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
          >
            Aucune activité récente.
          </p>
        ) : (
          <div className="space-y-0">
            {items.map((item, i) => {
              const isLast = i === items.length - 1;
              const cfg = ACTION_CONFIG[item.action] || ACTION_CONFIG._default;
              const Icon = cfg.icon;
              const name =
                item.direction === 'outgoing'
                  ? item.client_name || item.vendor_name || '—'
                  : item.vendor_name || '—';

              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    {!isLast && (
                      <div
                        className={`w-px flex-1 my-1 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                      />
                    )}
                  </div>
                  <div className={`pb-4 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                    <p
                      className={`text-sm font-medium leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                    >
                      {cfg.label}
                      {item.invoice_number && (
                        <span
                          className={`ml-1.5 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          {item.invoice_number}
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-xs mt-0.5 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      {name}
                    </p>
                    <p
                      className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                    >
                      {item.user} · {formatTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
