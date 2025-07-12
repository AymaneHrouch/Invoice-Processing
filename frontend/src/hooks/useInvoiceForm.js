import { useState, useEffect } from 'react';

// Utility function to format date for HTML date input
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Handle different date formats
    let date;
    
    if (typeof dateString === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Try to parse the date string
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      console.warn('Invalid date format:', dateString);
      return '';
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateString);
      return '';
    }
    
    const formattedDate = date.toISOString().split('T')[0];
    console.log('Date formatted successfully:', dateString, '->', formattedDate);
    return formattedDate;
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateString);
    return '';
  }
};

export const useInvoiceForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    total_amount: '',
    currency: 'MAD',
    category: '',
    items: [],
    tags: [],
    source_type: 'manual',
    status: 'pending',
    ...initialData
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('useInvoiceForm - Initial data received:', initialData);
      console.log('useInvoiceForm - Original invoice_date:', initialData.invoice_date);
      
      // Convert date format for HTML date input
      const processedData = { ...initialData };
      if (processedData.invoice_date) {
        const formattedDate = formatDateForInput(processedData.invoice_date);
        console.log('useInvoiceForm - Formatted invoice_date:', formattedDate);
        processedData.invoice_date = formattedDate;
      }
      
      console.log('useInvoiceForm - Processed data:', processedData);
      setFormData(prev => ({ ...prev, ...processedData }));
    }
  }, [initialData]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const updateItems = (items) => {
    setFormData(prev => ({ ...prev, items }));
  };

  const updateTags = (tags) => {
    setFormData(prev => ({ ...prev, tags }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vendor_name?.trim()) {
      newErrors.vendor_name = 'Le nom du fournisseur est requis';
    }

    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Le numéro de facture est requis';
    }

    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Le montant doit être supérieur à 0';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'La catégorie est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      invoice_number: '',
      invoice_date: '',
      total_amount: '',
      currency: 'MAD',
      category: '',
      items: [],
      tags: [],
      source_type: 'manual',
      status: 'pending'
    });
    setErrors({});
  };

  const getFormDataForSubmission = () => {
    return {
      ...formData,
      total_amount: parseFloat(formData.total_amount),
      ...(formData.invoice_date && { invoice_date: formData.invoice_date })
    };
  };

  return {
    formData,
    errors,
    updateField,
    updateItems,
    updateTags,
    validateForm,
    resetForm,
    getFormDataForSubmission
  };
}; 