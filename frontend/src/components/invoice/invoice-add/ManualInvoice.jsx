import { useState } from 'react';
import {
  Save,
  Building,
  Hash,
  DollarSign,
  CircleDollarSign,
  CalendarDays,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useAddInvoice } from '@/hooks/useAddInvoice';
import { FormField } from '@/components/ui/form-field';
import { InvoiceTags, InvoiceItems, AmountWarningBanner } from '@/components/invoice';
import { runAmountChecks } from '@/utils/invoiceCalculations';

// ✅ Fonction utilitaire pour formater les dates
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const ManualInvoice = () => {
  const { isDarkMode } = useTheme();
  const { addInvoice, loading, error, success, message, reset } =
    useAddInvoice();

  // ✅ État local direct
  const [formData, setFormData] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: formatDateForInput(new Date()),
    invoice_due_date: '',
    total_amount: '',
    currency: 'MAD',
    category: '',
    items: [],
    tags: [],
    source_type: 'manual',
    status: 'extracted',
  });

  const [errors, setErrors] = useState({});

  // ✅ Fonction pour mettre à jour un champ
  const updateField = (field, value) => {
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

  // ✅ Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      vendor_name: '',
      invoice_number: '',
      invoice_date: formatDateForInput(new Date()),
      invoice_due_date: '',
      total_amount: '',
      currency: 'MAD',
      category: '',
      items: [],
      tags: [],
      source_type: 'manual',
      status: 'extracted',
    });
    setErrors({});
  };

  // ✅ Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

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

    const result = await addInvoice(invoiceData);

    if (result) {
      toast.success(message || 'Invoice added successfully!');
      resetForm();
      reset();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  return (
    <TabsContent value="manual" className="space-y-6">
      <Card
        className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm pt-0 overflow-hidden`}
      >
        <CardHeader className="py-6 bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-blue-700/10">
          <CardTitle
            className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            <Building className="w-5 h-5 text-blue-600" />
            Invoice Information
          </CardTitle>
          <CardDescription
            className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
          >
            Enter your invoice details manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(() => {
            const warnings = runAmountChecks(
              { total_amount: formData.total_amount, items: formData.items },
              formData.currency
            );
            return warnings.length > 0 ? (
              <AmountWarningBanner warnings={warnings} />
            ) : null;
          })()}
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              id="vendor_name"
              label="Supplier"
              value={formData.vendor_name}
              onChange={(e) => updateField('vendor_name', e.target.value)}
              placeholder="Enter supplier name"
              error={errors.vendor_name}
              icon={Building}
              required
            />
            <FormField
              id="invoice_number"
              label="Invoice Number"
              value={formData.invoice_number}
              onChange={(e) => updateField('invoice_number', e.target.value)}
              placeholder="Enter invoice number"
              error={errors.invoice_number}
              icon={Hash}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FormField
              id="total_amount"
              type="number"
              label="Amount"
              value={formData.total_amount}
              onChange={(e) => updateField('total_amount', e.target.value)}
              placeholder="0.00"
              step="0.01"
              error={errors.total_amount}
              icon={DollarSign}
              required
            />
            <FormField
              type="select"
              label="Currency"
              value={formData.currency}
              onChange={(value) => updateField('currency', value)}
              options={currencies}
              placeholder="Select currency"
              icon={CircleDollarSign}
            />
            <FormField
              id="invoice_date"
              type="date"
              label="Date"
              value={formData.invoice_date}
              onChange={(e) => updateField('invoice_date', e.target.value)}
            />
            <FormField
              id="invoice_due_date"
              type="date"
              label="Due Date"
              value={formData.invoice_due_date}
              onChange={(e) => updateField('invoice_due_date', e.target.value)}
            />
            <FormField
              type="select"
              label="Category"
              value={formData.category}
              onChange={(value) => updateField('category', value)}
              options={categories}
              placeholder="Select a category"
              error={errors.category}
              icon={Package}
              required
            />
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          <InvoiceItems
            items={formData.items}
            currency={formData.currency}
            onItemsChange={updateItems}
          />

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          <InvoiceTags tags={formData.tags} onTagsChange={updateTags} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={loading}
        >
          <Save className="w-5 h-5 mr-2" />
          {loading ? 'Saving...' : 'Save Invoice'}
        </Button>
      </div>
    </TabsContent>
  );
};

export default ManualInvoice;
