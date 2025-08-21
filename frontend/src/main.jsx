import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import '@/index.css';
import App from '@/App.jsx';
import { ThemeProvider, AuthProvider } from '@/contexts';
import { Toaster } from '@/components/ui/sonner';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  </StrictMode>,
);
