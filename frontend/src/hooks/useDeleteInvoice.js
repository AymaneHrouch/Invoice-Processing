import { useState } from 'react';
import { deleteInvoice } from '@/api/invoice';

export const useDeleteInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const removeInvoice = async (id) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await deleteInvoice(id);
      setMessage(result.message || 'Invoice deleted successfully');
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete invoice');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { removeInvoice, loading, error, message };
}; 