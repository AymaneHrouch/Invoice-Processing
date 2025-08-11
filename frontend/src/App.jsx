import { Routes, Route, Navigate } from 'react-router-dom';
import { NavBar, Sidebar } from '@/components';
import { InvoiceAddPage, InvoiceListPage, DashboardPage } from '@/pages';
import { useTheme } from '@/contexts';
function App() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        <NavBar />
        <div className="flex flex-row flex-1 overflow-hidden">
          <Sidebar />
          <main
            className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-100'} scrollbar-thin scrollbar-track-gray-100 dark:scrollbar-track-gray-800 scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500`}
          >
            <Routes>
              <Route path="/invoices/add" element={<InvoiceAddPage />} />
              <Route path="/invoices/list" element={<InvoiceListPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/*<Route path="*" element={<Navigate to="/dashboard" replace />} /> */}
            </Routes>
          </main>
        </div>
      </div>
      <style jsx>{`
        /* Scrollbar styling for Webkit browsers */
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }

        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }

        .dark .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }

        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }

        .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }

        .hover\\:scrollbar-thumb-gray-400:hover::-webkit-scrollbar-thumb {
          background: #9ca3af;
        }

        .dark .hover\\:scrollbar-thumb-gray-500:hover::-webkit-scrollbar-thumb {
          background: #6b7280;
        }

        /* Pour Firefox */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f3f4f6;
        }

        .dark .scrollbar-thin {
          scrollbar-color: #4b5563 #1f2937;
        }
      `}</style>
    </>
  );
}

export default App;
