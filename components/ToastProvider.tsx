'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#0F1420',
          color: '#E2E8F0',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          fontSize: '13px',
          borderRadius: '12px',
        },
        success: {
          iconTheme: { primary: '#34D399', secondary: '#0F1420' },
        },
        error: {
          iconTheme: { primary: '#F43F5E', secondary: '#0F1420' },
        },
      }}
    />
  );
}
