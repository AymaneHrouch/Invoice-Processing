import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import App from '@/App.jsx';
import { ThemeProvider, AuthProvider } from '@/contexts';
import { Toaster } from '@/components/ui/sonner';

// Create a client
const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <App />
            <Toaster position="top-center" />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  </StrictMode>,
);
