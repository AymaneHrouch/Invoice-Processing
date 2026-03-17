import { useEffect, useState } from 'react';
import { getCategories } from '@/api/company';

const DEFAULT_CATEGORIES = [
  'Services',
  'Equipment',
  'Software',
  'Travel',
  'Marketing',
  'Utilities',
  'Others',
];

export const useCategories = () => {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories(DEFAULT_CATEGORIES))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
};
