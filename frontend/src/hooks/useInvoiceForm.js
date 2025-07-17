import { useState, useEffect } from 'react';

// Utility function to format date for HTML date input
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Handle different date formats
    if (typeof dateString === 'string') {
      // Si c'est déjà au format YYYY-MM-DD, retourner tel quel
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Extraire directement la partie date sans conversion timezone
      // pour éviter le décalage dû au fuseau horaire
      if (dateString.includes('T')) {
        return dateString.split('T')[0];
      }
      
      // Sinon, essayer de parser la date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        // Extraire juste la partie date (YYYY-MM-DD) sans conversion timezone
        return date.toISOString().split('T')[0];
      }
    } else if (dateString instanceof Date) {
      // Pour les objets Date, extraire juste la partie date
      return dateString.toISOString().split('T')[0];
    }
    
    console.warn('Invalid date format:', dateString);
    return '';
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateString);
    return '';
  }
};

export const useInvoiceForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: formatDateForInput(new Date()),
    invoice_due_date: '',
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
      const processedData = { ...initialData };
  
      processedData.invoice_date = formatDateForInput(processedData.invoice_date);
      processedData.invoice_due_date = formatDateForInput(processedData.invoice_due_date);
  
      setFormData(processedData); 
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
      newErrors.vendor_name = 'The supplier name is required !';
    }

    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'The invoice number is required !';
    }

    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'The amount must be greater than 0 !';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'The category is required !';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      invoice_number: '',
      invoice_date: formatDateForInput(new Date()),
      invoice_due_date: '',
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
    const submission = {
        ...formData,
        total_amount: parseFloat(formData.total_amount)
    };

    // Convertir les dates vides en null au lieu de les supprimer
    if (!formData.invoice_date || formData.invoice_date.trim() === '') {
        submission.invoice_date = null;
    }

    if (!formData.invoice_due_date || formData.invoice_due_date.trim() === '') {
        submission.invoice_due_date = null;
    }

    return submission;
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