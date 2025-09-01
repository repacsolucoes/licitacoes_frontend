import React from 'react';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import { Documentacao } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentosVencendo: Documentacao[];
}

const NotificationModal: React.FC<NotificationModalProps> = ({ 
  isOpen, 
  onClose, 
  documentosVencendo 
}) => {
  if (!isOpen) return null;

  // Separar documentos por status
  const docsVencendo = documentosVencendo.filter(doc => doc.status === 'VENCENDO');
  const documentosVencidos = documentosVencendo.filter(doc => doc.status === 'EXPIRADO');

  const totalDocumentos = docsVencendo.length + documentosVencidos.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Documentos com Prazo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Você tem <strong>{totalDocumentos}</strong> documento(s) que precisam de atenção:
          </p>
          
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {/* Documentos Vencidos */}
            {documentosVencidos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <h4 className="font-medium text-red-600 text-sm">
                    Vencidos ({documentosVencidos.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {documentosVencidos.map((doc) => (
                    <div key={doc.id} className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{doc.titulo || 'Sem título'}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            Tipo: {(doc.tipo_documento || '').replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            Venceu em: {doc.data_validade ? new Date(doc.data_validade).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos Vencendo */}
            {docsVencendo.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-600 text-sm">
                    Vencendo ({docsVencendo.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {docsVencendo.map((doc) => (
                    <div key={doc.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{doc.titulo || 'Sem título'}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            Tipo: {(doc.tipo_documento || '').replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            Vence em: {doc.data_validade ? new Date(doc.data_validade).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              window.location.href = '/documentacoes';
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Ver Documentações
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
