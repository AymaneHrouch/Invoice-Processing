import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useTheme } from '@/contexts';

export const FileDropZone = ({
  onFilesSelect,
  accept,
  multiple = true,
  className = '',
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        transition-all duration-300 rounded-xl border border-dashed cursor-pointer p-10 backdrop-blur-md 
        ${
          dragActive
            ? isDarkMode
              ? 'bg-blue-900/30 border-blue-500 scale-[1.02]'
              : 'bg-blue-100/50 border-blue-400 scale-[1.02]'
            : isDarkMode
              ? 'bg-gray-800/40 border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
              : 'bg-white/50 border-gray-300 hover:border-gray-400 hover:bg-gray-100/30'
        }
        ${className}
      `}
    >
      <div className="space-y-4 text-center">
        <div
          className={`mx-auto w-14 h-14 flex items-center justify-center rounded-full shadow 
          ${isDarkMode ? 'bg-gradient-to-r from-blue-900 to-purple-900' : 'bg-gradient-to-r from-blue-500 to-purple-600'}`}
        >
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3
            className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
          >
            Drag and drop your invoices
          </h3>
          <p
            className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Supported formats: PDF, PNG, JPG, JPEG
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors
            ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300'
            }
          `}
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
