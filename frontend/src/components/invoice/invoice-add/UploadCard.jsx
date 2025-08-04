import { useTheme } from '@/contexts';
import { Check, FileText, Sparkles, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { uploadFiles } from '@/api';
const UploadCard = ({
  uploadedFiles,
  setUploadedFiles,
  isProcessing,
  setIsProcessing,
  extractedData,
  setExtractedData,
  currentInvoiceIndex,
  setCurrentInvoiceIndex,
}) => {
  const { isDarkMode } = useTheme();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesUpload(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFilesUpload(files);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newExtractedData = extractedData.filter((_, i) => i !== index);

    setUploadedFiles(newFiles);
    setExtractedData(newExtractedData);

    if (
      currentInvoiceIndex >= newExtractedData.length &&
      newExtractedData.length > 0
    ) {
      setCurrentInvoiceIndex(newExtractedData.length - 1);
    } else if (newExtractedData.length === 0) {
      setCurrentInvoiceIndex(0);
    }
  };

  const handleFilesUpload = async (files) => {
    const validFiles = files.filter((file) => {
      const validTypes = ['.pdf', '.png', '.jpg', '.jpeg'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      return validTypes.includes(fileExtension);
    });

    if (validFiles.length !== files.length) {
      alert(
        'Some files were skipped. Only PDF, PNG, JPG, and JPEG files are supported.',
      );
    }

    if (validFiles.length > 0) {
      setUploadedFiles(validFiles);
      setIsProcessing(true);
      setExtractedData([]);
      setError('');
      setSuccess(false);
      setCurrentInvoiceIndex(0);

      try {
        const formData = new FormData();
        validFiles.forEach((file) => {
          formData.append('files', file);
        });
        const extractedData = await uploadFiles(formData);
        setExtractedData(extractedData);
      } catch (err) {
        setError(err.message || 'Error processing files.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div
      className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm rounded-lg overflow-hidden`}
    >
      <div
        className={`p-6 border-b ${isDarkMode ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-gray-600' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200'}`}
      >
        <h3
          className={`flex items-center gap-2 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        >
          <Sparkles className="w-5 h-5 text-purple-600" />
          Artificial Intelligence
        </h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
          Drag and drop your invoices and let AI extract the data automatically
        </p>
      </div>
      <div className="p-6">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 scale-105'
              : `${isDarkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`
          }`}
        >
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3
                className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Drag and drop your invoices
              </h3>
              <p
                className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Supported formats: PDF, PNG, JPG, JPEG
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Selected files ({uploadedFiles.length}):
            </h4>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}
              >
                <div
                  className={`flex items-center justify-between ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p
                className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Processing {uploadedFiles.length} file
                {uploadedFiles.length > 1 ? 's' : ''} with AI...
              </p>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div
            className={`mt-6 ${isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-3`}
          >
            <div
              className={`flex items-center gap-2 ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}
            >
              <Check className="w-4 h-4 text-green-600" />
              <span>{message}</span>
            </div>
          </div>
        )}
        {error && (
          <div
            className={`mt-6 ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3`}
          >
            <div
              className={`flex items-center gap-2 ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}
            >
              <X className="w-4 h-4 text-red-600" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadCard;
