import React, { useState } from 'react';
import { ItemLicitacao } from '../types';
import { Edit, Trash2, Eye } from 'lucide-react';

interface ItemsTableProps {
  items: ItemLicitacao[];
  onEdit: (item: ItemLicitacao) => void;
  onDelete: (itemId: number) => void;
  onView: (item: ItemLicitacao) => void;
  onUpdatePosicao?: (itemId: number, novaPosicao: string) => void;
}

const ItemsTable: React.FC<ItemsTableProps> = ({ items, onEdit, onDelete, onView, onUpdatePosicao }) => {
  const [editingPosicao, setEditingPosicao] = useState<number | null>(null);
  const [tempPosicoes, setTempPosicoes] = useState<Record<number, string>>({});

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

  const startEditingPosicao = (itemId: number, currentPosicao: string) => {
    setEditingPosicao(itemId);
    setTempPosicoes(prev => ({ ...prev, [itemId]: currentPosicao }));
  };

  const savePosicao = (itemId: number) => {
    if (onUpdatePosicao) {
      onUpdatePosicao(itemId, tempPosicoes[itemId] || '');
    }
    
    setEditingPosicao(null);
    setTempPosicoes(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  const cancelEditingPosicao = () => {
    setEditingPosicao(null);
    setTempPosicoes(prev => {
      const newState = { ...prev };
      delete newState[editingPosicao!];
      return newState;
    });
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhum item cadastrado ainda.</p>
        <p className="text-sm">Clique em "Adicionar Item" para começar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Itens da Licitação ({items.length})
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qtd.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preço Unit.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preço Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marca/Modelo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posição
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.codigo_item}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  <div className="truncate" title={item.descricao}>
                    {item.descricao}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatQuantity(item.quantidade)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.unidade_medida}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(item.preco_unitario)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {formatCurrency(item.preco_total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.marca_modelo || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingPosicao === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tempPosicoes[item.id!] || ''}
                        onChange={(e) => setTempPosicoes(prev => ({ ...prev, [item.id!]: e.target.value }))}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1º"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            savePosicao(item.id!);
                          } else if (e.key === 'Escape') {
                            cancelEditingPosicao();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => savePosicao(item.id!)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded text-xs"
                        title="Salvar posição"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingPosicao}
                        className="p-1 text-red-600 hover:bg-red-50 rounded text-xs"
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span 
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          item.posicao 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.posicao || 'Não definida'}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditingPosicao(item.id!, item.posicao || '')}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded text-xs"
                        title="Editar posição"
                      >
                        ✎
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Visualizar detalhes"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Editar item"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id!)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Resumo dos valores */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total de itens: <span className="font-semibold">{items.length}</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Valor Total: <span className="text-lg font-bold text-gray-900">
                {formatCurrency(items.reduce((sum, item) => sum + item.preco_total, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsTable;
