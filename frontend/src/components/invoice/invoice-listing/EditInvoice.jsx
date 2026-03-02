import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader as CardHeaderUI,
  CardTitle as CardTitleUI,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useEditInvoice } from '@/hooks/useEditInvoice';
import { FormField } from '@/components/ui/form-field';
import { InvoiceTags, InvoiceItems } from '@/components/invoice';
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

  // ✅ État local direct - plus simple et plus fiable
  const [formData, setFormData] = useState({
    vendor_name: '',
    invoice_number: '',
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
        invoice_number: invoice.invoice_number || '',
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

      // Reset des erreurs
      setErrors({});

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

    if (!formData.vendor_name?.trim()) {
      newErrors.vendor_name = 'Supplier name is required!';
    }
    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Invoice number is required!';
    }
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Amount must be greater than 0!';
    }
    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required!';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('📤 Form submission - formData:', formData);

    if (!validateForm()) {
      toast.error('Please correct the errors in the form.');
      return;
    }

    // Préparer les données pour l'envoi
    const invoiceData = {
      ...formData,
      total_amount: parseFloat(formData.total_amount),
      invoice_date: formData.invoice_date?.trim() || null,
      invoice_due_date: formData.invoice_due_date?.trim() || null,
    };

    console.log('🚀 Submitting invoice data:', invoiceData);

    const result = await editInvoice(invoice._id, invoiceData);

    if (result) {
      toast.success(message || 'Invoice modified successfully!');
      reset();

      // ✅ SOLUTION: Passer les données mises à jour au parent
      if (onSuccess) {
        // Appeler onSuccess avec les nouvelles données
        onSuccess({
          ...invoice, // Garder l'ID et autres données non modifiées
          ...invoiceData, // Nouvelles données
        });
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
              Edit Invoice
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Modify the details of your invoice and save your changes.
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
              <CardHeaderUI className="px-0 pb-4">
                <CardTitleUI
                  className={`flex items-center gap-2 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Invoice Details
                </CardTitleUI>
              </CardHeaderUI>
              <CardContent className="px-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    id="vendor_name"
                    label="Supplier"
                    value={formData.vendor_name}
                    onChange={(e) => updateField('vendor_name', e.target.value)}
                    placeholder="Supplier name"
                    required
                    error={errors.vendor_name}
                  />
                  <FormField
                    id="invoice_number"
                    label="Number"
                    value={formData.invoice_number}
                    onChange={(e) =>
                      updateField('invoice_number', e.target.value)
                    }
                    placeholder="INV-2024-001"
                    required
                    error={errors.invoice_number}
                  />
                </div>

                {/* Première ligne: Amount, Currency, Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    id="total_amount"
                    type="number"
                    label="Amount"
                    value={formData.total_amount}
                    onChange={(e) =>
                      updateField('total_amount', e.target.value)
                    }
                    placeholder="0.00"
                    step="0.01"
                    required
                    error={errors.total_amount}
                  />
                  <FormField
                    type="select"
                    label="Currency"
                    value={formData.currency}
                    onChange={(value) => updateField('currency', value)}
                    options={currencies}
                  />
                  <FormField
                    type="select"
                    label="Category"
                    value={formData.category}
                    onChange={(value) => updateField('category', value)}
                    options={categories}
                    placeholder="Select a category"
                    required
                    error={errors.category}
                  />
                </div>

                {/* Deuxième ligne: Invoice Date, Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    id="invoice_date"
                    type="date"
                    label="Invoice Date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      updateField('invoice_date', e.target.value)
                    }
                  />
                  <FormField
                    id="invoice_due_date"
                    type="date"
                    label="Due Date"
                    value={formData.invoice_due_date}
                    onChange={(e) =>
                      updateField('invoice_due_date', e.target.value)
                    }
                  />
                </div>

                <Separator />

                <InvoiceItems
                  items={formData.items}
                  currency={formData.currency}
                  onItemsChange={updateItems}
                />

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
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="edit-invoice-form"
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 text-white font-medium px-6"
              disabled={loading}
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
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
