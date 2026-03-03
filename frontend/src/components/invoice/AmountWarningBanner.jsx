import { AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts';

/**
 * Shows amount verification warnings when status === 'extracted' and there are mismatches.
 * Do not show when status === 'validated'.
 */
const AmountWarningBanner = ({ warnings = [], className = '' }) => {
  const { isDarkMode } = useTheme();

  if (!warnings || warnings.length === 0) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        isDarkMode
          ? 'bg-amber-900/20 border-amber-700 text-amber-200'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      } ${className}`}
      role="alert"
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Amount verification</p>
        <ul className="mt-1 text-sm list-disc list-inside space-y-0.5">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs opacity-90">Please verify before validating.</p>
      </div>
    </div>
  );
};

export default AmountWarningBanner;
