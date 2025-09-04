import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'OK',
  cancelText = 'Cancelar'
}) => {
  // 🎯 NOVO: Listener para teclas Esc e Enter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter') {
        // 🎯 NOVO: Enter confirma a ação
        onConfirm();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case 'info':
        return <Info className="h-8 w-8 text-blue-500" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          title: 'text-green-800',
          message: 'text-green-700',
          confirmBtn: 'bg-green-600 hover:bg-green-700 text-white',
          cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          title: 'text-red-800',
          message: 'text-red-700',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          title: 'text-blue-800',
          message: 'text-blue-700',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
          cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          cancelBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div className={`p-6 ${colors.bg} ${colors.border} border-t-4 rounded-t-xl`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {getIcon()}
              <h3 className={`ml-3 text-lg font-semibold ${colors.title}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className={`text-sm ${colors.message} leading-relaxed`}>
            {message}
          </p>
        </div>
        
        <div className="p-6 bg-white rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${colors.cancelBtn}`}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${colors.confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
