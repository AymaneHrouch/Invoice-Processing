import { useState } from 'react';
import { useFileUpload, useInvoiceData } from '@/hooks';
import { UploadCard } from './UploadCard';
import { ExtractedDataForm } from './ExtractedDataForm';

const AutoInvoice = () => {
  const {
    uploadedFiles,
    isProcessing,
    error: uploadError,
    uploadFiles,
    removeFile,
  } = useFileUpload();

  const {
    extractedData,
    setExtractedData,
    currentInvoiceIndex,
    setCurrentInvoiceIndex,
    updateFormData,
    removeInvoice,
  } = useInvoiceData();

  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleFilesUpload = async (files) => {
    const result = await uploadFiles(files);
    if (result.success) {
      setExtractedData(result.data);
      setCurrentInvoiceIndex(0);
      setSuccess(true);
      setMessage(
        `Successfully processed ${files.length} file${files.length > 1 ? 's' : ''}`,
      );
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
      }, 3000);
    }
  };

  const handleInvoiceProcessed = (invoiceIndex) => {
    removeInvoice(invoiceIndex);
    setSuccess(true);
    setMessage(`Invoice ${invoiceIndex + 1} processed successfully!`);
    setTimeout(() => {
      setSuccess(false);
      setMessage('');
    }, 3000);
  };

  return (
    <div data-tab="file" className="space-y-6">
      <UploadCard
        uploadedFiles={uploadedFiles}
        isProcessing={isProcessing}
        onFilesUpload={handleFilesUpload}
        onRemoveFile={removeFile}
        error={uploadError}
        success={success}
        message={message}
      />

      {extractedData.length > 0 && !isProcessing && (
        <ExtractedDataForm
          uploadedFiles={uploadedFiles}
          extractedData={extractedData}
          currentInvoiceIndex={currentInvoiceIndex}
          setCurrentInvoiceIndex={setCurrentInvoiceIndex}
          updateFormData={updateFormData}
          onInvoiceProcessed={handleInvoiceProcessed}
        />
      )}
    </div>
  );
};

export default AutoInvoice;
