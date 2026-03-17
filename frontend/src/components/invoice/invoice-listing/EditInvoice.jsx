import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Save,
  CheckCircle,
  Lock,
  Banknote,
  Send,
  Undo2,
  ChevronDown,
  ChevronUp,
  History,
  ShieldCheck,
  ShieldOff,
  BadgeCheck,
  RotateCcw,
  CircleDollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader as CardHeaderUI,
  CardTitle as CardTitleUI,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { currencies, statusConfig } from '@/constants';
import { useTheme } from '@/contexts';
import { useEditInvoice } from '@/hooks/useEditInvoice';
import { useCategories } from '@/hooks/useCategories';
import { FormField } from '@/components/ui/form-field';
import {
  InvoiceTags,
  InvoiceItems,
  AmountWarningBanner,
} from '@/components/invoice';
import {
  validateInvoice,
  invalidateInvoice,
  markInvoicePaid,
  unmarkInvoicePaid,
  fetchInvoiceHistory,
} from '@/api/invoice';
import {
  validateVente,
  invalidateVente,
  markVenteSent,
  markVentePaid,
  unmarkVenteSent,
  unmarkVentePaid,
} from '@/api/ventes';
import { Badge } from '@/components/ui/badge';
import SupplierCombobox from '@/components/ui/SupplierCombobox';
import TvaRateField from '@/components/ui/TvaRateField';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const HISTORY_CONFIG = {
  validated: {
    label: 'Validée',
    icon: ShieldCheck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
  },
  invalidated: {
    label: 'Invalidée',
    icon: ShieldOff,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  sent: {
    label: 'Marquée envoyée',
    icon: Send,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
  },
  unmark_sent: {
    label: 'Envoi annulé',
    icon: RotateCcw,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  paid: {
    label: 'Marquée payée',
    icon: CircleDollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  unmark_paid: {
    label: 'Paiement annulé',
    icon: RotateCcw,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  created: {
    label: 'Créée',
    icon: BadgeCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
  },
  _default: {
    label: 'Mis à jour',
    icon: History,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
};

// ✅ Fonction utilitaire pour formater les dates
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    if (typeof dateString === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
      if (dateString.includes('T')) return dateString.split('T')[0];
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } else if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const EditInvoice = ({ open, onClose, invoice, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const { editInvoice, loading, error, message, reset } = useEditInvoice();
  const { categories } = useCategories();
  const [actionLoading, setActionLoading] = useState(null);

  // ✅ État local direct - plus simple et plus fiable
  const [formData, setFormData] = useState({
    vendor_name: '',
    client_name: '',
    client_ice: '',
    invoice_number: '',
    ice: '',
    tva: '',
    invoice_date: '',
    invoice_due_date: '',
    subtotal_ht: '',
    currency: 'MAD',
    category: '',
    items: [],
    tags: [],
    status: 'extracted',
  });

  const [errors, setErrors] = useState({});
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ✅ Effet pour charger les données de la facture
  useEffect(() => {
    console.log('🔄 EditInvoice - invoice prop changed:', invoice);

    if (invoice && open) {
      console.log('📝 Loading invoice data into form...');

      setFormData({
        vendor_name: invoice.vendor_name || '',
        client_name: invoice.client_name || '',
        client_ice: invoice.client_ice || '',
        invoice_number: invoice.invoice_number || '',
        ice: invoice.ice ?? '',
        tva:
          invoice.tva != null && invoice.tva !== '' ? String(invoice.tva) : '',
        invoice_date: formatDateForInput(invoice.invoice_date),
        invoice_due_date: formatDateForInput(invoice.invoice_due_date),
        subtotal_ht:
          invoice.subtotal_ht?.toString() ||
          invoice.total_amount?.toString() ||
          '',
        currency: invoice.currency || 'MAD',
        category: invoice.category || '',
        items: Array.isArray(invoice.items)
          ? invoice.items.map((item) => ({
              name: item.name || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              total: item.total || 0,
            }))
          : [],
        tags: Array.isArray(invoice.tags) ? invoice.tags : [],
        status: invoice.status || 'extracted',
      });

      setErrors({});

      console.log('✅ Invoice data loaded successfully');
    }
  }, [invoice, open]); // ✅ Dépend aussi de 'open' pour recharger à chaque ouverture

  useEffect(() => {
    if (!invoice || !open) return;
    const id = invoice._id || invoice.id;
    if (!id) return;
    setHistory([]);
    fetchInvoiceHistory(id)
      .then(setHistory)
      .catch(() => {});
  }, [invoice, open]);

  // ✅ Fonction pour mettre à jour un champ
  const updateField = (field, value) => {
    console.log('✏️ Updating field:', field, '=', value);

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Supprimer l'erreur pour ce champ
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ✅ Fonction pour mettre à jour les items
  const updateItems = (items) => {
    console.log('📦 Updating items:', items);

    const processedItems = items.map((item) => ({
      name: item.name || '',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      total: Number(item.total) || 0,
    }));

    setFormData((prev) => ({
      ...prev,
      items: processedItems,
    }));
  };

  // ✅ Fonction pour mettre à jour les tags
  const updateTags = (tags) => {
    console.log('🏷️ Updating tags:', tags);

    setFormData((prev) => ({
      ...prev,
      tags: Array.isArray(tags) ? tags : [],
    }));
  };

  // ✅ Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (invoice?.direction === 'outgoing') {
      if (!formData.client_name?.trim())
        newErrors.client_name = 'Le nom du client est requis !';
    } else {
      if (!formData.vendor_name?.trim())
        newErrors.vendor_name = 'Le nom du fournisseur est requis !';
    }
    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Le numéro de facture est requis !';
    }
    if (
      invoice?.direction !== 'outgoing' &&
      (!formData.subtotal_ht || parseFloat(formData.subtotal_ht) <= 0)
    ) {
      newErrors.subtotal_ht = 'Le montant HT doit être supérieur à 0 !';
    }
    if (!formData.category?.trim()) {
      newErrors.category = 'La catégorie est requise !';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Derived: HT → TVA → TTC
  const tvaRate = parseFloat(formData.tva) || 0;
  const subtotalHT =
    invoice?.direction === 'outgoing'
      ? formData.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
      : parseFloat(formData.subtotal_ht) || 0;
  const computedAmountTva = parseFloat(
    ((subtotalHT * tvaRate) / 100).toFixed(2),
  );
  const computedTotal = parseFloat((subtotalHT + computedAmountTva).toFixed(2));

  const amountWarnings =
    invoice?.status === 'extracted' ? (invoice?.amount_warnings ?? []) : [];

  // Lock all fields: outgoing when not draft, incoming when validated/paid
  const allFieldsLocked =
    invoice?.direction === 'outgoing'
      ? formData.status !== 'draft'
      : ['validated', 'paid'].includes(formData.status);

  const financialLocked = allFieldsLocked;

  const handleStatusAction = async (action) => {
    const id = invoice?._id || invoice?.id;
    if (!id) return;
    const isOutgoing = invoice.direction === 'outgoing';
    setActionLoading(action);
    try {
      let updated;
      if (action === 'validate')
        updated = isOutgoing
          ? await validateVente(id)
          : await validateInvoice(id);
      else if (action === 'invalidate')
        updated = isOutgoing
          ? await invalidateVente(id)
          : await invalidateInvoice(id);
      else if (action === 'mark-sent') updated = await markVenteSent(id);
      else if (action === 'mark-paid')
        updated = isOutgoing
          ? await markVentePaid(id)
          : await markInvoicePaid(id);
      else if (action === 'unmark-sent') updated = await unmarkVenteSent(id);
      else if (action === 'unmark-paid')
        updated = isOutgoing
          ? await unmarkVentePaid(id)
          : await unmarkInvoicePaid(id);
      if (updated) {
        toast.success('Statut mis à jour');
        if (onSuccess) onSuccess(updated);
        const id = invoice?._id || invoice?.id;
        if (id)
          fetchInvoiceHistory(id)
            .then(setHistory)
            .catch(() => {});
        onClose();
      }
    } catch (e) {
      toast.error(e.message || 'Erreur lors du changement de statut');
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('📤 Form submission - formData:', formData);

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    // Préparer les données pour l'envoi
    const invoiceData = {
      ...formData,
      subtotal_ht: subtotalHT || null,
      amount_tva: computedAmountTva > 0 ? computedAmountTva : null,
      total_amount: computedTotal > 0 ? computedTotal : subtotalHT,
      invoice_date: formData.invoice_date?.trim() || null,
      invoice_due_date: formData.invoice_due_date?.trim() || null,
      status: formData.status,
      ice: formData.ice?.trim() || null,
      tva:
        formData.tva !== '' && formData.tva != null
          ? parseFloat(formData.tva)
          : null,
    };

    console.log('🚀 Submitting invoice data:', invoiceData);

    const result = await editInvoice(invoice._id || invoice.id, invoiceData);

    if (result) {
      toast.success(message || 'Facture modifiée avec succès !');
      reset();

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  // ✅ Debug: afficher les données actuelles
  useEffect(() => {
    console.log('📊 Current form state:', {
      vendor_name: formData.vendor_name,
      invoice_number: formData.invoice_number,
      total_amount: formData.total_amount,
      category: formData.category,
    });
  }, [formData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[95vh] bg-white dark:bg-gray-800 flex flex-col p-0 overflow-hidden">
        {/* Header fixe */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <DialogHeader className="px-8 py-5">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Modifier la facture
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Modifiez les détails de votre facture et enregistrez vos
              modifications.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Contenu scrollable avec scrollbar stylée */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6 scrollbar-thin scrollbar-track-gray-100 dark:scrollbar-track-gray-800 scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            id="edit-invoice-form"
          >
            <Card className="border-0 shadow-none bg-transparent">
              {amountWarnings.length > 0 && (
                <AmountWarningBanner
                  warnings={amountWarnings}
                  className="mb-4"
                />
              )}
              {allFieldsLocked && (
                <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  Facture validée — non modifiable
                </div>
              )}
              <CardHeaderUI className="px-0 pb-4">
                <CardTitleUI
                  className={`flex items-center gap-2 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Détails de la facture
                </CardTitleUI>
              </CardHeaderUI>
              <CardContent className="px-0 space-y-6">
                {invoice?.direction === 'outgoing' ? (
                  /* Vente: client fields + tva% + computed amount_tva */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SupplierCombobox
                      value={formData.client_name}
                      onChange={(val) => updateField('client_name', val)}
                      onIceChange={(ice) => updateField('client_ice', ice)}
                      onContactSelect={(c) =>
                        updateField('client_ice', c.ice || formData.client_ice)
                      }
                      contactType="client"
                      label="Nom du client"
                      placeholder="Saisir ou sélectionner un client"
                      error={errors.client_name}
                      required
                      disabled={allFieldsLocked}
                    />
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ICE client
                      </label>
                      <div
                        className={`block w-full h-10 px-3 leading-10 rounded-md border text-sm font-mono truncate ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                      >
                        {formData.client_ice || (
                          <span className="text-gray-400 font-sans">—</span>
                        )}
                      </div>
                    </div>
                    <FormField
                      id="invoice_number"
                      label="Numéro"
                      value={formData.invoice_number}
                      onChange={(e) =>
                        updateField('invoice_number', e.target.value)
                      }
                      placeholder="FAC-2025-001"
                      required
                      error={errors.invoice_number}
                      disabled={allFieldsLocked}
                    />
                    <TvaRateField
                      value={formData.tva}
                      onChange={(v) => updateField('tva', v)}
                      allowCustom={false}
                      disabled={financialLocked}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                ) : (
                  /* Achat: vendor/supplier fields */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SupplierCombobox
                      value={formData.vendor_name}
                      onChange={(val) => updateField('vendor_name', val)}
                      onIceChange={(ice) => updateField('ice', ice)}
                      onContactSelect={(c) =>
                        updateField('ice', c.ice || formData.ice)
                      }
                      error={errors.vendor_name}
                      required
                      disabled={allFieldsLocked}
                    />
                    <FormField
                      id="invoice_number"
                      label="Numéro"
                      value={formData.invoice_number}
                      onChange={(e) =>
                        updateField('invoice_number', e.target.value)
                      }
                      placeholder="INV-2024-001"
                      required
                      error={errors.invoice_number}
                      disabled={allFieldsLocked}
                    />
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ICE
                      </label>
                      <div
                        className={`block w-full h-10 px-3 leading-10 rounded-md border text-sm font-mono truncate ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                      >
                        {formData.ice || (
                          <span className="text-gray-400 font-sans">—</span>
                        )}
                      </div>
                    </div>
                    <TvaRateField
                      value={formData.tva}
                      onChange={(v) => updateField('tva', v)}
                      allowCustom={true}
                      disabled={financialLocked}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                )}

                {/* Montants: HT, TVA, TTC */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {invoice?.direction === 'outgoing' ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Montant HT
                      </label>
                      <div
                        className={`flex items-center h-10 px-3 rounded-md border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                      >
                        {subtotalHT > 0
                          ? `${subtotalHT.toFixed(2)} ${formData.currency}`
                          : '—'}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        Calculé depuis les articles
                      </p>
                    </div>
                  ) : (
                    <FormField
                      id="subtotal_ht"
                      type="number"
                      label="Montant HT"
                      value={formData.subtotal_ht}
                      onChange={(e) =>
                        updateField('subtotal_ht', e.target.value)
                      }
                      placeholder="0.00"
                      step="0.01"
                      required
                      error={errors.subtotal_ht}
                      disabled={financialLocked}
                    />
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Montant TVA
                    </label>
                    <div
                      className={`flex items-center h-10 px-3 rounded-md border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                    >
                      {computedAmountTva > 0
                        ? `${computedAmountTva.toFixed(2)} ${formData.currency}`
                        : '—'}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                      HT × TVA%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total TTC
                    </label>
                    <div
                      className={`flex items-center h-10 px-3 rounded-md border text-sm font-semibold text-green-700 dark:text-green-400 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                    >
                      {computedTotal > 0
                        ? `${computedTotal.toFixed(2)} ${formData.currency}`
                        : '—'}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                      HT + TVA
                    </p>
                  </div>
                  <FormField
                    type="select"
                    label="Devise"
                    value={formData.currency}
                    onChange={(value) => updateField('currency', value)}
                    options={currencies}
                    disabled={allFieldsLocked}
                  />
                </div>

                {/* Catégorie */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    type="select"
                    label="Catégorie"
                    value={formData.category}
                    onChange={(value) => updateField('category', value)}
                    options={categories}
                    placeholder="Sélectionner une catégorie"
                    required
                    error={errors.category}
                    disabled={allFieldsLocked}
                  />
                </div>

                {/* Deuxième ligne: Invoice Date, Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    id="invoice_date"
                    type="date"
                    label="Date de facture"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      updateField('invoice_date', e.target.value)
                    }
                    disabled={allFieldsLocked}
                  />
                  <FormField
                    id="invoice_due_date"
                    type="date"
                    label="Date d'échéance"
                    value={formData.invoice_due_date}
                    onChange={(e) =>
                      updateField('invoice_due_date', e.target.value)
                    }
                    disabled={allFieldsLocked}
                  />
                </div>

                <Separator />

                <InvoiceItems
                  items={formData.items}
                  currency={formData.currency}
                  onItemsChange={updateItems}
                  disabled={financialLocked}
                />

                <Separator />

                {/* Statut + actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Statut
                    </span>
                    <Badge
                      variant={
                        statusConfig[invoice?.status]?.variant || 'outline'
                      }
                      className={`w-fit ${statusConfig[invoice?.status]?.className || ''}`}
                    >
                      {statusConfig[invoice?.status]?.label || invoice?.status}
                    </Badge>
                  </div>
                  {/* Transitions — incoming */}
                  {invoice?.direction === 'incoming' &&
                    invoice?.status === 'extracted' && (
                      <Button
                        type="button"
                        onClick={() => handleStatusAction('validate')}
                        disabled={!!actionLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {actionLoading === 'validate' ? '…' : 'Valider'}
                      </Button>
                    )}
                  {invoice?.direction === 'incoming' &&
                    invoice?.status === 'validated' && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleStatusAction('invalidate')}
                          disabled={!!actionLoading}
                          className="text-gray-600"
                        >
                          <Undo2 className="w-4 h-4 mr-2" />
                          {actionLoading === 'invalidate' ? '…' : 'Invalider'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStatusAction('mark-paid')}
                          disabled={!!actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Banknote className="w-4 h-4 mr-2" />
                          {actionLoading === 'mark-paid' ? '…' : 'Marquer payé'}
                        </Button>
                      </>
                    )}
                  {invoice?.direction === 'incoming' &&
                    invoice?.status === 'paid' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleStatusAction('unmark-paid')}
                        disabled={!!actionLoading}
                        className="text-gray-600"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        {actionLoading === 'unmark-paid'
                          ? '…'
                          : 'Annuler paiement'}
                      </Button>
                    )}
                  {/* Transitions — outgoing */}
                  {invoice?.direction === 'outgoing' &&
                    invoice?.status === 'draft' && (
                      <Button
                        type="button"
                        onClick={() => handleStatusAction('validate')}
                        disabled={!!actionLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {actionLoading === 'validate' ? '…' : 'Valider'}
                      </Button>
                    )}
                  {invoice?.direction === 'outgoing' &&
                    invoice?.status === 'validated' && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleStatusAction('invalidate')}
                          disabled={!!actionLoading}
                          className="text-gray-600"
                        >
                          <Undo2 className="w-4 h-4 mr-2" />
                          {actionLoading === 'invalidate' ? '…' : 'Invalider'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStatusAction('mark-sent')}
                          disabled={!!actionLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {actionLoading === 'mark-sent'
                            ? '…'
                            : 'Marquer envoyé'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStatusAction('mark-paid')}
                          disabled={!!actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Banknote className="w-4 h-4 mr-2" />
                          {actionLoading === 'mark-paid' ? '…' : 'Marquer payé'}
                        </Button>
                      </>
                    )}
                  {invoice?.direction === 'outgoing' &&
                    invoice?.status === 'sent' && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleStatusAction('unmark-sent')}
                          disabled={!!actionLoading}
                          className="text-gray-600"
                        >
                          <Undo2 className="w-4 h-4 mr-2" />
                          {actionLoading === 'unmark-sent'
                            ? '…'
                            : 'Annuler envoi'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStatusAction('mark-paid')}
                          disabled={!!actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Banknote className="w-4 h-4 mr-2" />
                          {actionLoading === 'mark-paid' ? '…' : 'Marquer payé'}
                        </Button>
                      </>
                    )}
                  {invoice?.direction === 'outgoing' &&
                    invoice?.status === 'paid' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleStatusAction('unmark-paid')}
                        disabled={!!actionLoading}
                        className="text-gray-600"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        {actionLoading === 'unmark-paid'
                          ? '…'
                          : 'Annuler paiement'}
                      </Button>
                    )}
                </div>

                <Separator />

                <InvoiceTags tags={formData.tags} onTagsChange={updateTags} />

                <Separator />

                {/* Historique (audit trail) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((o) => !o)}
                    className={`flex items-center gap-2 w-full text-left text-sm font-medium ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                  >
                    <History className="w-4 h-4" />
                    Historique
                    {history.length > 0 && (
                      <span
                        className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {history.length}
                      </span>
                    )}
                    <span className="ml-auto">
                      {historyOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {historyOpen && (
                    <div className="mt-3 space-y-0">
                      {history.length === 0 ? (
                        <p
                          className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} italic`}
                        >
                          Aucun historique disponible.
                        </p>
                      ) : (
                        <div className="relative">
                          {history.map((entry, i) => {
                            const isLast = i === history.length - 1;
                            const cfg =
                              HISTORY_CONFIG[entry.action] ||
                              HISTORY_CONFIG._default;
                            const Icon = cfg.icon;
                            return (
                              <div key={i} className="flex gap-3">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                                  >
                                    <Icon
                                      className={`w-3.5 h-3.5 ${cfg.color}`}
                                    />
                                  </div>
                                  {!isLast && (
                                    <div
                                      className={`w-px flex-1 mt-1 mb-1 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                                    />
                                  )}
                                </div>
                                {/* Content */}
                                <div className={`pb-4 ${isLast ? '' : ''}`}>
                                  <p
                                    className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                                  >
                                    {cfg.label}
                                  </p>
                                  <p
                                    className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                  >
                                    {entry.user}
                                    {entry.timestamp && (
                                      <>
                                        {' '}
                                        ·{' '}
                                        {new Date(
                                          entry.timestamp,
                                        ).toLocaleString('fr-FR', {
                                          dateStyle: 'short',
                                          timeStyle: 'short',
                                        })}
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Espace pour éviter que le contenu soit masqué par le footer */}
            <div className="pb-20"></div>
          </form>
        </div>

        {/* Footer fixe */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <DialogFooter className="px-8 py-5 flex justify-end gap-3">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="edit-invoice-form"
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 text-white font-medium px-6"
              disabled={loading || allFieldsLocked}
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>

      <style jsx>{`
        /* Scrollbar styling for Webkit browsers */
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }

        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }

        .dark .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }

        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }

        .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }

        .hover\\:scrollbar-thumb-gray-400:hover::-webkit-scrollbar-thumb {
          background: #9ca3af;
        }

        .dark .hover\\:scrollbar-thumb-gray-500:hover::-webkit-scrollbar-thumb {
          background: #6b7280;
        }

        /* Pour Firefox */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f3f4f6;
        }

        .dark .scrollbar-thin {
          scrollbar-color: #4b5563 #1f2937;
        }
      `}</style>
    </Dialog>
  );
};

export default EditInvoice;
