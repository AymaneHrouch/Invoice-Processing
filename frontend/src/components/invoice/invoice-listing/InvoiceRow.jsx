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
  ChevronDown,
  ChevronUp,
  Download,
  SquarePen,
  Trash2,
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
  onUpdate, // ✅ AJOUT: Nouveau prop pour la mise à jour
}) => {
  const { isDarkMode } = useTheme();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ✅ CORRECTION: Cette fonction doit appeler onUpdate du parent
  const handleEditSuccess = (updatedInvoice) => {
    console.log('✅ Invoice updated successfully:', updatedInvoice);

    // Appeler la fonction de mise à jour du composant parent
    if (onUpdate) {
      onUpdate(updatedInvoice);
    }
  };

  return (
    <>
      <tr
        className={`transition-colors ${
          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        }`}
      >
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
          <span className="font-semibold text-green-600 text-base">
            {formatCurrency(invoice.total_amount, invoice.currency)}
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
