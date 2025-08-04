import { useState, useCallback } from 'react';
import { calculateItemTotal } from '@/utils';

export const useInvoiceData = () => {
  const [extractedData, setExtractedData] = useState([]);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);

  const updateFormData = useCallback(
    (field, value) => {
      setExtractedData((prev) => {
        const newData = [...prev];
        newData[currentInvoiceIndex] = {
          ...newData[currentInvoiceIndex],
          [field]: value,
        };
        return newData;
      });
    },
    [currentInvoiceIndex],
  );

  const updateItem = useCallback(
    (itemIndex, field, value) => {
      setExtractedData((prev) => {
        const newData = [...prev];
        const newItems = [...newData[currentInvoiceIndex].items];
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          [field]: value,
        };
        newData[currentInvoiceIndex].items = newItems;
        return newData;
      });
    },
    [currentInvoiceIndex],
  );

  const addItem = useCallback(() => {
    setExtractedData((prev) => {
      const newData = [...prev];
      newData[currentInvoiceIndex].items.push({
        name: '',
        description: '',
        quantity: 1,
        unit_price: '0.00',
      });
      return newData;
    });
  }, [currentInvoiceIndex]);

  const removeItem = useCallback(
    (itemIndex) => {
      setExtractedData((prev) => {
        const newData = [...prev];
        newData[currentInvoiceIndex].items = newData[
          currentInvoiceIndex
        ].items.filter((_, i) => i !== itemIndex);
        return newData;
      });
    },
    [currentInvoiceIndex],
  );

  const removeTag = useCallback(
    (tagToRemove) => {
      setExtractedData((prev) => {
        const newData = [...prev];
        newData[currentInvoiceIndex].tags = newData[
          currentInvoiceIndex
        ].tags.filter((tag) => tag !== tagToRemove);
        return newData;
      });
    },
    [currentInvoiceIndex],
  );

  const removeInvoice = useCallback(
    (index) => {
      setExtractedData((prev) => {
        const newData = prev.filter((_, i) => i !== index);
        return newData;
      });

      setCurrentInvoiceIndex((prev) => {
        if (extractedData.length <= 1) return 0;
        if (index <= prev) return Math.max(0, prev - 1);
        return prev;
      });
    },
    [extractedData.length],
  );

  return {
    extractedData,
    setExtractedData,
    currentInvoiceIndex,
    setCurrentInvoiceIndex,
    updateFormData,
    removeInvoice,
  };
};
