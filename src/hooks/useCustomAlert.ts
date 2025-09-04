import { useState } from 'react';

interface AlertOptions {
  title: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    onConfirm: () => void;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    onConfirm: () => {}
  });

  const showAlert = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        onConfirm: () => resolve(true)
      });
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const confirm = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options: {
          ...options,
          confirmText: options.confirmText || 'Confirmar',
          cancelText: options.cancelText || 'Cancelar'
        },
        onConfirm: () => {
          resolve(true);
          hideAlert();
        }
      });
    });
  };

  return {
    alertState,
    showAlert,
    hideAlert,
    confirm
  };
};
