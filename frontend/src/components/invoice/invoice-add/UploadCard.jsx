import { Sparkles, FileText, X } from 'lucide-react';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTheme } from '@/contexts';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export const UploadCard = ({
  uploadedFiles,
  isProcessing,
  onFilesUpload,
  onRemoveFile,
  error,
  success,
  message,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <Card
      className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm pt-0 overflow-hidden`}
    >
      <CardHeader className="py-6 bg-gradient-to-r from-purple-500/30 via-pink-500/20 to-fuchsia-600/10">
        <CardTitle
          className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        >
          <Sparkles className={'w-5 h-5 text-purple-600'} />
          Artificial Intelligence
        </CardTitle>
        <CardDescription
          className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
        >
          Drag and drop your invoices and let AI extract the data automatically
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <FileDropZone
          onFilesSelect={onFilesUpload}
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
        />

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
            >
              Selected files ({uploadedFiles.length}):
            </h4>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`rounded-lg p-3 flex items-center justify-between
                  ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700 text-blue-200'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveFile(index)}
                  className={`h-7 w-7 p-1 rounded-md ${
                    isDarkMode
                      ? 'text-red-400 hover:text-red-600 hover:bg-red-900/40'
                      : 'text-red-500 hover:text-red-700 hover:bg-red-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <LoadingSpinner size="lg" />
              <p
                className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-4 text-sm`}
              >
                Processing {uploadedFiles.length} file
                {uploadedFiles.length > 1 ? 's' : ''} with AI...
              </p>
            </div>
          </div>
        )}

        {success && (
          <Alert
            variant="success"
            className="border-green-500 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
