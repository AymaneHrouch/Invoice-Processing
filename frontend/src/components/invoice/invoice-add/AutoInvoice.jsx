import { useState, useCallback } from 'react';
import UploadCard from './UploadCard';
import ExtractedDataForm from './ExtractedDataForm';

const AutoInvoice = () => {
  // Enhanced state management for files with status tracking
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
    currentFileName: '',
  });

  // Derived state - get all successfully processed data
  const extractedData = files
    .filter((file) => file.status === 'completed' && file.extractedData)
    .map((file) => file.extractedData);

  // Helper functions
  const addFiles = useCallback((newFiles) => {
    const filesWithStatus = newFiles.map((file) => ({
      id: `${file.name}_${file.lastModified}_${Date.now()}`,
      file: file,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      status: 'pending', // pending, processing, completed, error
      extractedData: null,
      error: null,
      uploadedAt: new Date().toISOString(),
    }));

    setFiles((prev) => [...prev, ...filesWithStatus]);
    return filesWithStatus;
  }, []);

  const updateFileStatus = useCallback(
    (fileId, status, data = null, error = null) => {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, status, extractedData: data, error }
            : file,
        ),
      );
    },
    [],
  );

  const updateExtractedData = useCallback(
    (index, newData) => {
      const completedFiles = files.filter(
        (file) => file.status === 'completed',
      );
      if (completedFiles[index]) {
        const fileToUpdate = completedFiles[index];
        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileToUpdate.id
              ? { ...file, extractedData: newData }
              : file,
          ),
        );
      }
    },
    [files],
  );

  const removeFile = useCallback(
    (fileId) => {
      setFiles((prev) => {
        const newFiles = prev.filter((file) => file.id !== fileId);
        const completedFiles = newFiles.filter(
          (file) => file.status === 'completed',
        );

        // Adjust current invoice index if needed
        if (
          currentInvoiceIndex >= completedFiles.length &&
          completedFiles.length > 0
        ) {
          setCurrentInvoiceIndex(completedFiles.length - 1);
        } else if (completedFiles.length === 0) {
          setCurrentInvoiceIndex(0);
        }

        return newFiles;
      });
    },
    [currentInvoiceIndex],
  );

  const removeProcessedInvoice = useCallback(
    (index) => {
      const completedFiles = files.filter(
        (file) => file.status === 'completed',
      );
      if (completedFiles[index]) {
        const fileToRemove = completedFiles[index];
        removeFile(fileToRemove.id);
      }
    },
    [files, removeFile],
  );

  return (
    <div data-tab="file" className="space-y-6">
      {/* Upload Card */}
      <UploadCard
        files={files}
        addFiles={addFiles}
        updateFileStatus={updateFileStatus}
        removeFile={removeFile}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        processingProgress={processingProgress}
        setProcessingProgress={setProcessingProgress}
        currentInvoiceIndex={currentInvoiceIndex}
        setCurrentInvoiceIndex={setCurrentInvoiceIndex}
      />

      {/* Extracted Data Form with Carousel */}
      {extractedData.length > 0 && (
        <ExtractedDataForm
          extractedData={extractedData}
          updateExtractedData={updateExtractedData}
          removeProcessedInvoice={removeProcessedInvoice}
          currentInvoiceIndex={currentInvoiceIndex}
          setCurrentInvoiceIndex={setCurrentInvoiceIndex}
        />
      )}
    </div>
  );
};

export default AutoInvoice;
