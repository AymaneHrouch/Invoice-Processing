import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts";

const InvoiceHeader = ({ 
  invoiceData, 
  sortBy, 
  order, 
  onSort 
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`flex justify-between items-center mb-8 pb-4 border-b-2 ${
        isDarkMode ? "border-gray-700" : "border-gray-100"
      }`}
    >
      <h2
        className={`text-3xl font-bold ${
          isDarkMode ? "text-white" : "text-gray-800"
        }`}
      >
        Invoice Management
      </h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
            Sort by:
          </Label>
          <Select value={sortBy} onValueChange={(value) => onSort(value)}>
            <SelectTrigger
              className={`w-48 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white"
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
            {order === "asc" ? "↑" : "↓"}
          </Button>
        </div>
        <div
          className={`text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Page {invoiceData?.page || 0} of {invoiceData?.totalPages || 0}
          <span
            className={`ml-2 ${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            ({invoiceData?.total || 0} total invoices)
          </span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
