import React, { useState } from 'react';
import { toast } from 'sonner';

import { 
  Plus, X, Save, Trash2, DollarSign, Hash, 
  Building, Tag, CalendarDays, Package
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useAddInvoice } from '@/hooks/useAddInvoice';
import { useInvoiceForm } from '@/hooks/useInvoiceForm';
import { FormField } from '@/components/ui/form-field';
import { InvoiceTags, InvoiceItems } from '@/components/invoice';

const ManualInvoice = () => {
  const { isDarkMode } = useTheme();
  const { addInvoice, loading, error, success, message, reset } = useAddInvoice();
  
  const {
    formData,
    errors,
    updateField,
    updateItems,
    updateTags,
    validateForm,
    resetForm,
    getFormDataForSubmission
  } = useInvoiceForm();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    
    const invoiceData = getFormDataForSubmission();
    const result = await addInvoice(invoiceData);
    
    if (result) {
      toast.success(message || "Invoice added successfully!");
      resetForm();
      reset();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  return (
    <TabsContent value="manual" className="space-y-6">
      <Card className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm`}>
        <CardHeader className="pb-6">
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Building className="w-5 h-5 text-blue-600" />
            Invoice Information
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Enter your invoice details manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              id="vendor_name"
              label="Supplier"
              value={formData.vendor_name}
              onChange={(e) => updateField('vendor_name', e.target.value)}
              placeholder="Supplier name"
              required
              error={errors.vendor_name}
              className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            />
            <FormField
              id="invoice_number"
              label="Number"
              value={formData.invoice_number}
              onChange={(e) => updateField('invoice_number', e.target.value)}
              placeholder="INV-2024-001"
              required
              error={errors.invoice_number}
              className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
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
              className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            />
            <FormField
              type="select"
              label="Currency"
              value={formData.currency}
              onChange={(value) => updateField('currency', value)}
              options={currencies}
              className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            />
            <FormField
              id="invoice_date"
              type="date"
              label="Date"
              value={formData.invoice_date}
              onChange={(e) => updateField('invoice_date', e.target.value)}
              className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
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
              className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            />
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          <InvoiceItems
            items={formData.items}
            currency={formData.currency}
            onItemsChange={updateItems}
          />

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          <InvoiceTags
            tags={formData.tags}
            onTagsChange={updateTags}
          />
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
  )
}

export default ManualInvoice