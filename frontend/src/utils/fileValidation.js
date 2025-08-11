import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/constants';

export const validateFiles = (files) => {
  const errors = [];
  const validFiles = [];

  files.forEach((file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!SUPPORTED_FILE_TYPES.includes(fileExtension)) {
      errors.push(`${file.name}: Unsupported file type`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      return;
    }

    validFiles.push(file);
  });

  return { validFiles, errors };
};
