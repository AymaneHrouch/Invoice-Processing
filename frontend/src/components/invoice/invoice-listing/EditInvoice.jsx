import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, CheckCircle, Lock, Banknote, Send, Undo2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

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
  const [vendorLocked, setVendorLocked] = useState(false);
  const [clientLocked, setClientLocked] = useState(false);

  // ✅ État local direct - plus simple et plus fiable
  const [formData, setFormData] = useState({
    vendor_name: '',
    client_name: '',
    client_ice: '',
    invoice_number: '',
    ice: '',
    tva: '',
    amount_tva: '',
    invoice_date: '',
    invoice_due_date: '',
    total_amount: '',
    currency: 'MAD',
    category: '',
    items: [],
    tags: [],
    status: 'extracted',
  });

  const [errors, setErrors] = useState({});

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
        amount_tva:
          invoice.amount_tva != null && invoice.amount_tva !== ''
            ? String(invoice.amount_tva)
            : '',
        invoice_date: formatDateForInput(invoice.invoice_date),
        invoice_due_date: formatDateForInput(invoice.invoice_due_date),
        total_amount: invoice.total_amount?.toString() || '',
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

      // Reset des erreurs et des locks contact
      setErrors({});
      setVendorLocked(false);
      setClientLocked(false);

      console.log('✅ Invoice data loaded successfully');
    }
  }, [invoice, open]); // ✅ Dépend aussi de 'open' pour recharger à chaque ouverture

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

    const computed =
      invoice?.direction === 'outgoing'
        ? processedItems.reduce(
            (sum, item) => sum + (Number(item.total) || 0),
            0,
          )
        : null;

    setFormData((prev) => ({
      ...prev,
      items: processedItems,
      ...(computed !== null ? { total_amount: String(computed) } : {}),
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
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Le montant doit être supérieur à 0 !';
    }
    if (!formData.category?.trim()) {
      newErrors.category = 'La catégorie est requise !';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      total_amount: parseFloat(formData.total_amount),
      invoice_date: formData.invoice_date?.trim() || null,
      invoice_due_date: formData.invoice_due_date?.trim() || null,
      status: formData.status,
      ice: formData.ice?.trim() || null,
      tva:
        formData.tva !== '' && formData.tva != null
          ? parseFloat(formData.tva)
          : null,
      amount_tva:
        formData.amount_tva !== '' && formData.amount_tva != null
          ? parseFloat(formData.amount_tva)
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
                  /* Vente: client fields only, no vendor/ICE/TVA% */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SupplierCombobox
                      value={formData.client_name}
                      iceValue={formData.client_ice}
                      onChange={(val) => updateField('client_name', val)}
                      onIceChange={(ice) => updateField('client_ice', ice)}
                      onContactSelect={() => setClientLocked(true)}
                      onManualInput={() => setClientLocked(false)}
                      contactType="client"
                      label="Nom du client"
                      placeholder="Saisir ou sélectionner un client"
                      error={errors.client_name}
                      required
                      disabled={allFieldsLocked}
                    />
                    <div className="space-y-1">
                      <FormField
                        id="client_ice"
                        label="ICE client"
                        value={formData.client_ice}
                        onChange={(e) =>
                          updateField('client_ice', e.target.value)
                        }
                        placeholder="ICE à 15 chiffres (optionnel)"
                        disabled={clientLocked || allFieldsLocked}
                      />
                      {clientLocked && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                          Modifier depuis les Contacts
                        </p>
                      )}
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
                    <FormField
                      id="amount_tva"
                      type="number"
                      label="Montant TVA"
                      value={formData.amount_tva}
                      onChange={(e) =>
                        updateField('amount_tva', e.target.value)
                      }
                      placeholder="Montant TVA (optionnel)"
                      step="0.01"
                      min="0"
                      disabled={financialLocked}
                    />
                  </div>
                ) : (
                  /* Achat: vendor/supplier fields */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SupplierCombobox
                      value={formData.vendor_name}
                      iceValue={formData.ice}
                      onChange={(val) => updateField('vendor_name', val)}
                      onIceChange={(ice) => updateField('ice', ice)}
                      onContactSelect={() => setVendorLocked(true)}
                      onManualInput={() => setVendorLocked(false)}
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
                      <FormField
                        id="ice"
                        label="ICE"
                        value={formData.ice}
                        onChange={(e) => updateField('ice', e.target.value)}
                        placeholder="ICE à 15 chiffres (optionnel)"
                        disabled={vendorLocked || allFieldsLocked}
                      />
                      {vendorLocked && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                          Modifier depuis les Contacts
                        </p>
                      )}
                    </div>
                    <FormField
                      id="tva"
                      type="number"
                      label="TVA (%)"
                      value={formData.tva}
                      onChange={(e) => updateField('tva', e.target.value)}
                      placeholder="ex. 20"
                      step="0.01"
                      min="0"
                      disabled={financialLocked}
                    />
                    <FormField
                      id="amount_tva"
                      type="number"
                      label="Montant TVA"
                      value={formData.amount_tva}
                      onChange={(e) =>
                        updateField('amount_tva', e.target.value)
                      }
                      placeholder="Montant TVA (optionnel)"
                      step="0.01"
                      min="0"
                      disabled={financialLocked}
                    />
                  </div>
                )}

                {/* Première ligne: Amount, Currency, Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {invoice?.direction === 'outgoing' ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Montant
                      </label>
                      <div
                        className={`flex items-center h-10 px-3 rounded-md border text-sm font-semibold text-green-700 dark:text-green-400 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                      >
                        {formData.total_amount
                          ? `${parseFloat(formData.total_amount).toFixed(2)} ${formData.currency}`
                          : '—'}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        Calculé depuis les articles
                      </p>
                    </div>
                  ) : (
                    <FormField
                      id="total_amount"
                      type="number"
                      label="Montant"
                      value={formData.total_amount}
                      onChange={(e) =>
                        updateField('total_amount', e.target.value)
                      }
                      placeholder="0.00"
                      step="0.01"
                      required
                      error={errors.total_amount}
                      disabled={financialLocked}
                    />
                  )}
                  <FormField
                    type="select"
                    label="Devise"
                    value={formData.currency}
                    onChange={(value) => updateField('currency', value)}
                    options={currencies}
                    disabled={allFieldsLocked}
                  />
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
