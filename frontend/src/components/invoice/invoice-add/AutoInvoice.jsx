import { useState } from 'react';
import UploadCard from './UploadCard';
import ExtractedDataForm from './ExtractedDataForm';

const AutoInvoice = () => {
  // Mock constants
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);

  return (
    <div data-tab="file" className="space-y-6">
      {/* Upload Card */}
      <UploadCard
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        extractedData={extractedData}
        setExtractedData={setExtractedData}
        currentInvoiceIndex={currentInvoiceIndex}
        setCurrentInvoiceIndex={setCurrentInvoiceIndex}
      />

      {/* Extracted Data Form with Carousel */}
      {extractedData.length > 0 && !isProcessing && (
        <ExtractedDataForm
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          extractedData={extractedData}
          setExtractedData={setExtractedData}
          currentInvoiceIndex={currentInvoiceIndex}
          setCurrentInvoiceIndex={setCurrentInvoiceIndex}
        />
      )}
    </div>
  );
};

export default AutoInvoice;
