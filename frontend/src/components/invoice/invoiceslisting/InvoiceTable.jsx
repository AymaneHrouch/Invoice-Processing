import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts";
import { exportToPDF } from "@/constants/exportToPDF";
import { fetchInvoices } from "@/api/invoice";
import InvoiceHeader from "./InvoiceHeader";
import InvoiceFilters from "./InvoiceFilters";
import InvoiceTableHeader from "./InvoiceTableHeader";
import InvoiceRow from "./InvoiceRow";
import InvoiceExpandedRow from "./InvoiceExpandedRow";
import InvoicePagination from "./InvoicePagination";
const InvoiceTable = () => {
  const { isDarkMode } = useTheme();
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Filter states
  const [filters, setFilters] = useState({
    status: "all",
    vendor_name: "",
    category: "all",
  });

  // Separate state for the vendor input to prevent immediate API calls
  const [vendorSearchInput, setVendorSearchInput] = useState("");

  // Debounce hook for vendor search
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  // Debounced vendor search value
  const debouncedVendorSearch = useDebounce(vendorSearchInput, 500); // 500ms delay

  // Update filters when debounced value changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      vendor_name: debouncedVendorSearch,
    }));
    setPage(1);
  }, [debouncedVendorSearch]);

  const toggleRowExpansion = (invoiceId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(invoiceId)) {
      newExpandedRows.delete(invoiceId);
    } else {
      newExpandedRows.add(invoiceId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Fetch data from FastAPI backend using API function
  const handleFetchInvoices = async (
    currentPage = page,
    currentSortBy = sortBy,
    currentOrder = order,
    currentFilters = filters
  ) => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchInvoices(currentPage, perPage, currentSortBy, currentOrder, currentFilters);
      setInvoiceData(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchInvoices(page, sortBy, order, filters);
  }, [page, sortBy, order, filters]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setExpandedRows(new Set());
  };

  const handleSort = (column) => {
    const newOrder = sortBy === column && order === "asc" ? "desc" : "asc";
    setSortBy(column);
    setOrder(newOrder);
    setPage(1);
    setExpandedRows(new Set());
  };

  const handleFilterChange = (filterKey, value) => {
    if (filterKey === "vendor_name") {
      // Handle vendor search separately to avoid immediate API calls
      setVendorSearchInput(value);
      return;
    }

    const newFilters = { ...filters, [filterKey]: value };
    setFilters(newFilters);
    setPage(1); // Reset to first page when filtering
    setExpandedRows(new Set());
  };

  const clearFilters = () => {
    setFilters({ status: "all", vendor_name: "", category: "all" });
    setVendorSearchInput(""); // Also clear the vendor input
    setPage(1);
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto my-8 px-6">
        <Card
          className={`border-0 shadow-lg ${
            isDarkMode ? "bg-gray-800/50" : "bg-white/80"
          } backdrop-blur-sm`}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
              Loading invoices...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-full mx-auto my-8 px-6">
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error loading invoices</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => handleFetchInvoices()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!invoiceData || !invoiceData.data || invoiceData.data.length === 0) {
    return (
      <div className="max-w-full mx-auto my-8 px-6">
        <InvoiceHeader 
          invoiceData={invoiceData} 
          sortBy={sortBy} 
          order={order} 
          onSort={handleSort} 
        />
        <InvoiceFilters 
          filters={filters}
          vendorSearchInput={vendorSearchInput}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTitle className="text-blue-800">No invoices found</AlertTitle>
          <AlertDescription className="text-blue-600">
            {(filters.status && filters.status !== "all") ||
            filters.vendor_name ||
            (filters.category && filters.category !== "all")
              ? "No invoices match the current filters. Try adjusting your search criteria."
              : "There are no invoices to display."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto my-8 px-6">
      <InvoiceHeader 
        invoiceData={invoiceData} 
        sortBy={sortBy} 
        order={order} 
        onSort={handleSort} 
      />

      <InvoiceFilters 
        filters={filters}
        vendorSearchInput={vendorSearchInput}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      <div
        className={`overflow-x-auto rounded-lg border shadow-lg ${
          isDarkMode
            ? "border-gray-700 bg-gray-800"
            : "border-gray-200 bg-white"
        }`}
      >
        <table className="w-full border-collapse text-sm">
          <InvoiceTableHeader />
          <tbody>
            {invoiceData.data.flatMap((invoice) => [
              <InvoiceRow
                key={`${invoice.id || invoice._id}-main`}
                invoice={invoice}
                isExpanded={expandedRows.has(invoice.id || invoice._id)}
                onToggleExpand={toggleRowExpansion}
                onExportPDF={exportToPDF}
              />,
              ...(expandedRows.has(invoice.id || invoice._id)
                ? [
                    <InvoiceExpandedRow
                      key={`${invoice.id || invoice._id}-expanded`}
                      invoice={invoice}
                    />,
                  ]
                : []),
            ])}
          </tbody>
        </table>
      </div>

      <InvoicePagination 
        invoiceData={invoiceData}
        loading={loading}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default InvoiceTable;
