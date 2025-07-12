import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { useTheme } from "@/contexts";
import {
  formatDate,
  formatCurrency,
  getCategoryColor,
  getSourceIcon,
} from "@/constants";
import { exportToPDF } from "@/constants/exportToPDF";
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

  // Fetch data from FastAPI backend
  const fetchInvoices = async (
    currentPage = page,
    currentSortBy = sortBy,
    currentOrder = order,
    filters = {}
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: currentSortBy,
        order: currentOrder,
      });

      // Add filters if they exist
      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.vendor_name)
        params.append("vendor_name", filters.vendor_name);
      if (filters.category && filters.category !== "all")
        params.append("category", filters.category);

      const response = await fetch(`http://localhost:8000/invoices/?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const invoicesList = await response.json();

      // Navigation
      const total = parseInt(response.headers.get("X-Total-Count") || "0");
      const totalPages = parseInt(response.headers.get("X-Total-Pages") || "1");
      const hasNext = response.headers.get("X-Has-Next") === "true";
      const hasPrev = response.headers.get("X-Has-Prev") === "true";

      // Format the data to match the expected structure
      const formattedData = {
        page: currentPage,
        perPage: perPage,
        total: total,
        totalPages: totalPages,
        hasNext: hasNext,
        hasPrev: hasPrev,
        data: invoicesList,
      };

      setInvoiceData(formattedData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(page, sortBy, order, filters);
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
        <Button onClick={() => fetchInvoices()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!invoiceData || !invoiceData.data || invoiceData.data.length === 0) {
    return (
      <div className="max-w-full mx-auto my-8 px-6">
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
              <Select
                value={sortBy}
                onValueChange={(value) => handleSort(value)}
              >
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
                  <SelectItem key="created_at" value="created_at">
                    Created Date
                  </SelectItem>
                  <SelectItem key="invoice_date" value="invoice_date">
                    Invoice Date
                  </SelectItem>
                  <SelectItem key="status" value="status">
                    Status
                  </SelectItem>
                  <SelectItem key="total_amount" value="total_amount">
                    Amount
                  </SelectItem>
                  <SelectItem key="vendor_name" value="vendor_name">
                    Vendor
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort(sortBy)}
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
              Page 0 of 0
              <span
                className={`ml-2 ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                (0 total invoices)
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card
          className={`mb-6 border-0 shadow-lg ${
            isDarkMode ? "bg-gray-800/50" : "bg-white/80"
          } backdrop-blur-sm`}
        >
          <CardHeader>
            <CardTitle className={isDarkMode ? "text-white" : "text-gray-800"}>
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger
                    className={`h-11 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white"
                    }`}
                  >
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">
                      All Statuses
                    </SelectItem>
                    <SelectItem key="pending" value="pending">
                      Pending
                    </SelectItem>
                    <SelectItem key="processed" value="processed">
                      Processed
                    </SelectItem>
                    <SelectItem key="paid" value="paid">
                      Paid
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  Vendor
                </Label>
                <Input
                  value={vendorSearchInput}
                  onChange={(e) =>
                    handleFilterChange("vendor_name", e.target.value)
                  }
                  placeholder="Search vendor..."
                  className={`h-11 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  Category
                </Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    handleFilterChange("category", value)
                  }
                >
                  <SelectTrigger
                    className={`h-11 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white"
                    }`}
                  >
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all-cat" value="all">
                      All Categories
                    </SelectItem>
                    <SelectItem key="software" value="Software">
                      Software
                    </SelectItem>
                    <SelectItem key="hardware" value="Hardware">
                      Hardware
                    </SelectItem>
                    <SelectItem
                      key="professional"
                      value="Professional Services"
                    >
                      Professional Services
                    </SelectItem>
                    <SelectItem key="consulting" value="Consulting">
                      Consulting
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="h-11"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
            <Select value={sortBy} onValueChange={(value) => handleSort(value)}>
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
                <SelectItem key="created_at-main" value="created_at">
                  Created Date
                </SelectItem>
                <SelectItem key="invoice_date-main" value="invoice_date">
                  Invoice Date
                </SelectItem>
                <SelectItem key="total_amount-main" value="total_amount">
                  Amount
                </SelectItem>
                <SelectItem key="vendor_name-main" value="vendor_name">
                  Vendor
                </SelectItem>
                <SelectItem key="status-main" value="status">
                  Status
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort(sortBy)}
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
            Page {invoiceData.page} of {invoiceData.totalPages}
            <span
              className={`ml-2 ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              ({invoiceData.total} total invoices)
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card
        className={`mb-6 border-0 shadow-lg ${
          isDarkMode ? "bg-gray-800/50" : "bg-white/80"
        } backdrop-blur-sm`}
      >
        <CardHeader>
          <CardTitle className={isDarkMode ? "text-white" : "text-gray-800"}>
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Status
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger
                  className={`h-11 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white"
                  }`}
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-main" value="all">
                    All Statuses
                  </SelectItem>
                  <SelectItem key="pending-main" value="pending">
                    Pending
                  </SelectItem>
                  <SelectItem key="processed-main" value="processed">
                    Processed
                  </SelectItem>
                  <SelectItem key="paid-main" value="paid">
                    Paid
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Vendor
              </Label>
              <Input
                value={vendorSearchInput}
                onChange={(e) =>
                  handleFilterChange("vendor_name", e.target.value)
                }
                placeholder="Search vendor..."
                className={`h-11 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Category
              </Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger
                  className={`h-11 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white"
                  }`}
                >
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-cat-main" value="all">
                    All Categories
                  </SelectItem>
                  <SelectItem key="software-main" value="Software">
                    Software
                  </SelectItem>
                  <SelectItem key="hardware-main" value="Hardware">
                    Hardware
                  </SelectItem>
                  <SelectItem
                    key="professional-main"
                    value="Professional Services"
                  >
                    Professional Services
                  </SelectItem>
                  <SelectItem key="consulting-main" value="Consulting">
                    Consulting
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="h-11">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className={`overflow-x-auto rounded-lg border shadow-lg ${
          isDarkMode
            ? "border-gray-700 bg-gray-800"
            : "border-gray-200 bg-white"
        }`}
      >
        <table className="w-full border-collapse text-sm">
          <thead className={isDarkMode ? "bg-gray-700" : "bg-gray-50"}>
            <tr>
              <th
                className={`px-3 py-4 text-left font-semibold border-b ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              ></th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Invoice #
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Vendor
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Date
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap w-24 ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Status
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Amount
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap w-32 ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Category
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Source
              </th>
              <th
                className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
                  isDarkMode
                    ? "text-gray-300 border-gray-600"
                    : "text-gray-600 border-gray-200"
                }`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.data.flatMap((invoice) => [
              <tr
                key={`${invoice.id || invoice._id}-main`}
                className={`transition-colors ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                }`}
              >
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleRowExpansion(invoice.id || invoice._id)
                    }
                    aria-label={
                      expandedRows.has(invoice.id || invoice._id)
                        ? "Collapse"
                        : "Expand"
                    }
                    className={`p-1 h-6 w-6 ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200 hover:bg-gray-600"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {expandedRows.has(invoice.id || invoice._id) ? "▼" : "▶"}
                  </Button>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    {invoice.invoice_number}
                  </span>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <div>
                    <span
                      className={`font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {invoice.vendor_name}
                    </span>
                  </div>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    {formatDate(invoice.invoice_date)}
                  </span>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle w-24 ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <Badge
                    variant={
                      invoice.status?.toLowerCase() === "paid"
                        ? "default"
                        : invoice.status?.toLowerCase() === "processed"
                        ? "secondary"
                        : "outline"
                    }
                    className="min-w-[70px] text-center justify-center"
                  >
                    {invoice.status}
                  </Badge>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <span className="font-semibold text-green-600 text-base">
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </span>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle w-32 ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: getCategoryColor(invoice.category),
                      color: "white",
                    }}
                    className="text-white font-medium text-xs uppercase tracking-wide min-w-[90px] text-center justify-center"
                  >
                    {invoice.category}
                  </Badge>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {getSourceIcon(invoice.source_type)} {invoice.source_type}
                  </span>
                </td>
                <td
                  className={`px-3 py-4 border-b align-middle ${
                    isDarkMode ? "border-gray-600" : "border-gray-100"
                  }`}
                >
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 ${
                        isDarkMode
                          ? "border-blue-400 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
                          : ""
                      }`}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 ${
                        isDarkMode
                          ? "border-green-400 text-green-400 hover:bg-green-900/20 hover:text-green-300"
                          : ""
                      }`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        exportToPDF(invoice);
                      }}
                    >
                      pdf
                    </Button>
                  </div>
                </td>
              </tr>,

              ...(expandedRows.has(invoice.id || invoice._id)
                ? [
                    <tr
                      key={`${invoice.id || invoice._id}-expanded`}
                      className={isDarkMode ? "bg-gray-700" : "bg-gray-50"}
                    >
                      <td colSpan="9" className="px-6 py-6">
                        <div className="space-y-8">
                          <div className="space-y-6">
                            <div>
                              <h4
                                className={`text-lg font-semibold mb-4 pb-2 border-b ${
                                  isDarkMode
                                    ? "text-gray-200 border-gray-600"
                                    : "text-gray-800 border-gray-200"
                                }`}
                              >
                                Items
                              </h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {invoice.items.map((item, index) => (
                                  <div
                                    key={index}
                                    className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                                      isDarkMode
                                        ? "bg-gray-800 border-gray-600"
                                        : "bg-white border-gray-200"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <h5
                                        className={`text-sm font-semibold ${
                                          isDarkMode
                                            ? "text-gray-200"
                                            : "text-gray-800"
                                        }`}
                                      >
                                        {item.name}
                                      </h5>
                                      <span className="text-green-600 font-semibold text-sm">
                                        {formatCurrency(
                                          item.total,
                                          invoice.currency
                                        )}
                                      </span>
                                    </div>
                                    <p
                                      className={`text-sm mb-3 leading-relaxed ${
                                        isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {item.description}
                                    </p>
                                    <div
                                      className={`space-y-1 text-xs ${
                                        isDarkMode
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      <span className="block">
                                        Unit Price:{" "}
                                        {formatCurrency(
                                          item.unit_price,
                                          invoice.currency
                                        )}
                                      </span>
                                      <span className="block">
                                        Quantity: {item.quantity}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4
                                className={`text-lg font-semibold mb-4 pb-2 border-b ${
                                  isDarkMode
                                    ? "text-gray-200 border-gray-600"
                                    : "text-gray-800 border-gray-200"
                                }`}
                              >
                                Additional Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                  <label
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    Notes:
                                  </label>
                                  <span
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {invoice.notes}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <label
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    Tags:
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {invoice.tags.map((tag, index) => (
                                      <span
                                        key={index}
                                        className={`inline-block text-xs px-2 py-1 rounded-full ${
                                          isDarkMode
                                            ? "bg-blue-900 text-blue-200"
                                            : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    Created:
                                  </label>
                                  <span
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {formatDate(invoice.created_at)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <label
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    Updated:
                                  </label>
                                  <span
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {formatDate(invoice.updated_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>,
                  ]
                : []),
            ])}
          </tbody>
        </table>
      </div>

      <div
        className={`flex justify-between items-center mt-6 pt-4 border-t ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <Button
          variant="outline"
          disabled={!invoiceData.hasPrev || loading}
          onClick={() => handlePageChange(invoiceData.page - 1)}
          className="px-6 py-2"
        >
          Previous
        </Button>
        <span
          className={`text-sm px-4 py-2 rounded-full ${
            isDarkMode
              ? "text-gray-300 bg-gray-700"
              : "text-gray-600 bg-gray-50"
          }`}
        >
          Page {invoiceData.page} of {invoiceData.totalPages}
        </span>
        <Button
          variant="outline"
          disabled={!invoiceData.hasNext || loading}
          onClick={() => handlePageChange(invoiceData.page + 1)}
          className="px-6 py-2"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default InvoiceTable;
