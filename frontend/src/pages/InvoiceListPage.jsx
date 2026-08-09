import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import {
  fetchInvoices,
  getInvoiceById,
  updateInvoice,
  validateInvoice,
  invalidateInvoice,
  markInvoicePaid,
  unmarkInvoicePaid,
  batchUpdateInvoices,
  batchDownloadPdf,
  downloadInvoicePdf,
  exportInvoices,
  exportAchats,
  archiveInvoice,
  restoreInvoice,
} from '@/api/invoice';
import {
  validateVente,
  invalidateVente,
  markVenteSent,
  markVentePaid,
  unmarkVenteSent,
  unmarkVentePaid,
  downloadVentePdf,
  exportVentes,
} from '@/api/ventes';
import { computeBatchCounts } from '@/utils/batchCounts';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import {
  Archive,
  ArchiveRestore,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CheckCircle2,
  CircleSlash,
  FileCheck,
  FileDown,
  FileX,
  RotateCcw,
  Send,
  Undo2,
} from 'lucide-react';
import {
  EditInvoice,
  InvoicePagination,
  InvoiceHeader,
  InvoiceFilters,
  InvoiceTableHeader,
  InvoiceRow,
  InvoiceExpandedRow,
} from '@/components';
import ExportConfirmDialog from '@/components/invoice/invoice-listing/ExportConfirmDialog';
import { useDeleteInvoice } from '@/hooks/useDeleteInvoice';
import { toast } from 'sonner';

const SplitPill = ({ left, right, total, disabled }) => {
  if (left.count === 0 && right.count === 0) return null;
  const badge = (count) => (count > 0 && count < total ? ` (${count})` : '');
  const LeftIcon = left.icon;
  const RightIcon = right.icon;
  return (
    <div className="flex">
      <Button
        size="sm"
        variant="outline"
        onClick={left.onClick}
        disabled={disabled || left.count === 0}
        className={`rounded-r-none border-r-0 ${left.className}`}
      >
        <LeftIcon className="w-3.5 h-3.5 mr-1.5" />
        {left.label}
        {badge(left.count)}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={right.onClick}
        disabled={disabled || right.count === 0}
        className={`rounded-l-none ${right.className}`}
      >
        <RightIcon className="w-3.5 h-3.5 mr-1.5" />
        {right.label}
        {badge(right.count)}
      </Button>
    </div>
  );
};

const InvoiceListPage = ({ direction = null }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const initialStatus = searchParams.get('status') || 'all';
  const initialIsExported = searchParams.get('is_exported') ?? 'all';
  const initialIncludeArchived =
    searchParams.get('include_archived') === 'true';
  const initialVendorName = searchParams.get('vendor_name') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialStartDate = searchParams.get('start_date') || undefined;
  const initialEndDate = searchParams.get('end_date') || undefined;
  const initialOverdue = searchParams.get('overdue') === 'true';
  const editInvoiceId =
    searchParams.get('edit') || location.state?.editId || null;
  const initialSortBy = searchParams.get('sort_by') || 'created_at';
  const initialOrder = searchParams.get('order') || 'desc';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(
    parseInt(searchParams.get('per_page'), 10) || 10,
  );
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [order, setOrder] = useState(initialOrder);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Filter states
  const [filters, setFilters] = useState({
    status: initialStatus,
    is_exported: initialIsExported,
    include_archived: initialIncludeArchived,
    vendor_name: initialVendorName,
    category: initialCategory,
    start_date: initialStartDate,
    end_date: initialEndDate,
    overdue: initialOverdue,
    direction: direction ?? undefined,
  });

  // Keep direction filter in sync if the prop changes (e.g. navigating between /achats and /ventes)
  useEffect(() => {
    setFilters((prev) => ({ ...prev, direction: direction ?? undefined }));
    setPage(1);
  }, [direction]);

  const { categories } = useCategories();

  // Separate state for the vendor input to prevent immediate API calls
  const [vendorSearchInput, setVendorSearchInput] = useState(initialVendorName);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [pdfBatchLoading, setPdfBatchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportConfirm, setExportConfirm] = useState({ open: false, ids: [] });
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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

    if (
      selectedInvoice &&
      (selectedInvoice._id || selectedInvoice.id) === updatedId
    ) {
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
      setSelectedIds(new Set(invoiceData.data.map((inv) => inv.id || inv._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleUpdateField = async (invoiceId, payload) => {
    const updated = await updateInvoice(invoiceId, payload);
    return updated;
  };

  const handleBatchUpdate = async (
    updates,
    label = { s: 'mise à jour', p: 'mises à jour' },
  ) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const result = await batchUpdateInvoices([...selectedIds], updates);
      const n = result.updated_count;
      const lbl = n > 1 ? label.p : label.s;
      toast.success(`${n} facture${n > 1 ? 's' : ''} ${lbl}`);
      setSelectedIds(new Set());
      handleFetchInvoices(page, sortBy, order, filters);
    } catch (err) {
      toast.error(err.message || 'Mise à jour groupée échouée');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDownloadPdf = async () => {
    if (selectedIds.size === 0) return;
    setPdfBatchLoading(true);
    const toastId = toast.loading(
      `Génération du ZIP (${selectedIds.size} facture${selectedIds.size > 1 ? 's' : ''})...`,
    );
    try {
      await batchDownloadPdf([...selectedIds]);
      toast.success('ZIP téléchargé', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Échec du téléchargement', { id: toastId });
    } finally {
      setPdfBatchLoading(false);
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
      toast.success(deleteMessage || 'Facture supprimée avec succès !');
      handleDeleteSuccess(invoiceId); // ✅ Mise à jour locale
    } else {
      toast.error(deleteError || 'Accès administrateur requis');
    }
  };

  // ✅ FONCTION: Mise à jour d'une facture spécifique (utilisée par InvoiceRow)
  const handleUpdateInvoice = (updatedInvoice) => {
    console.log('🔄 Updating invoice locally from row:', updatedInvoice);
    setHistoryRefreshKey((k) => k + 1);

    setInvoiceData((prevData) => ({
      ...prevData,
      data: prevData.data.map((invoice) =>
        (invoice._id || invoice.id) ===
        (updatedInvoice._id || updatedInvoice.id)
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
    if (filters.include_archived) params.set('include_archived', 'true');
    if (filters.vendor_name) params.set('vendor_name', filters.vendor_name);
    if (filters.category && filters.category !== 'all')
      params.set('category', filters.category);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    if (filters.overdue) params.set('overdue', 'true');
    if (sortBy && sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (order && order !== 'desc') params.set('order', order);
    if (page && page !== 1) params.set('page', page);
    if (perPage && perPage !== 10) params.set('per_page', perPage);
    // Only push if different
    if (params.toString() !== location.search.replace(/^\?/, '')) {
      navigate({ search: params.toString() }, { replace: false });
    }
  }, [filters, sortBy, order, page, perPage]);

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
  }, [page, perPage, sortBy, order, filters]);

  // Open edit modal when navigating with a target invoice id (URL ?edit= or location state)
  useEffect(() => {
    if (!editInvoiceId) return;
    // Clear location state so the modal doesn't reopen on manual refresh
    if (location.state?.editId) {
      navigate(location.pathname + location.search, {
        replace: true,
        state: {},
      });
    }
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
    setFilters({
      status: 'all',
      is_exported: 'all',
      include_archived: false,
      vendor_name: '',
      category: 'all',
      start_date: undefined,
      end_date: undefined,
      overdue: false,
    });
    setVendorSearchInput('');
    setPage(1);
  };

  const handleArchive = async (invoice) => {
    const id = invoice._id || invoice.id;
    try {
      const updated = await archiveInvoice(id);
      if (filters.include_archived) {
        handleUpdateInvoice(updated);
      } else {
        setInvoiceData((prev) => ({
          ...prev,
          data: prev.data.filter((inv) => (inv.id || inv._id) !== id),
          total: prev.total - 1,
        }));
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      toast.success('Facture archivée');
    } catch (err) {
      toast.error(err.message || 'Archivage échoué');
    }
  };

  const handleRestore = async (invoice) => {
    const id = invoice._id || invoice.id;
    try {
      const updated = await restoreInvoice(id);
      handleUpdateInvoice(updated);
      toast.success('Facture restaurée');
    } catch (err) {
      toast.error(err.message || 'Restauration échouée');
    }
  };

  const handleStatusTransition = async (invoice, action) => {
    const id = invoice._id || invoice.id;
    const isOutgoing = invoice.direction === 'outgoing';
    const labels = {
      validate: 'validée',
      invalidate: 'invalidée',
      'mark-sent': 'marquée envoyée',
      'mark-paid': 'marquée payée',
      'unmark-sent': 'repassée en validé',
      'unmark-paid': 'repassée en envoyé',
    };
    try {
      let updated;
      if (action === 'validate') {
        updated = isOutgoing
          ? await validateVente(id)
          : await validateInvoice(id);
      } else if (action === 'invalidate') {
        updated = isOutgoing
          ? await invalidateVente(id)
          : await invalidateInvoice(id);
      } else if (action === 'mark-sent') {
        updated = await markVenteSent(id);
      } else if (action === 'mark-paid') {
        updated = isOutgoing
          ? await markVentePaid(id)
          : await markInvoicePaid(id);
      } else if (action === 'unmark-sent') {
        updated = await unmarkVenteSent(id);
      } else if (action === 'unmark-paid') {
        updated = isOutgoing
          ? await unmarkVentePaid(id)
          : await unmarkInvoicePaid(id);
      }
      if (updated) handleUpdateInvoice(updated);
      toast.success(`Facture ${labels[action] || 'mise à jour'}.`);
    } catch (err) {
      toast.error(
        err.response?.data?.detail || err.message || 'Action échouée.',
      );
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      let ids;
      if (direction === 'outgoing') ids = await exportVentes(filters);
      else if (direction === 'incoming') ids = await exportAchats(filters);
      else ids = await exportInvoices(filters);
      toast.success('Factures exportées avec succès');
      if (ids && ids.length > 0) {
        setExportConfirm({ open: true, ids });
      }
    } catch (err) {
      toast.error(err.message || 'Exportation échouée');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportConfirm = async () => {
    try {
      await batchUpdateInvoices(exportConfirm.ids, { is_exported: true });
      toast.success(
        `${exportConfirm.ids.length} facture${exportConfirm.ids.length > 1 ? 's marquées' : ' marquée'} comme exportée${exportConfirm.ids.length > 1 ? 's' : ''}.`,
      );
      handleFetchInvoices(page, sortBy, order, filters);
    } catch (err) {
      toast.error(err.message || 'Marquage échoué');
    } finally {
      setExportConfirm({ open: false, ids: [] });
    }
  };

  const exportConfirmDialog = (
    <ExportConfirmDialog
      open={exportConfirm.open}
      count={exportConfirm.ids.length}
      onConfirm={handleExportConfirm}
      onCancel={() => setExportConfirm({ open: false, ids: [] })}
    />
  );

  const editModal = editModalOpen && selectedInvoice && (
    <EditInvoice
      open={editModalOpen}
      onClose={closeEditModal}
      invoice={selectedInvoice}
      onSuccess={handleEditSuccess}
    />
  );

  // Contextual batch action counts — derived from current selection
  const batchTotal = selectedIds.size;
  const selectedInvoices = (invoiceData?.data || []).filter((inv) =>
    selectedIds.has(inv.id || inv._id),
  );
  const {
    canValidate,
    canInvalidate,
    canMarkPaid,
    canUnmarkPaid,
    canMarkSent,
    canUnmarkSent,
    canArchive,
    canRestore,
    canMarkExported,
    canUnmarkExported,
    canSetIncoming,
    canSetOutgoing,
  } = computeBatchCounts(selectedInvoices);

  // editModal and exportConfirmDialog are always the last two children of the
  // root fragment — same tree position regardless of which branch renders —
  // so React never unmounts/remounts the modal, preventing double animation.
  return (
    <>
      <div className="max-w-full mx-auto my-8 px-6">
        {loading ? (
          <Card
            className={`border-0 shadow-lg ${
              isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } backdrop-blur-sm`}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Chargement des factures...
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Erreur de chargement</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => handleFetchInvoices()} className="mt-4">
              Réessayer
            </Button>
          </>
        ) : !invoiceData ||
          !invoiceData.data ||
          invoiceData.data.length === 0 ? (
          <>
            <InvoiceHeader
              invoiceData={invoiceData}
              sortBy={sortBy}
              order={order}
              onSort={handleSort}
              onExport={handleExport}
              exportLoading={exportLoading}
              searchValue={vendorSearchInput}
              onSearchChange={(value) =>
                handleFilterChange('vendor_name', value)
              }
              direction={direction}
            />
            <InvoiceFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              direction={direction}
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
                {direction === 'incoming'
                  ? "Aucune facture d'achat"
                  : direction === 'outgoing'
                    ? 'Aucune facture de vente'
                    : 'No invoices found'}
              </AlertTitle>
              <AlertDescription
                className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}
              >
                {(filters.status && filters.status !== 'all') ||
                filters.vendor_name ||
                (filters.category && filters.category !== 'all') ? (
                  "Aucune facture ne correspond aux filtres actuels. Essayez d'ajuster vos critères de recherche."
                ) : direction === 'incoming' ? (
                  <>
                    Aucune facture d&apos;achat pour le moment.{' '}
                    <button
                      onClick={() => navigate('/achats/import')}
                      className="underline hover:no-underline"
                    >
                      Importer une facture
                    </button>
                  </>
                ) : direction === 'outgoing' ? (
                  <>
                    Aucune facture de vente pour le moment.{' '}
                    <button
                      onClick={() => navigate('/ventes/new')}
                      className="underline hover:no-underline"
                    >
                      Créer une facture
                    </button>
                  </>
                ) : (
                  'Aucune facture à afficher.'
                )}
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <InvoiceHeader
              invoiceData={invoiceData}
              sortBy={sortBy}
              order={order}
              onSort={handleSort}
              onExport={handleExport}
              exportLoading={exportLoading}
              searchValue={vendorSearchInput}
              onSearchChange={(value) =>
                handleFilterChange('vendor_name', value)
              }
              direction={direction}
            />

            <InvoiceFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              direction={direction}
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
                  {selectedIds.size} facture{selectedIds.size > 1 ? 's' : ''}{' '}
                  sélectionnée{selectedIds.size > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Left cluster: state mutations */}
                  {canValidate > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleBatchUpdate(
                          { status: 'validated' },
                          { s: 'validée', p: 'validées' },
                        )
                      }
                      disabled={batchLoading}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Valider{canValidate < batchTotal && ` (${canValidate})`}
                    </Button>
                  )}
                  {canInvalidate > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleBatchUpdate(
                          {
                            status:
                              direction === 'outgoing' ? 'draft' : 'extracted',
                          },
                          { s: 'invalidée', p: 'invalidées' },
                        )
                      }
                      disabled={batchLoading}
                      className="border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-500 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Invalider
                      {canInvalidate < batchTotal && ` (${canInvalidate})`}
                    </Button>
                  )}
                  <SplitPill
                    total={batchTotal}
                    disabled={batchLoading}
                    left={{
                      label: 'Marquer envoyé',
                      icon: Send,
                      count: canMarkSent,
                      onClick: () =>
                        handleBatchUpdate(
                          { status: 'sent' },
                          { s: 'marquée envoyée', p: 'marquées envoyées' },
                        ),
                      className:
                        'border-indigo-400 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/20',
                    }}
                    right={{
                      label: 'Non envoyé',
                      icon: Undo2,
                      count: canUnmarkSent,
                      onClick: () =>
                        handleBatchUpdate(
                          { status: 'validated' },
                          {
                            s: 'marquée non envoyée',
                            p: 'marquées non envoyées',
                          },
                        ),
                      className:
                        'border-gray-400 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                    }}
                  />
                  <SplitPill
                    total={batchTotal}
                    disabled={batchLoading}
                    left={{
                      label: 'Marquer payé',
                      icon: Banknote,
                      count: canMarkPaid,
                      onClick: () =>
                        handleBatchUpdate(
                          { status: 'paid' },
                          { s: 'marquée payée', p: 'marquées payées' },
                        ),
                      className:
                        'border-green-400 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20',
                    }}
                    right={{
                      label: 'Non payé',
                      icon: CircleSlash,
                      count: canUnmarkPaid,
                      onClick: () =>
                        handleBatchUpdate(
                          direction === 'outgoing'
                            ? { status: 'sent' }
                            : { status: 'validated' },
                          { s: 'marquée non payée', p: 'marquées non payées' },
                        ),
                      className:
                        'border-gray-400 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                    }}
                  />

                  {/* Divider */}
                  <div
                    className={`w-px h-5 self-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                  />

                  {/* Right cluster: utility */}
                  <SplitPill
                    total={batchTotal}
                    disabled={batchLoading}
                    left={{
                      label: 'Exporté',
                      icon: FileCheck,
                      count: canMarkExported,
                      onClick: () =>
                        handleBatchUpdate(
                          { is_exported: true },
                          { s: 'marquée exportée', p: 'marquées exportées' },
                        ),
                      className:
                        'border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                    }}
                    right={{
                      label: 'Non exporté',
                      icon: FileX,
                      count: canUnmarkExported,
                      onClick: () =>
                        handleBatchUpdate(
                          { is_exported: false },
                          {
                            s: 'marquée non exportée',
                            p: 'marquées non exportées',
                          },
                        ),
                      className:
                        'border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                    }}
                  />
                  <SplitPill
                    total={batchTotal}
                    disabled={batchLoading}
                    left={{
                      label: 'Archiver',
                      icon: Archive,
                      count: canArchive,
                      onClick: () =>
                        handleBatchUpdate(
                          { is_archived: true },
                          { s: 'archivée', p: 'archivées' },
                        ),
                      className:
                        'border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                    }}
                    right={{
                      label: 'Désarchiver',
                      icon: ArchiveRestore,
                      count: canRestore,
                      onClick: () =>
                        handleBatchUpdate(
                          { is_archived: false },
                          { s: 'désarchivée', p: 'désarchivées' },
                        ),
                      className:
                        'border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                    }}
                  />
                  {!direction && (
                    <SplitPill
                      total={batchTotal}
                      disabled={batchLoading}
                      left={{
                        label: 'Achat',
                        icon: ArrowDownToLine,
                        count: canSetIncoming,
                        onClick: () =>
                          handleBatchUpdate(
                            { direction: 'incoming' },
                            {
                              s: 'définie comme achat',
                              p: 'définies comme achat',
                            },
                          ),
                        className:
                          'border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                      }}
                      right={{
                        label: 'Vente',
                        icon: ArrowUpFromLine,
                        count: canSetOutgoing,
                        onClick: () =>
                          handleBatchUpdate(
                            { direction: 'outgoing' },
                            {
                              s: 'définie comme vente',
                              p: 'définies comme vente',
                            },
                          ),
                        className:
                          'border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
                      }}
                    />
                  )}

                  {/* Divider */}
                  <div
                    className={`w-px h-5 self-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                  />

                  {/* PDF */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBatchDownloadPdf}
                    disabled={pdfBatchLoading}
                    className="border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-500 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <FileDown
                      className={`w-3.5 h-3.5 mr-1.5 ${pdfBatchLoading ? '' : 'text-purple-500 dark:text-purple-400'}`}
                    />
                    {pdfBatchLoading ? 'Génération...' : 'Télécharger PDF'}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto"
                >
                  Effacer la sélection
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
                  showDirection={!direction}
                />
                <tbody>
                  {invoiceData.data.flatMap((invoice) => [
                    <InvoiceRow
                      key={`${invoice.id || invoice._id}-main`}
                      invoice={invoice}
                      isExpanded={expandedRows.has(invoice.id || invoice._id)}
                      onToggleExpand={toggleRowExpansion}
                      onExportPDF={(inv) =>
                        inv.direction === 'outgoing'
                          ? downloadVentePdf(
                              inv.id || inv._id,
                              inv.invoice_number,
                            )
                          : downloadInvoicePdf(
                              inv.id || inv._id,
                              inv.invoice_number,
                            )
                      }
                      onDelete={handleDeleteInvoice}
                      onArchive={handleArchive}
                      onRestore={handleRestore}
                      onEdit={handleEdit}
                      onUpdate={handleUpdateInvoice}
                      onUpdateField={handleUpdateField}
                      categories={categories}
                      onStatusTransition={handleStatusTransition}
                      isSelected={selectedIds.has(invoice.id || invoice._id)}
                      onSelect={handleSelect}
                      showDirection={!direction}
                    />,
                    ...(expandedRows.has(invoice.id || invoice._id)
                      ? [
                          <InvoiceExpandedRow
                            key={`${invoice.id || invoice._id}-expanded`}
                            invoice={invoice}
                            colSpan={12}
                            refreshKey={historyRefreshKey}
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
              perPage={perPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
                setExpandedRows(new Set());
              }}
            />
          </>
        )}
      </div>
      {editModal}
      {exportConfirmDialog}
    </>
  );
};

export default InvoiceListPage;
