'use client';

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900',
          border: 'border-green-500',
          text: 'text-green-800 dark:text-green-100',
          icon: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900',
          border: 'border-red-500',
          text: 'text-red-800 dark:text-red-100',
          icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900',
          border: 'border-yellow-500',
          text: 'text-yellow-800 dark:text-yellow-100',
          icon: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-md w-full sm:w-auto animate-in slide-in-from-top-5 duration-300`}
    >
      <div
        className={`${styles.bg} ${styles.text} border-l-4 ${styles.border} p-4 rounded-lg shadow-2xl flex items-start space-x-3 backdrop-blur-sm`}
      >
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="flex-1 pt-0.5">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-3 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ animationDelay: `${index * 100}ms` }}
          className="animate-in slide-in-from-right-5"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

