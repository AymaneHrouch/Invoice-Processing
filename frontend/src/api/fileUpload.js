import api from './baseApi';
export const uploadFiles = async (formData, direction = 'incoming') => {
  try {
    const response = await api.post('/invoices/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: { direction },
    });
    return response.data.extracted_data;
  } catch (err) {
    console.log(err);
  }
};
