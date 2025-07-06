import { Routes, Route, Navigate } from 'react-router-dom';
import { NavBar, Sidebar } from '@/components';
import { InvoiceAddPage } from '@/pages';
import { useTheme } from '@/contexts';
import InvoiceTable from './components/invoice/InvoiceTable';
function App() {
  const { isDarkMode } = useTheme();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
        <NavBar />
        <div className="flex flex-row flex-1 overflow-hidden">
          <Sidebar />
          <main className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
            <Routes>
              <Route path="/invoices/add" element={<InvoiceAddPage />} />
              {/* <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} /> */}
              <Route path="/invoices/list" element={<InvoiceTable />} />
            </Routes>
          </main>
        </div>
      </div>
  )
}

export default App
