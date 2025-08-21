import { uploadFile as sendFile } from '@/api';

export const useUploadFile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const uploadFile = async (files) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setMessage('');
    try {
      const response = await sendFile(files);
      setSuccess(true);
      setMessage('Files Uploaded successfully !');
      return response;
    } catch (e) {
      setError(e.message || 'Error while uploading files.');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setMessage('');
  };

  return { uploadFile, loading, error, success, message, reset };
};
