import { useEffect, useState } from 'react';
import { Upload, FileText, Edit, Sparkles } from 'lucide-react';
import Cookies from 'js-cookie';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ManualInvoice, AutoInvoice } from '@/components';
import { useTheme } from '@/contexts';

const TAB_COOKIE_KEY = 'lastInvoiceTab';

const InvoiceAddPage = ({ direction = 'incoming' }) => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('manual');

  useEffect(() => {
    const savedTab = Cookies.get(TAB_COOKIE_KEY);
    if (savedTab === 'manual' || savedTab === 'file') {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    Cookies.set(TAB_COOKIE_KEY, tab, { expires: 7 });
  };

  return (
    <main
      className={`min-h-screen w-full ${isDarkMode ? 'dark bg-gray-800' : 'bg-gray-50'} p-6 mx-auto rounded-lg shadow-md`}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
          <div>
            <h1
              className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Add an invoice
            </h1>
            <p
              className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Manage your invoices with a modern and intuitive interface.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList
          className={`grid w-full grid-cols-2 mb-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-1 h-auto`}
        >
          <TabsTrigger
            value="manual"
            className={`flex items-center gap-2 py-3 px-6 ${isDarkMode ? 'data-[state=active]:bg-gray-700' : 'data-[state=active]:bg-white'} data-[state=active]:shadow-sm`}
          >
            <Edit className="w-4 h-4" />
            Manual addition
          </TabsTrigger>
          <TabsTrigger
            value="file"
            className={`flex items-center gap-2 py-3 px-6 ${isDarkMode ? 'data-[state=active]:bg-gray-700' : 'data-[state=active]:bg-white'} data-[state=active]:shadow-sm`}
          >
            <Upload className="w-4 h-4" />
            AI processing
          </TabsTrigger>
        </TabsList>

        {/* Manual Invoice Tab Content */}
        <TabsContent value="manual">
          <ManualInvoice direction={direction} />
        </TabsContent>

        {/* Auto Invoice Tab Content */}
        <TabsContent value="file">
          <AutoInvoice direction={direction} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default InvoiceAddPage;
