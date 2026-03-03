import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { exportToPDF } from '@/constants/exportToPDF';
import { fetchInvoices, getInvoiceById, updateInvoice, batchUpdateInvoices, exportInvoices } from '@/api/invoice';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  EditInvoice,
  InvoicePagination,
  InvoiceHeader,
  InvoiceFilters,
  InvoiceTableHeader,
  InvoiceRow,
  InvoiceExpandedRow,
} from '@/components';
import { useDeleteInvoice } from '@/hooks/useDeleteInvoice';
import { toast } from 'sonner';

const InvoiceListPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const initialStatus = searchParams.get('status') || 'all';
  const initialIsExported = searchParams.get('is_exported') ?? 'all';
  const initialVendorName = searchParams.get('vendor_name') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const editInvoiceId = searchParams.get('edit');
  const initialSortBy = searchParams.get('sort_by') || 'created_at';
  const initialOrder = searchParams.get('order') || 'desc';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [perPage] = useState(10);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [order, setOrder] = useState(initialOrder);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Filter states
  const [filters, setFilters] = useState({
    status: initialStatus,
    is_exported: initialIsExported,
    vendor_name: initialVendorName,
    category: initialCategory,
  });

  // Separate state for the vendor input to prevent immediate API calls
  const [vendorSearchInput, setVendorSearchInput] = useState(initialVendorName);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedInvoice(null);
    if (editInvoiceId) {
      const params = new URLSearchParams(location.search);
      params.delete('edit');
      if (params.toString()) {
        navigate({ search: params.toString() }, { replace: true });
      } else {
        navigate({ search: '' }, { replace: true });
      }
    }
  };

  // ✅ OPTIMISATION: Mise à jour locale au lieu de recharger tout
  const handleEditSuccess = (updatedInvoice) => {
    console.log('✅ Invoice updated locally:', updatedInvoice);

    // Mettre à jour la liste des factures localement
    const updatedId = updatedInvoice._id || updatedInvoice.id;
    setInvoiceData((prevData) => ({
      ...prevData,
      data: prevData.data.map((invoice) =>
        (invoice._id || invoice.id) === updatedId ? updatedInvoice : invoice,
      ),
    }));

    if (selectedInvoice && (selectedInvoice._id || selectedInvoice.id) === updatedId) {
      setSelectedInvoice(updatedInvoice);
    }

    closeEditModal();
  };

  const handleSelect = (invoiceId, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(invoiceId);
      else next.delete(invoiceId);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (!invoiceData?.data) return;
    if (checked) {
      setSelectedIds(
        new Set(invoiceData.data.map((inv) => inv.id || inv._id)),
      );
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleUpdateField = async (invoiceId, payload) => {
    const updated = await updateInvoice(invoiceId, payload);
    return updated;
  };

  const handleBatchUpdate = async (updates) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const result = await batchUpdateInvoices([...selectedIds], updates);
      toast.success(result.message || `Updated ${result.updated_count} invoice(s)`);
      setSelectedIds(new Set());
      handleFetchInvoices(page, sortBy, order, filters);
    } catch (err) {
      toast.error(err.message || 'Batch update failed');
    } finally {
      setBatchLoading(false);
    }
  };

  // ✅ OPTIMISATION: Mise à jour locale pour la suppression
  const handleDeleteSuccess = (deletedInvoiceId) => {
    // Mettre à jour la liste localement
    setInvoiceData((prevData) => ({
      ...prevData,
      data: prevData.data.filter(
        (invoice) =>
          invoice._id !== deletedInvoiceId && invoice.id !== deletedInvoiceId,
      ),
      total: prevData.total - 1,
    }));

    // Supprimer de la liste des lignes étendues
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      newSet.delete(deletedInvoiceId);
      return newSet;
    });
  };

  const {
    removeInvoice,
    loading: deleteLoading,
    error: deleteError,
    message: deleteMessage,
  } = useDeleteInvoice();

  const handleDeleteInvoice = async (invoice) => {
    const invoiceId = invoice._id || invoice.id;
    const success = await removeInvoice(invoiceId);

    if (success) {
      toast.success(deleteMessage || 'Invoice deleted successfully!');
      handleDeleteSuccess(invoiceId); // ✅ Mise à jour locale
    } else {
      toast.error(deleteError || 'Admin Access Required');
    }
  };

  // ✅ FONCTION: Mise à jour d'une facture spécifique (utilisée par InvoiceRow)
  const handleUpdateInvoice = (updatedInvoice) => {
    console.log('🔄 Updating invoice locally from row:', updatedInvoice);

    setInvoiceData((prevData) => ({
      ...prevData,
      data: prevData.data.map((invoice) =>
        (invoice._id || invoice.id) === (updatedInvoice._id || updatedInvoice.id)
          ? updatedInvoice
          : invoice,
      ),
    }));
  };

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

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all')
      params.set('status', filters.status);
    if (filters.is_exported && filters.is_exported !== 'all')
      params.set('is_exported', filters.is_exported);
    if (filters.vendor_name) params.set('vendor_name', filters.vendor_name);
    if (filters.category && filters.category !== 'all')
      params.set('category', filters.category);
    if (sortBy && sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (order && order !== 'desc') params.set('order', order);
    if (page && page !== 1) params.set('page', page);
    // Only push if different
    if (params.toString() !== location.search.replace(/^\?/, '')) {
      navigate({ search: params.toString() }, { replace: false });
    }
  }, [filters, sortBy, order, page]);

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
    currentFilters = filters,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchInvoices(
        currentPage,
        perPage,
        currentSortBy,
        currentOrder,
        currentFilters,
      );
      setInvoiceData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchInvoices(page, sortBy, order, filters);
  }, [page, sortBy, order, filters]);

  // Open edit modal when navigating from dashboard with ?edit=invoice_id
  useEffect(() => {
    if (!editInvoiceId) return;
    const openInvoiceForEdit = async () => {
      try {
        const invoice = await getInvoiceById(editInvoiceId);
        setSelectedInvoice(invoice);
        setEditModalOpen(true);
      } catch (err) {
        console.error('Failed to load invoice for edit:', err);
      }
    };
    openInvoiceForEdit();
  }, [editInvoiceId]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setExpandedRows(new Set());
  };

  const handleSort = (column) => {
    const newOrder = sortBy === column && order === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setOrder(newOrder);
    setPage(1);
    setExpandedRows(new Set());
  };

  const handleFilterChange = (filterKey, value) => {
    if (filterKey === 'vendor_name') {
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
    setFilters({ status: 'all', is_exported: 'all', vendor_name: '', category: 'all' });
    setVendorSearchInput(''); // Also clear the vendor input
    setPage(1);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportInvoices(filters);
      toast.success('Invoices exported successfully');
      handleFetchInvoices(page, sortBy, order, filters);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const editModal = editModalOpen && selectedInvoice && (
    <EditInvoice
      open={editModalOpen}
      onClose={closeEditModal}
      invoice={selectedInvoice}
      onSuccess={handleEditSuccess}
    />
  );

  if (loading) {
    return (
      <>
        <div className="max-w-full mx-auto my-8 px-6">
          <Card
            className={`border-0 shadow-lg ${
              isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } backdrop-blur-sm`}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Loading invoices...
              </p>
            </CardContent>
          </Card>
        </div>
        {editModal}
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="max-w-full mx-auto my-8 px-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error loading invoices</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => handleFetchInvoices()} className="mt-4">
            Retry
          </Button>
        </div>
        {editModal}
      </>
    );
  }

  if (!invoiceData || !invoiceData.data || invoiceData.data.length === 0) {
    return (
      <>
        <div className="max-w-full mx-auto my-8 px-6">
        <InvoiceHeader
          invoiceData={invoiceData}
          sortBy={sortBy}
          order={order}
          onSort={handleSort}
          onExport={handleExport}
          exportLoading={exportLoading}
        />
        <InvoiceFilters
          filters={filters}
          vendorSearchInput={vendorSearchInput}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
        <Alert
          className={
            isDarkMode
              ? 'border-blue-900 bg-gray-800'
              : 'border-blue-200 bg-blue-50'
          }
        >
          <AlertTitle
            className={isDarkMode ? 'text-blue-300' : 'text-blue-800'}
          >
            No invoices found
          </AlertTitle>
          <AlertDescription
            className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}
          >
            {(filters.status && filters.status !== 'all') ||
            filters.vendor_name ||
            (filters.category && filters.category !== 'all')
              ? 'No invoices match the current filters. Try adjusting your search criteria.'
              : 'There are no invoices to display.'}
          </AlertDescription>
        </Alert>
      </div>
        {editModal}
      </>
    );
  }

  return (
    <div className="max-w-full mx-auto my-8 px-6">
      <InvoiceHeader
        invoiceData={invoiceData}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        onExport={handleExport}
        exportLoading={exportLoading}
      />

      <InvoiceFilters
        filters={filters}
        vendorSearchInput={vendorSearchInput}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      {selectedIds.size > 0 && (
        <div
          className={`mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${
            isDarkMode
              ? 'border-blue-700 bg-blue-900/20'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <span
            className={`font-medium ${
              isDarkMode ? 'text-blue-200' : 'text-blue-800'
            }`}
          >
            {selectedIds.size} invoice(s) selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchUpdate({ is_paid: true })}
              disabled={batchLoading}
              className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              Mark as Paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchUpdate({ is_paid: false })}
              disabled={batchLoading}
              className="border-gray-500 text-gray-600 hover:bg-gray-50 dark:border-gray-400 dark:text-gray-400 dark:hover:bg-gray-900/20"
            >
              Mark as Unpaid
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchUpdate({ direction: 'incoming' })}
              disabled={batchLoading}
              className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              Set Incoming
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchUpdate({ direction: 'outgoing' })}
              disabled={batchLoading}
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20"
            >
              Set Outgoing
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      <div
        className={`overflow-x-auto rounded-lg border shadow-lg ${
          isDarkMode
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-200 bg-white'
        }`}
      >
        <table className="w-full border-collapse text-sm">
          <InvoiceTableHeader
            showSelect
            allSelected={
              invoiceData.data.length > 0 &&
              invoiceData.data.every((inv) =>
                selectedIds.has(inv.id || inv._id),
              )
            }
            onSelectAll={handleSelectAll}
          />
          <tbody>
            {invoiceData.data.flatMap((invoice) => [
              <InvoiceRow
                key={`${invoice.id || invoice._id}-main`}
                invoice={invoice}
                isExpanded={expandedRows.has(invoice.id || invoice._id)}
                onToggleExpand={toggleRowExpansion}
                onExportPDF={exportToPDF}
                onDelete={handleDeleteInvoice}
                onEdit={handleEdit}
                onUpdate={handleUpdateInvoice}
                onUpdateField={handleUpdateField}
                isSelected={selectedIds.has(invoice.id || invoice._id)}
                onSelect={handleSelect}
              />,
              ...(expandedRows.has(invoice.id || invoice._id)
                ? [
                    <InvoiceExpandedRow
                      key={`${invoice.id || invoice._id}-expanded`}
                      invoice={invoice}
                      colSpan={13}
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

      {editModal}
    </div>
  );
};

export default InvoiceListPage;
