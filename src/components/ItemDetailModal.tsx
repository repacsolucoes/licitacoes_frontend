import React, { useEffect } from 'react';
import { ItemLicitacao } from '../types';
import { X } from 'lucide-react';

interface ItemDetailModalProps {
  item: ItemLicitacao;
  onClose: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatQuantity = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Detalhes do Item
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código do Item
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                {item.codigo_item}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade de Medida
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {item.unidade_medida}
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[60px]">
              {item.descricao}
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-center">
                {formatQuantity(item.quantidade)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço Unitário
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-center">
                {formatCurrency(item.preco_unitario)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço Total
              </label>
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-center font-semibold">
                {formatCurrency(item.preco_total)}
              </div>
            </div>
          </div>

          {/* Marca/Modelo */}
          {item.marca_modelo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca/Modelo
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                {item.marca_modelo}
              </div>
            </div>
          )}

          {/* Especificações Técnicas */}
          {item.especificacoes_tecnicas && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especificações Técnicas
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[60px]">
                {item.especificacoes_tecnicas}
              </div>
            </div>
          )}

          {/* Observações */}
          {item.observacoes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[60px]">
                {item.observacoes}
              </div>
            </div>
          )}

          {/* Informações do Sistema */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <span className="font-medium">ID do Item:</span> {item.id || 'N/A'}
              </div>
              <div>
                <span className="font-medium">ID da Licitação:</span> {item.licitacao_id || 'N/A'}
              </div>
              {item.created_at && (
                <div>
                  <span className="font-medium">Criado em:</span> {new Date(item.created_at).toLocaleString('pt-BR')}
                </div>
              )}
              {item.updated_at && (
                <div>
                  <span className="font-medium">Atualizado em:</span> {new Date(item.updated_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
