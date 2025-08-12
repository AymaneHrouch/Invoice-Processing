import { useState, useCallback } from 'react';
import { validateFiles, generateMockData } from '@/utils';

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const uploadFiles = useCallback(async (files) => {
    const { validFiles, errors } = validateFiles(files);

    if (errors.length > 0) {
      setError(errors.join(', '));
      return { success: false, errors };
    }

    setUploadedFiles(validFiles);
    setIsProcessing(true);
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const extractedData = validFiles.map((file) =>
        generateMockData(file.name),
      );

      setIsProcessing(false);
      return { success: true, data: extractedData };
    } catch (err) {
      setError(err.message || 'Error processing files');
      setIsProcessing(false);
      return { success: false, errors: [err.message] };
    }
  }, []);

  const removeFile = useCallback((index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setUploadedFiles([]);
    setIsProcessing(false);
    setError('');
  }, []);

  return {
    uploadedFiles,
    isProcessing,
    error,
    uploadFiles,
    removeFile,
    reset,
  };
};
