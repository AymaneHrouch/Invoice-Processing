import { useState } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
import {
  Archive,
  ArchiveRestore,
  Banknote,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  MoreHorizontal,
  Pencil,
  Send,
  SquarePen,
  Trash2,
  AlertTriangle,
  Undo2,
} from 'lucide-react';

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
  onStatusTransition,
  isSelected,
  onSelect,
  showDirection = true,
}) => {
  const { isDarkMode } = useTheme();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [togglingField, setTogglingField] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field, currentValue) => {
    if (togglingField) return;
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const commitEdit = async () => {
    if (!editingField) return;
    const field = editingField;
    const value = editValue;
    setEditingField(null);
    setEditValue('');
    const current =
      field === 'invoice_due_date'
        ? (invoice.invoice_due_date || '').slice(0, 10)
        : String(invoice.total_amount || '');
    if (value === current || value === '') return;
    await handleToggleField(
      field,
      field === 'total_amount' ? parseFloat(value) : value,
    );
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleToggleField = async (field, value) => {
    if (!onUpdateField || togglingField) return;
    setTogglingField(field);
    try {
      const updated = await onUpdateField(invoice.id || invoice._id, {
        [field]: value,
      });
      if (onUpdate && updated) onUpdate(updated);
    } finally {
      setTogglingField(null);
    }
  };

  const handleEditSuccess = (updatedInvoice) => {
    if (onUpdate) onUpdate(updatedInvoice);
  };

  const isArchived = invoice.is_archived === true;
  const isOverdue = invoice.is_overdue === true;
  const amountWarnings = invoice?.amount_warnings ?? [];
  const hasAmountWarning =
    invoice?.status === 'extracted' && amountWarnings.length > 0;

  const direction = invoice.direction;
  const status = invoice.status;

  // Build contextual action items
  const actions = [];

  // Edit — always available (except archived for ventes validated+)
  actions.push({ key: 'edit', label: 'Modifier', icon: SquarePen });

  actions.push({ key: 'sep1', type: 'separator' });

  // Status transitions
  if (direction === 'outgoing') {
    if (status === 'draft') {
      actions.push({
        key: 'validate',
        label: 'Valider',
        icon: CheckCircle,
        color: 'text-indigo-600 dark:text-indigo-400',
      });
    }
    if (status === 'validated') {
      actions.push({
        key: 'invalidate',
        label: 'Invalider (→ brouillon)',
        icon: Undo2,
        color: 'text-gray-500',
      });
      actions.push({
        key: 'mark-sent',
        label: 'Marquer envoyé',
        icon: Send,
        color: 'text-blue-600 dark:text-blue-400',
      });
      actions.push({
        key: 'mark-paid',
        label: 'Marquer payé',
        icon: Banknote,
        color: 'text-emerald-600 dark:text-emerald-400',
      });
    }
    if (status === 'sent') {
      actions.push({
        key: 'unmark-sent',
        label: 'Annuler envoi (→ validé)',
        icon: Undo2,
        color: 'text-gray-500',
      });
      actions.push({
        key: 'mark-paid',
        label: 'Marquer payé',
        icon: Banknote,
        color: 'text-emerald-600 dark:text-emerald-400',
      });
    }
    if (status === 'paid') {
      actions.push({
        key: 'unmark-paid',
        label: 'Annuler paiement (→ envoyé)',
        icon: Undo2,
        color: 'text-gray-500',
      });
    }
  }

  if (direction === 'incoming') {
    if (status === 'extracted') {
      actions.push({
        key: 'validate',
        label: 'Valider',
        icon: CheckCircle,
        color: 'text-indigo-600 dark:text-indigo-400',
      });
    }
    if (status === 'validated') {
      actions.push({
        key: 'invalidate',
        label: 'Invalider (→ extrait)',
        icon: Undo2,
        color: 'text-gray-500',
      });
    }
    if (status === 'validated') {
      actions.push({
        key: 'mark-paid',
        label: 'Marquer payé',
        icon: Banknote,
        color: 'text-emerald-600 dark:text-emerald-400',
      });
    }
    if (status === 'paid') {
      actions.push({
        key: 'unmark-paid',
        label: 'Annuler paiement (→ validé)',
        icon: Undo2,
        color: 'text-gray-500',
      });
    }
  }

  actions.push({ key: 'sep2', type: 'separator' });

  // PDF
  actions.push({
    key: 'pdf',
    label: 'Télécharger PDF',
    icon: Download,
    color: 'text-blue-600 dark:text-blue-400',
  });

  actions.push({ key: 'sep3', type: 'separator' });

  // Archive / Restore
  if (isArchived) {
    actions.push({
      key: 'restore',
      label: 'Restaurer',
      icon: ArchiveRestore,
      color: 'text-green-600 dark:text-green-400',
    });
  } else {
    actions.push({
      key: 'archive',
      label: 'Archiver',
      icon: Archive,
      color: 'text-gray-500',
    });
  }

  // Delete
  actions.push({
    key: 'delete',
    label: 'Supprimer',
    icon: Trash2,
    color: 'text-red-600 dark:text-red-400',
  });

  const handleAction = (key) => {
    switch (key) {
      case 'edit':
        setSelectedInvoice(invoice);
        setEditModalOpen(true);
        break;
      case 'pdf':
        onExportPDF(invoice);
        break;
      case 'archive':
        onArchive?.(invoice);
        break;
      case 'restore':
        onRestore?.(invoice);
        break;
      case 'delete':
        setDeleteDialogOpen(true);
        break;
      case 'invalidate':
        onStatusTransition?.(invoice, 'invalidate');
        break;
      default:
        onStatusTransition?.(invoice, key);
    }
  };

  return (
    <>
      <tr
        className={`transition-colors ${
          isArchived
            ? isDarkMode
              ? 'bg-slate-900 border-l-4 border-slate-600 hover:bg-slate-800'
              : 'bg-slate-300 border-l-4 border-slate-500 hover:bg-slate-400'
            : isOverdue
              ? isDarkMode
                ? 'border-l-4 border-red-500 hover:bg-gray-700'
                : 'border-l-4 border-red-500 hover:bg-gray-50'
              : isDarkMode
                ? 'hover:bg-gray-700'
                : 'hover:bg-gray-50'
        }`}
      >
        {onSelect && (
          <td
            className={`px-3 py-4 border-b align-middle text-center w-10 ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
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
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(invoice.id || invoice._id)}
            className={`p-1 h-6 w-6 ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <span
            className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
          >
            {invoice.invoice_number}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <span
            className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
          >
            {invoice.direction === 'outgoing'
              ? invoice.client_name
              : invoice.vendor_name}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <div className="flex flex-col gap-0.5">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              {formatDate(invoice.invoice_date)}
            </span>
            {editingField === 'invoice_due_date' ? (
              <input
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                autoFocus
                className={`date-input text-xs h-6 w-28 rounded border px-1 [color-scheme:light] dark:[color-scheme:dark] ${isDarkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
              />
            ) : (
              <button
                type="button"
                onClick={() =>
                  startEdit(
                    'invoice_due_date',
                    (invoice.invoice_due_date || '').slice(0, 10),
                  )
                }
                className={`group flex items-center gap-1 text-xs text-left ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : isDarkMode
                      ? 'text-gray-500 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Cliquer pour modifier l'échéance"
              >
                {invoice.invoice_due_date ? (
                  formatDate(invoice.invoice_due_date)
                ) : (
                  <span className="italic">Échéance…</span>
                )}
                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60" />
              </button>
            )}
            {isOverdue && (
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                En retard
              </span>
            )}
          </div>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle w-24 ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <Badge
            variant={statusConfig[invoice.status]?.variant || 'outline'}
            className={`min-w-[70px] text-center justify-center ${statusConfig[invoice.status]?.className || ''}`}
          >
            {statusConfig[invoice.status]?.label || invoice.status}
          </Badge>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          {editingField === 'total_amount' ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              autoFocus
              className={`text-sm h-7 w-28 rounded border px-2 font-semibold ${isDarkMode ? 'bg-gray-700 border-gray-500 text-green-400' : 'bg-white border-gray-300 text-green-700'}`}
            />
          ) : (
            <button
              type="button"
              onClick={() =>
                startEdit('total_amount', String(invoice.total_amount || ''))
              }
              className="group inline-flex items-center gap-1.5 font-semibold text-green-600 text-base hover:text-green-500"
              title="Cliquer pour modifier le montant"
            >
              {formatCurrency(invoice.total_amount, invoice.currency)}
              {hasAmountWarning && (
                <span
                  className="text-amber-500 cursor-help"
                  title={amountWarnings.join('\n')}
                >
                  <AlertTriangle className="w-4 h-4" />
                </span>
              )}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50" />
            </button>
          )}
        </td>
        <td
          className={`px-3 py-4 border-b align-middle w-32 ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
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
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <span
            className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {getSourceIcon(invoice.source_type)} {invoice.source_type}
          </span>
        </td>
        {showDirection && (
          <td
            className={`px-3 py-4 border-b align-middle text-center ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
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
              className={
                togglingField === 'direction'
                  ? 'opacity-50 cursor-wait'
                  : 'cursor-pointer'
              }
              title="Cliquer pour changer la direction"
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
        )}
        <td
          className={`px-3 py-4 border-b align-middle text-center ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <input
            type="checkbox"
            checked={Boolean(invoice.is_exported)}
            onChange={(e) => handleToggleField('is_exported', e.target.checked)}
            disabled={togglingField === 'is_exported'}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
            title="Basculer exporté"
          />
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}
        >
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {actions.map((action) => {
                  if (action.type === 'separator')
                    return <DropdownMenuSeparator key={action.key} />;
                  const Icon = action.icon;
                  if (action.key === 'delete') {
                    return (
                      <AlertDialogTrigger asChild key="delete">
                        <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    );
                  }
                  return (
                    <DropdownMenuItem
                      key={action.key}
                      className={`cursor-pointer ${action.color || ''}`}
                      onSelect={() => handleAction(action.key)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la facture</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer la facture{' '}
                  <b>#{invoice.invoice_number}</b> ? Cette action est
                  irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setDeleteDialogOpen(false);
                    await onDelete(invoice);
                  }}
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </td>
      </tr>

      {editModalOpen && selectedInvoice && (
        <EditInvoice
          key={selectedInvoice._id}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};

export default InvoiceRow;
