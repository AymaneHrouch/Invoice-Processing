import { useTheme } from '@/contexts';
import {
  Check,
  FileText,
  Sparkles,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { uploadFiles } from '@/api';
import { generateMockData } from '@/constants';

const UploadCard = ({
  files,
  addFiles,
  updateFileStatus,
  removeFile,
  isProcessing,
  setIsProcessing,
  processingProgress,
  setProcessingProgress,
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

  // Helper function to check if a file is already uploaded
  const isFileAlreadyUploaded = useCallback(
    (newFile) => {
      return files.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.lastModified === newFile.lastModified,
      );
    },
    [files],
  );

  // Get status icon for file
  const getFileStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Sequential file processing
  const processFileSequentially = useCallback(
    async (filesToProcess) => {
      for (let i = 0; i < filesToProcess.length; i++) {
        const fileToProcess = filesToProcess[i];

        // Update progress
        setProcessingProgress({
          current: i + 1,
          total: filesToProcess.length,
          currentFileName: fileToProcess.name,
        });

        // Update file status to processing
        updateFileStatus(fileToProcess.id, 'processing');

        try {
          // Simulate processing with mock data
          const formData = new FormData();
          formData.append('files', fileToProcess.file);
          const extractedData = await uploadFiles(formData);
          console.log(extractedData);

          // Ensure tags array exists in extracted data
          const processedData = {
            ...extractedData[0],
            tags: extractedData[0]?.tags || [],
          };

          updateFileStatus(fileToProcess.id, 'completed', processedData);
        } catch (error) {
          console.error('Error processing file:', error);
          updateFileStatus(fileToProcess.id, 'error', null, error.message);
        }
      }

      // Reset processing state
      setProcessingProgress({ current: 0, total: 0, currentFileName: '' });
      setIsProcessing(false);
    },
    [updateFileStatus, setProcessingProgress, setIsProcessing],
  );

  const handleFilesUpload = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;

      setError('');

      // Filter out files that are already uploaded
      const newFiles = Array.from(fileList).filter(
        (file) => !isFileAlreadyUploaded(file),
      );

      if (newFiles.length === 0) {
        setMessage('All selected files have already been uploaded.');
        return;
      }

      // Validate file types and sizes
      const validFiles = newFiles.filter((file) => {
        const validTypes = ['.pdf', '.png', '.jpg', '.jpeg'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        return (
          validTypes.includes(fileExtension) && file.size <= 10 * 1024 * 1024
        );
      });

      if (validFiles.length !== newFiles.length) {
        setError(
          'Some files were skipped. Only PDF, PNG, JPG, and JPEG files under 10MB are supported.',
        );
      }

      if (validFiles.length > 0) {
        // Add new files to the state
        const addedFiles = addFiles(validFiles);
        setIsProcessing(true);
        setSuccess(false);

        // Process files sequentially
        await processFileSequentially(addedFiles);

        setSuccess(true);
        setMessage(`Successfully processed ${validFiles.length} file(s).`);
      }
    },
    [isFileAlreadyUploaded, addFiles, processFileSequentially, setIsProcessing],
  );

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

        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Uploaded Files ({files.length}):
            </h4>
            {files.map((fileItem, index) => (
              <div
                key={fileItem.id}
                className={`${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}
              >
                <div
                  className={`flex items-center justify-between ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}
                >
                  <div
                    className={`flex items-center gap-2 flex-1 ${fileItem.status === 'completed' ? 'cursor-pointer hover:text-blue-600' : ''}`}
                    onClick={() => {
                      if (
                        fileItem.status === 'completed' &&
                        fileItem.extractedData
                      ) {
                        // Find the index in completed files
                        const completedFiles = files.filter(
                          (f) => f.status === 'completed',
                        );
                        const dataIndex = completedFiles.findIndex(
                          (f) => f.id === fileItem.id,
                        );
                        if (dataIndex !== -1) {
                          setCurrentInvoiceIndex(dataIndex);
                        }
                      }
                    }}
                  >
                    {getFileStatusIcon(fileItem.status)}
                    <span className="flex-1">{fileItem.name}</span>
                    {fileItem.status === 'completed' && (
                      <Eye className="w-4 h-4 ml-2 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {fileItem.status && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          fileItem.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : fileItem.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : fileItem.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : fileItem.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {fileItem.status === 'pending'
                          ? 'Waiting...'
                          : fileItem.status === 'processing'
                            ? 'Processing...'
                            : fileItem.status === 'completed'
                              ? 'Processed'
                              : fileItem.status === 'error'
                                ? 'Error'
                                : 'Unknown'}
                      </span>
                    )}
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {fileItem.error && (
                  <div className="mt-2 text-xs text-red-500">
                    Error: {fileItem.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              {processingProgress.total > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p
                    className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    Processing {processingProgress.current} of{' '}
                    {processingProgress.total} files
                  </p>
                  {processingProgress.currentFileName && (
                    <p
                      className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
                    >
                      Current: {processingProgress.currentFileName}
                    </p>
                  )}
                </>
              )}
              {processingProgress.total === 0 && (
                <p
                  className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Processing files with AI...
                </p>
              )}
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
