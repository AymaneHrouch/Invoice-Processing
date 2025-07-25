import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { exportToPDF } from '@/constants/exportToPDF';
import { fetchInvoices } from '@/api/invoice';
import { useLocation, useNavigate } from 'react-router-dom';
import {
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
  const initialVendorName = searchParams.get('vendor_name') || '';
  const initialCategory = searchParams.get('category') || 'all';
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
    vendor_name: initialVendorName,
    category: initialCategory,
  });

  // Separate state for the vendor input to prevent immediate API calls
  const [vendorSearchInput, setVendorSearchInput] = useState(initialVendorName);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedInvoice(null);
  };

  // ✅ OPTIMISATION: Mise à jour locale au lieu de recharger tout
  const handleEditSuccess = (updatedInvoice) => {
    console.log('✅ Invoice updated locally:', updatedInvoice);

    // Mettre à jour la liste des factures localement
    setInvoiceData((prevData) => ({
      ...prevData,
      data: prevData.data.map((invoice) =>
        invoice._id === updatedInvoice._id ? updatedInvoice : invoice,
      ),
    }));

    // Mettre à jour la facture sélectionnée si c'est la même
    if (selectedInvoice?._id === updatedInvoice._id) {
      setSelectedInvoice(updatedInvoice);
    }

    closeEditModal();
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
      toast.error(deleteError || 'Failed to delete invoice.');
    }
  };

  // ✅ FONCTION: Mise à jour d'une facture spécifique (utilisée par InvoiceRow)
  const handleUpdateInvoice = (updatedInvoice) => {
    console.log('🔄 Updating invoice locally from row:', updatedInvoice);

    setInvoiceData((prevData) => ({
      ...prevData,
      data: prevData.data.map((invoice) =>
        invoice._id === updatedInvoice._id ? updatedInvoice : invoice,
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
    setFilters({ status: 'all', vendor_name: '', category: 'all' });
    setVendorSearchInput(''); // Also clear the vendor input
    setPage(1);
  };

  if (loading) {
    return (
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
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-200 bg-white'
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
                onDelete={handleDeleteInvoice}
                onEdit={handleEdit}
                onUpdate={handleUpdateInvoice} // ✅ AJOUT: Passer la fonction de mise à jour
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

      {editModalOpen && selectedInvoice && (
        <EditInvoice
          open={editModalOpen}
          onClose={closeEditModal}
          invoice={selectedInvoice}
          onSuccess={handleEditSuccess} // ✅ Utilise la nouvelle fonction optimisée
        />
      )}
    </div>
  );
};

export default InvoiceListPage;
