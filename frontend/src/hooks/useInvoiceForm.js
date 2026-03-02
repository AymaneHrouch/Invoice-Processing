import { useEffect, useState, useCallback, useRef } from 'react';

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    if (typeof dateString === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
      if (dateString.includes('T')) return dateString.split('T')[0];
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } else if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    console.warn('Invalid date format:', dateString);
    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const getDefaultForm = () => ({
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
  status: 'extracted',
});

// ✅ Fonction pour transformer les données initiales
const transformInitialData = (data) => {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return getDefaultForm();
  }

  return {
    vendor_name: data.vendor_name || '',
    invoice_number: data.invoice_number || '',
    invoice_date: formatDateForInput(data.invoice_date),
    invoice_due_date: formatDateForInput(data.invoice_due_date),
    total_amount: data.total_amount?.toString() || '',
    currency: data.currency || 'MAD',
    category: data.category || '',
    items: Array.isArray(data.items)
      ? data.items.map((item) => ({
          name: item.name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
        }))
      : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    source_type: data.source_type || 'manual',
    status: data.status || 'extracted',
  };
};

export const useInvoiceForm = (initialData = null, mode = 'create') => {
  // ✅ Référence pour suivre les changements d'initialData
  const lastInitialDataRef = useRef(null);
  const isInitializedRef = useRef(false);

  // ✅ State principal
  const [formData, setFormData] = useState(() => {
    console.log('🚀 useInvoiceForm - Initial state creation:', {
      mode,
      initialData,
    });
    return transformInitialData(mode === 'edit' ? initialData : null);
  });

  const [errors, setErrors] = useState({});

  // ✅ Effet pour surveiller les changements d'initialData
  useEffect(() => {
    console.log('🔄 useInvoiceForm - useEffect triggered:', {
      mode,
      initialData,
      hasInitialData: !!initialData,
      initialDataKeys: initialData ? Object.keys(initialData) : [],
      lastInitialData: lastInitialDataRef.current,
      isInitialized: isInitializedRef.current,
    });

    // Vérifier si initialData a vraiment changé
    const hasChanged = initialData !== lastInitialDataRef.current;

    if (mode === 'edit' && hasChanged && initialData) {
      console.log(
        '📝 useInvoiceForm - Updating form data with new initial data',
      );
      const transformedData = transformInitialData(initialData);
      console.log('📝 useInvoiceForm - Transformed data:', transformedData);

      setFormData(transformedData);
      setErrors({});
      lastInitialDataRef.current = initialData;
      isInitializedRef.current = true;
    } else if (mode === 'create' && !isInitializedRef.current) {
      console.log('🆕 useInvoiceForm - Initializing create mode');
      setFormData(getDefaultForm());
      isInitializedRef.current = true;
    }
  }, [mode, initialData]);

  // ✅ Fonction de réinitialisation forcée
  const forceUpdate = useCallback((newData) => {
    console.log('🔄 useInvoiceForm - Force update called:', newData);
    const transformedData = transformInitialData(newData);
    setFormData(transformedData);
    setErrors({});
    lastInitialDataRef.current = newData;
  }, []);

  const updateField = useCallback(
    (field, value) => {
      console.log('✏️  useInvoiceForm - updateField:', field, value);
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };
        console.log('✏️  useInvoiceForm - New form data:', newData);
        return newData;
      });

      // Nettoyer l'erreur pour ce champ
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const updateItems = useCallback((items) => {
    console.log('📦 useInvoiceForm - updateItems:', items);
    const processedItems = items.map((item) => ({
      name: item.name || '',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      total: Number(item.total) || 0,
    }));

    setFormData((prev) => ({ ...prev, items: processedItems }));
  }, []);

  const updateTags = useCallback((tags) => {
    console.log('🏷️  useInvoiceForm - updateTags:', tags);
    setFormData((prev) => ({ ...prev, tags: Array.isArray(tags) ? tags : [] }));
  }, []);

  const validateForm = useCallback(() => {
    console.log('✅ useInvoiceForm - validateForm called');
    const newErrors = {};

    if (!formData.vendor_name?.trim()) {
      newErrors.vendor_name = 'Supplier name is required!';
    }
    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Invoice number is required!';
    }
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Amount must be greater than 0!';
    }
    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required!';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('✅ useInvoiceForm - Validation result:', {
      isValid,
      errors: newErrors,
    });
    return isValid;
  }, [formData]);

  const resetForm = useCallback(() => {
    console.log('🔄 useInvoiceForm - resetForm called');
    setFormData(getDefaultForm());
    setErrors({});
    lastInitialDataRef.current = null;
    isInitializedRef.current = false;
  }, []);

  const getFormDataForSubmission = useCallback(() => {
    const submission = {
      ...formData,
      total_amount: parseFloat(formData.total_amount) || 0,
      invoice_date: formData.invoice_date?.trim() || null,
      invoice_due_date: formData.invoice_due_date?.trim() || null,
    };

    console.log('📤 useInvoiceForm - getFormDataForSubmission:', submission);
    return submission;
  }, [formData]);

  // ✅ Legacy function pour compatibilité
  const setInitialValues = useCallback(
    (data) => {
      console.log(
        '🔧 useInvoiceForm - setInitialValues (legacy) called:',
        data,
      );
      forceUpdate(data);
    },
    [forceUpdate],
  );

  // ✅ Debug effect
  useEffect(() => {
    console.log('📊 useInvoiceForm - Current state:', {
      formDataVendor: formData.vendor_name,
      formDataNumber: formData.invoice_number,
      formDataAmount: formData.total_amount,
      errorsCount: Object.keys(errors).length,
    });
  }, [formData, errors]);

  return {
    formData,
    errors,
    updateField,
    updateItems,
    updateTags,
    validateForm,
    resetForm,
    setInitialValues,
    forceUpdate, // ✅ Nouvelle fonction pour forcer la mise à jour
    getFormDataForSubmission,
  };
};
