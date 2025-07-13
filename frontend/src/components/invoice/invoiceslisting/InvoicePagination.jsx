import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts";

const InvoicePagination = ({ 
  invoiceData, 
  loading, 
  onPageChange 
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`flex justify-between items-center mt-6 pt-4 border-t ${
        isDarkMode ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <Button
        variant="outline"
        disabled={!invoiceData.hasPrev || loading}
        onClick={() => onPageChange(invoiceData.page - 1)}
        className="px-6 py-2"
      >
        Previous
      </Button>
      <span
        className={`text-sm px-4 py-2 rounded-full ${
          isDarkMode ? "text-gray-300 bg-gray-700" : "text-gray-600 bg-gray-50"
        }`}
      >
        Page {invoiceData.page} of {invoiceData.totalPages}
      </span>
      <Button
        variant="outline"
        disabled={!invoiceData.hasNext || loading}
        onClick={() => onPageChange(invoiceData.page + 1)}
        className="px-6 py-2"
      >
        Next
      </Button>
    </div>
  );
};

export default InvoicePagination;
