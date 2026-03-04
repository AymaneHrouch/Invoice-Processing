import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts';
import {
  formatDate,
  formatCurrency,
  getCategoryColor,
  getSourceIcon,
  statusConfig,
} from '@/constants';
import { EditInvoice } from '@/components/invoice';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Download,
  SquarePen,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const InvoiceRow = ({
  invoice,
  isExpanded,
  onToggleExpand,
  onExportPDF,
  onDelete,
  onArchive,
  onRestore,
  onUpdate,
  onUpdateField,
  isSelected,
  onSelect,
}) => {
  const { isDarkMode } = useTheme();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [togglingField, setTogglingField] = useState(null);

  const handleToggleField = async (field, value) => {
    if (!onUpdateField || togglingField) return;
    setTogglingField(field);
    try {
      const updated = await onUpdateField(invoice.id || invoice._id, { [field]: value });
      if (onUpdate && updated) onUpdate(updated);
    } finally {
      setTogglingField(null);
    }
  };

  const handleEditSuccess = (updatedInvoice) => {
    console.log('✅ Invoice updated successfully:', updatedInvoice);

    // Appeler la fonction de mise à jour du composant parent
    if (onUpdate) {
      onUpdate(updatedInvoice);
    }
  };

  const isArchived = invoice.is_archived === true;
  const amountWarnings = invoice?.amount_warnings ?? [];
  const hasAmountWarning =
    invoice?.status === 'extracted' && amountWarnings.length > 0;

  return (
    <>
      <tr
        className={`transition-colors ${
          isArchived
            ? isDarkMode
              ? 'bg-slate-900 border-l-4 border-slate-600 hover:bg-slate-800'
              : 'bg-slate-300 border-l-4 border-slate-500 hover:bg-slate-400'
            : isDarkMode
              ? 'hover:bg-gray-700'
              : 'hover:bg-gray-50'
        }`}
      >
        {onSelect && (
          <td
            className={`px-3 py-4 border-b align-middle text-center w-10 ${
              isDarkMode ? 'border-gray-600' : 'border-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(invoice.id || invoice._id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </td>
        )}
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(invoice.id || invoice._id)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            className={`p-1 h-6 w-6 ${
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <span
            className={`font-semibold ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}
          >
            {invoice.invoice_number}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <span
            className={`font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            {invoice.vendor_name}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {formatDate(invoice.invoice_date)}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle w-24 ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <Badge
            variant={statusConfig[invoice.status]?.variant || 'outline'}
            className={`min-w-[70px] text-center justify-center ${statusConfig[invoice.status]?.className || ''}`}
          >
            {statusConfig[invoice.status]?.label || invoice.status}
          </Badge>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 font-semibold text-green-600 text-base">
            {formatCurrency(invoice.total_amount, invoice.currency)}
            {hasAmountWarning && (
              <span
                className="text-amber-500 cursor-help"
                title={amountWarnings.join('\n')}
              >
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle w-32 ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <Badge
            variant="secondary"
            style={{
              backgroundColor: getCategoryColor(invoice.category),
              color: 'white',
            }}
            className="text-white font-medium text-xs uppercase tracking-wide min-w-[90px] text-center justify-center"
          >
            {invoice.category}
          </Badge>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <span
            className={`flex items-center gap-1 text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {getSourceIcon(invoice.source_type)} {invoice.source_type}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle text-center ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <button
            type="button"
            onClick={() =>
              handleToggleField(
                'direction',
                invoice.direction === 'outgoing' ? 'incoming' : 'outgoing',
              )
            }
            disabled={togglingField === 'direction'}
            className={togglingField === 'direction' ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            title="Click to toggle direction"
          >
            <Badge
              variant="outline"
              className={
                invoice.direction === 'outgoing'
                  ? 'min-w-[44px] text-center justify-center border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400'
                  : 'min-w-[44px] text-center justify-center border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
              }
            >
              {invoice.direction === 'outgoing' ? 'OUT' : 'IN'}
            </Badge>
          </button>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle text-center ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <input
            type="checkbox"
            checked={Boolean(invoice.is_paid)}
            onChange={(e) => handleToggleField('is_paid', e.target.checked)}
            disabled={togglingField === 'is_paid'}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
            title="Toggle paid"
          />
        </td>
        <td
          className={`px-3 py-4 border-b align-middle text-center ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <input
            type="checkbox"
            checked={Boolean(invoice.is_exported)}
            readOnly
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
            title="Set automatically on export"
          />
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? 'border-gray-600' : 'border-gray-100'
          }`}
        >
          <div className="flex gap-2">
            <button
              title="Edit"
              className={`p-2 rounded-md border border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 transition cursor-pointer 
                ${isDarkMode ? 'border-green-400 text-green-400 hover:bg-green-900/20 hover:text-green-300' : ''}`}
              onClick={() => {
                setSelectedInvoice(invoice);
                setEditModalOpen(true);
              }}
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <button
                  title="Delete"
                  className={`p-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer 
                    ${isDarkMode ? 'border-red-400 text-red-400 hover:bg-red-900/20 hover:text-red-300' : ''}`}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete invoice{' '}
                    <b>#{invoice.invoice_number}</b>? This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeleteDialogOpen(false);
                      await onDelete(invoice);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <button
              title="Export PDF"
              className={`p-2 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer 
                ${isDarkMode ? 'border-blue-400 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300' : ''}`}
              onClick={() => onExportPDF(invoice)}
            >
              <Download className="w-4 h-4" />
            </button>
            {onArchive && !isArchived && (
              <button
                title="Archive"
                className={`p-2 rounded-md border border-gray-500 text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition cursor-pointer 
                  ${isDarkMode ? 'border-gray-400 text-gray-400 hover:bg-gray-900/20 hover:text-gray-300' : ''}`}
                onClick={() => onArchive(invoice)}
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            {onRestore && isArchived && (
              <button
                title="Restore"
                className={`p-2 rounded-md border border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 transition cursor-pointer 
                  ${isDarkMode ? 'border-green-400 text-green-400 hover:bg-green-900/20 hover:text-green-300' : ''}`}
                onClick={() => onRestore(invoice)}
              >
                <ArchiveRestore className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Edit Invoice Modal */}
      {editModalOpen && selectedInvoice && (
        <EditInvoice
          key={selectedInvoice._id}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedInvoice(null); // ✅ Reset aussi selectedInvoice
          }}
          invoice={selectedInvoice}
          onSuccess={handleEditSuccess} // ✅ CORRECTION: Enlever les parenthèses ()
        />
      )}
    </>
  );
};

export default InvoiceRow;
