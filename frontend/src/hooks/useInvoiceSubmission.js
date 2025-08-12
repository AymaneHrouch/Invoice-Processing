import { useState, useCallback } from 'react';

export const useInvoiceSubmission = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const submitInvoice = useCallback(async (invoiceData) => {
    if (!invoiceData.supplier || !invoiceData.amount || !invoiceData.date) {
      setError('Please fill in the required fields: supplier, amount, date.');
      return { success: false };
    }

    setLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(true);
      setMessage('Invoice saved successfully!');

      setTimeout(() => {
        setSuccess(false);
        setMessage('');
      }, 3000);

      return { success: true };
    } catch (err) {
      setError('Failed to save invoice');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError('');
    setSuccess(false);
    setMessage('');
  }, []);

  return {
    loading,
    error,
    success,
    message,
    submitInvoice,
    reset,
  };
};
