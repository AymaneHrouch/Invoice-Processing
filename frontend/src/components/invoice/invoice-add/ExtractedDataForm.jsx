import {
  Eye,
  Save,
  FileText,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Hash,
  Building,
  CalendarDays,
  Package,
  CircleDollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import InvoiceTags from '../InvoiceTags';
import InvoiceItems from '../InvoiceItems';
import { useInvoiceSubmission } from '@/hooks';
import { useTheme } from '@/contexts';
import { currencies, categories } from '@/constants';

export const ExtractedDataForm = ({
  uploadedFiles,
  extractedData,
  currentInvoiceIndex,
  setCurrentInvoiceIndex,
  updateFormData,
  onInvoiceProcessed,
}) => {
  const { isDarkMode } = useTheme();

  const { loading, error, success, message, submitInvoice } =
    useInvoiceSubmission();

  const currentFormData = extractedData[currentInvoiceIndex] || {};

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentInvoiceIndex(Math.max(0, currentInvoiceIndex - 1));
  };

  const handleNext = () => {
    setCurrentInvoiceIndex(
      Math.min(extractedData.length - 1, currentInvoiceIndex + 1),
    );
  };

  const handleFieldChange = (field) => (value) => {
    updateFormData(field, value);
  };

  const handleTagsChange = (newTags) => {
    updateFormData('tags', newTags);
  };

  const handleItemsChange = (newItems) => {
    updateFormData('items', newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await submitInvoice(currentFormData);

    if (result.success) {
      onInvoiceProcessed?.(currentInvoiceIndex);
    }
  };

  // Validation
  const isFormValid = () => {
    return (
      currentFormData.supplier && currentFormData.amount && currentFormData.date
    );
  };

  return (
    <Card
      className={`shadow-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm pt-0`}
    >
      {/* Header with Navigation */}
      <CardHeader
        className={`${isDarkMode ? 'bg-gradient-to-r from-green-900/20 to-blue-900/20' : 'bg-gradient-to-r from-green-50 to-blue-50'} py-6`}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              Extracted Data
            </CardTitle>
            <p
              className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Review and modify the extracted information if necessary
            </p>
          </div>

          {/* Carousel Navigation */}
          {extractedData.length > 1 && (
            <div className="flex items-center gap-4">
              <span
                className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {currentInvoiceIndex + 1} of {extractedData.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentInvoiceIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentInvoiceIndex === extractedData.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* File Info */}
        <div
          className={`${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}
        >
          <div
            className={`flex items-center gap-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">
              Processing: {currentFormData.fileName}
            </span>
          </div>
        </div>

        {/* Extracted Text Preview */}
        {currentFormData.extractedText && (
          <div
            className={`${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}
          >
            <div
              className={`flex items-center gap-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} mb-2`}
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <strong>Extracted Text:</strong>
            </div>
            <pre
              className={`whitespace-pre-wrap break-words text-xs max-h-40 overflow-auto ${isDarkMode ? 'text-blue-200 bg-gray-800' : 'text-blue-700 bg-white'} p-3 rounded border`}
            >
              {currentFormData.extractedText}
            </pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Supplier"
              value={currentFormData.supplier || ''}
              onChange={handleFieldChange('supplier')}
              placeholder="Enter supplier name"
              required
              icon={Building}
            />

            <FormField
              label="Invoice Number"
              value={currentFormData.invoice_number || ''}
              onChange={handleFieldChange('invoice_number')}
              placeholder="Enter invoice number"
              icon={Hash}
            />
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FormField
              type="number"
              label="Amount"
              value={currentFormData.amount || ''}
              onChange={handleFieldChange('amount')}
              placeholder="0.00"
              step="0.01"
              required
              icon={DollarSign}
            />

            <FormField
              type="select"
              label="Currency"
              value={currentFormData.currency || 'EUR'}
              onChange={handleFieldChange('currency')}
              options={currencies}
              placeholder="Select currency"
              icon={CircleDollarSign}
            />

            <FormField
              type="date"
              label="Date"
              value={currentFormData.date || ''}
              onChange={handleFieldChange('date')}
            />

            <FormField
              type="date"
              label="Due Date"
              value={currentFormData.due_date || ''}
              onChange={handleFieldChange('due_date')}
            />

            <FormField
              type="select"
              label="Category"
              value={currentFormData.category || ''}
              onChange={handleFieldChange('category')}
              options={categories}
              placeholder="Select category"
              icon={Package}
              required
            />
          </div>

          {/* Invoice Items */}
          {currentFormData.items && (
            <InvoiceItems
              items={currentFormData.items}
              currency={currentFormData.currency || 'EUR'}
              onItemsChange={handleItemsChange}
            />
          )}

          {/* Tags */}
          {currentFormData.tags && (
            <InvoiceTags
              tags={currentFormData.tags}
              onTagsChange={handleTagsChange}
            />
          )}

          {/* Alerts */}
          {success && <Alert type="success" message={message} />}
          {error && <Alert type="error" message={error} />}

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={loading || !isFormValid()}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save Invoice{' '}
              {extractedData.length > 1
                ? `(${currentInvoiceIndex + 1}/${extractedData.length})`
                : ''}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
