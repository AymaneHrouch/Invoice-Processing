import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts';

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const InvoicePagination = ({
  invoiceData,
  loading,
  onPageChange,
  perPage = 10,
  onPerPageChange,
}) => {
  const { isDarkMode } = useTheme();

  const selectClass = `h-8 rounded-md border px-2 text-sm ${
    isDarkMode
      ? 'bg-gray-700 border-gray-600 text-gray-200'
      : 'bg-white border-gray-300 text-gray-700'
  }`;

  return (
    <div
      className={`flex justify-between items-center mt-6 pt-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <Button
        variant="outline"
        disabled={!invoiceData.hasPrev || loading}
        onClick={() => onPageChange(invoiceData.page - 1)}
        className="px-6 py-2"
      >
        Précédent
      </Button>

      <div className="flex items-center gap-4">
        <span
          className={`text-sm px-4 py-2 rounded-full ${
            isDarkMode
              ? 'text-gray-300 bg-gray-700'
              : 'text-gray-600 bg-gray-50'
          }`}
        >
          Page {invoiceData.page} sur {invoiceData.totalPages}
          {invoiceData.total != null && (
            <span className="ml-2 opacity-60">({invoiceData.total} total)</span>
          )}
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Lignes&nbsp;:
            </span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className={selectClass}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        disabled={!invoiceData.hasNext || loading}
        onClick={() => onPageChange(invoiceData.page + 1)}
        className="px-6 py-2"
      >
        Suivant
      </Button>
    </div>
  );
};

export default InvoicePagination;
