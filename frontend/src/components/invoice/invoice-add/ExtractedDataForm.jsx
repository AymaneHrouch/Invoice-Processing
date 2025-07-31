import { categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import {
  X,
  FileText,
  Eye,
  Save,
  Trash2,
  DollarSign,
  Hash,
  Building,
  Tag,
  CalendarDays,
  Package,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

const ExtractedDataForm = ({
  uploadedFiles,
  setUploadedFiles,
  extractedData,
  setExtractedData,
  currentInvoiceIndex,
  setCurrentInvoiceIndex,
}) => {
  const { isDarkMode } = useTheme();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const currentFormData = extractedData[currentInvoiceIndex] || {};

  const updateFormData = (field, value) => {
    if (extractedData.length > 0) {
      const newData = [...extractedData];
      newData[currentInvoiceIndex] = {
        ...newData[currentInvoiceIndex],
        [field]: value,
      };
      setExtractedData(newData);
    }
  };

  const updateItem = (itemIndex, field, value) => {
    if (extractedData.length > 0) {
      const newData = [...extractedData];
      const newItems = [...newData[currentInvoiceIndex].items];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        [field]: value,
      };
      newData[currentInvoiceIndex].items = newItems;
      setExtractedData(newData);
    }
  };

  const addItem = () => {
    if (extractedData.length > 0) {
      const newData = [...extractedData];
      newData[currentInvoiceIndex].items.push({
        name: '',
        description: '',
        quantity: 1,
        unit_price: '0.00',
        total: '0.00',
      });
      setExtractedData(newData);
    }
  };

  const removeItem = (itemIndex) => {
    if (extractedData.length > 0) {
      const newData = [...extractedData];
      newData[currentInvoiceIndex].items = newData[
        currentInvoiceIndex
      ].items.filter((_, i) => i !== itemIndex);
      setExtractedData(newData);
    }
  };

  const removeTag = (tagToRemove) => {
    if (extractedData.length > 0) {
      const newData = [...extractedData];
      newData[currentInvoiceIndex].tags = newData[
        currentInvoiceIndex
      ].tags.filter((tag) => tag !== tagToRemove);
      setExtractedData(newData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentData = extractedData[currentInvoiceIndex];

    if (!currentData.supplier || !currentData.amount || !currentData.date) {
      alert('Please fill in the required fields: supplier, amount, date.');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
      setMessage(`Invoice ${currentInvoiceIndex + 1} saved successfully!`);

      // Remove the processed invoice from the list
      const newExtractedData = extractedData.filter(
        (_, i) => i !== currentInvoiceIndex,
      );
      const newUploadedFiles = uploadedFiles.filter(
        (_, i) => i !== currentInvoiceIndex,
      );

      setExtractedData(newExtractedData);
      setUploadedFiles(newUploadedFiles);

      if (newExtractedData.length > 0) {
        setCurrentInvoiceIndex(Math.max(0, currentInvoiceIndex - 1));
      } else {
        setCurrentInvoiceIndex(0);
      }

      setTimeout(() => {
        setSuccess(false);
        setMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-lg overflow-hidden`}
    >
      <div
        className={`p-6 border-b ${isDarkMode ? 'bg-gradient-to-r from-green-900/20 to-blue-900/20 border-gray-600' : 'bg-gradient-to-r from-green-50 to-blue-50 border-gray-200'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={`flex items-center gap-2 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              <Eye className="w-5 h-5 text-green-600" />
              Extracted Data
            </h3>
            <p
              className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}
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
                <button
                  onClick={() =>
                    setCurrentInvoiceIndex(Math.max(0, currentInvoiceIndex - 1))
                  }
                  disabled={currentInvoiceIndex === 0}
                  className={`p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentInvoiceIndex(
                      Math.min(
                        extractedData.length - 1,
                        currentInvoiceIndex + 1,
                      ),
                    )
                  }
                  disabled={currentInvoiceIndex === extractedData.length - 1}
                  className={`p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
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

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <Building className="w-4 h-4" />
              Supplier *
            </label>
            <input
              type="text"
              value={currentFormData.supplier || ''}
              onChange={(e) => updateFormData('supplier', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <Hash className="w-4 h-4" />
              Invoice Number
            </label>
            <input
              type="text"
              value={currentFormData.invoice_number || ''}
              onChange={(e) => updateFormData('invoice_number', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <DollarSign className="w-4 h-4" />
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={currentFormData.amount || ''}
              onChange={(e) => updateFormData('amount', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>

          <div className="space-y-2">
            <label
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Currency
            </label>
            <select
              value={currentFormData.currency || 'EUR'}
              onChange={(e) => updateFormData('currency', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <CalendarDays className="w-4 h-4" />
              Date *
            </label>
            <input
              type="date"
              value={currentFormData.date || ''}
              onChange={(e) => updateFormData('date', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <CalendarDays className="w-4 h-4" />
              Due Date
            </label>
            <input
              type="date"
              value={currentFormData.due_date || ''}
              onChange={(e) => updateFormData('due_date', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <Package className="w-4 h-4" />
              Category
            </label>
            <select
              value={currentFormData.category || ''}
              onChange={(e) => updateFormData('category', e.target.value)}
              className={`w-full h-11 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Section */}
        {currentFormData.items && currentFormData.items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                <Package className="w-5 h-5" />
                Invoice Items
              </h3>
              <button
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>
            <div className="space-y-4">
              {currentFormData.items.map((item, index) => (
                <div
                  key={index}
                  className={`border-l-4 border-l-green-500 rounded-lg border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label
                        className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Item Name
                      </label>
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) =>
                          updateItem(index, 'name', e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label
                        className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) =>
                          updateItem(index, 'description', e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) =>
                          updateItem(index, 'quantity', e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        Unit Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) =>
                          updateItem(index, 'unit_price', e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Total:{' '}
                      {(
                        (parseFloat(item.quantity) || 0) *
                        (parseFloat(item.unit_price) || 0)
                      ).toFixed(2)}{' '}
                      {currentFormData.currency}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags Section */}
        {currentFormData.tags && currentFormData.tags.length > 0 && (
          <div className="space-y-4">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              <Tag className="w-4 h-4" />
              Extracted Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {currentFormData.tags.map((tag, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className={`ml-1 rounded-full p-0.5 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Save Invoice{' '}
            {extractedData.length > 1
              ? `(${currentInvoiceIndex + 1}/${extractedData.length})`
              : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtractedDataForm;
