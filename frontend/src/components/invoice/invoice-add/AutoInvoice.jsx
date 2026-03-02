import { useState, useCallback } from 'react';
import UploadCard from './UploadCard';

const AutoInvoice = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
    currentFileName: '',
  });

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

  const removeFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  return (
    <div data-tab="file" className="space-y-6">
      <UploadCard
        files={files}
        addFiles={addFiles}
        updateFileStatus={updateFileStatus}
        removeFile={removeFile}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        processingProgress={processingProgress}
        setProcessingProgress={setProcessingProgress}
      />
    </div>
  );
};

export default AutoInvoice;
