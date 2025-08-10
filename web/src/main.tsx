import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Initialize i18n before rendering the app
import './i18n';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { ToastProvider } from './shared/toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
