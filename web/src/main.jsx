import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import './index.css';
import './lib/i18n';
import { AuthProvider } from './lib/auth';
import App from './App';

// Multi-tenant preview: /?school=<slug> pins the public website to that school for this tab
const slug = new URLSearchParams(location.search).get('school');
if (slug) sessionStorage.setItem('rny_site', slug);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px' } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
