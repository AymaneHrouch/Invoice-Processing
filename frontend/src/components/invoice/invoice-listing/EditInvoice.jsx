import { useEffect } from 'react';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useEditInvoice } from '@/hooks/useEditInvoice';
import { useInvoiceForm } from '@/hooks/useInvoiceForm';
import { FormField } from '@/components/ui/form-field';
import { InvoiceTags, InvoiceItems } from '@/components/invoice';

const EditInvoice = ({ open, onClose, invoice, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const { editInvoice, loading, error, message, reset } = useEditInvoice();
  
  const {
    formData,
    errors,
    updateField,
    updateItems,
    updateTags,
    validateForm,
    getFormDataForSubmission
  } = useInvoiceForm(invoice);

  useEffect(() => {
    if (invoice && open) {
      console.log('EditInvoice - Invoice data received:', invoice);
      console.log('EditInvoice - Invoice date:', invoice.invoice_due_date);
    }
  }, [invoice, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    
    const invoiceData = getFormDataForSubmission();
    console.log("Data sent to backend:", invoiceData);
    const result = await editInvoice(invoice._id, invoiceData);
    
    if (result) {
      toast.success(message || "Invoice modified successfully!");
      reset();
      if (onSuccess) onSuccess();
      onClose();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  // FONCTION CORRIGÉE pour afficher les dates sans décalage
  function formatDateForInput(isoDateString) {
    if (!isoDateString) return "";
    
    // Extraire directement la partie date (YYYY-MM-DD) sans conversion timezone
    if (isoDateString.includes('T')) {
      return isoDateString.split('T')[0];
    }
    
    // Si c'est déjà au format YYYY-MM-DD, retourner tel quel
    return isoDateString;
  }

  // GESTIONNAIRE SPÉCIAL pour les champs de date
  const handleDateChange = (field, dateValue) => {
    // Stocker directement la valeur YYYY-MM-DD sans conversion timezone
    // Le backend recevra cette valeur et pourra la traiter correctement
    updateField(field, dateValue);
  };
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className={`h-[80%] w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <form onSubmit={handleSubmit}>
          <Card className={`border-0 shadow-none bg-transparent`}> 
            <CardHeader className="pb-6">
              <CardTitle className={`flex items-center gap-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  onChange={(e) => updateField('invoice_number', e.target.value)}
                  placeholder="INV-2024-001"
                  required
                  error={errors.invoice_number}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField
                  id="total_amount"
                  type="number"
                  label="Amount"
                  value={formData.total_amount}
                  onChange={(e) => updateField('total_amount', e.target.value)}
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
                {/* CHAMPS DE DATE CORRIGÉS */}
                <FormField
                  id="invoice_date"
                  type="date"
                  label="Date"
                  value={formatDateForInput(formData.invoice_date)}
                  onChange={(e) => handleDateChange('invoice_date', e.target.value)}
                />
                <FormField
                  id="invoice_due_date"
                  type="date"
                  label="Due Date"
                  value={formatDateForInput(formData.invoice_due_date)}
                  onChange={(e) => handleDateChange('invoice_due_date', e.target.value)}
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
              <Separator />
              <InvoiceItems
                items={formData.items}
                currency={formData.currency}
                onItemsChange={updateItems}
              />
              <Separator />
              <InvoiceTags
                tags={formData.tags}
                onTagsChange={updateTags}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end mt-6">
            <Button type="submit" size="lg" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200" disabled={loading}>
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoice;