import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ShoppingCart, TrendingUp, FileText } from 'lucide-react';
import { useTheme } from '@/contexts';

const DIRECTION_CONFIG = {
  incoming: { label: 'Achats', icon: ShoppingCart },
  outgoing: { label: 'Ventes', icon: TrendingUp },
  default: { label: 'Invoice Management', icon: FileText },
};

const InvoiceHeader = ({
  invoiceData,
  sortBy,
  order,
  onSort,
  onExport,
  exportLoading,
  searchValue = '',
  onSearchChange,
  direction = null,
}) => {
  const { isDarkMode } = useTheme();
  const { label, icon: Icon } =
    DIRECTION_CONFIG[direction] ?? DIRECTION_CONFIG.default;

  return (
    <div
      className={`flex justify-between items-center mb-8 pb-4 border-b-2 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-7 h-7 ${direction === 'incoming' ? 'text-blue-500' : direction === 'outgoing' ? 'text-green-500' : 'text-gray-500'}`}
        />
        <h2
          className={`text-3xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}
        >
          {label}
        </h2>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {onSearchChange && (
          <div className="flex items-center gap-2">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Search
            </Label>
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Vendor..."
              className={`w-48 h-9 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white'
              }`}
            />
          </div>
        )}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exportLoading || !invoiceData?.total}
            className="flex items-center gap-2"
          >
            <span>↓</span>
            Export ({invoiceData?.total ?? 0} invoices)
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            Sort by:
          </Label>
          <Select value={sortBy} onValueChange={(value) => onSort(value)}>
            <SelectTrigger
              className={`w-48 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white'
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="invoice_date">Invoice Date</SelectItem>
              <SelectItem value="total_amount">Amount</SelectItem>
              <SelectItem value="vendor_name">Vendor</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSort(sortBy)}
            className="px-3"
          >
            {order === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
        <div
          className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Page {invoiceData?.page || 0} of {invoiceData?.totalPages || 0}
          <span
            className={`ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
          >
            ({invoiceData?.total || 0} total invoices)
          </span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
