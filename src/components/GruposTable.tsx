import React from 'react';
import { ItemLicitacao } from '../types';
import { Edit, Trash2, Eye, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Grupo {
  id: number;
  nome: string;
  posicao?: string;
  itens: ItemLicitacao[];
}

interface GruposTableProps {
  grupos: Grupo[];
  onEdit: (grupo: Grupo) => void;
  onDelete: (grupoId: number) => void;
  onViewItem: (item: ItemLicitacao) => void;
  onUpdatePosicao?: (grupoId: number, novaPosicao: string) => void;
}

const GruposTable: React.FC<GruposTableProps> = ({ grupos, onEdit, onDelete, onViewItem, onUpdatePosicao }) => {
  const [expandedGrupos, setExpandedGrupos] = useState<Set<number>>(new Set());
  const [editingPosicao, setEditingPosicao] = useState<number | null>(null);
  const [tempPosicao, setTempPosicao] = useState<string>('');

  const toggleGrupo = (grupoId: number) => {
    const newExpanded = new Set(expandedGrupos);
    if (newExpanded.has(grupoId)) {
      newExpanded.delete(grupoId);
    } else {
      newExpanded.add(grupoId);
    }
    setExpandedGrupos(newExpanded);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateGrupoTotal = (itens: ItemLicitacao[]): number => {
    return itens.reduce((sum, item) => sum + item.preco_total, 0);
  };

  const startEditingPosicao = (grupoId: number, currentPosicao: string) => {
    setEditingPosicao(grupoId);
    setTempPosicao(currentPosicao);
  };

  const savePosicao = (grupoId: number) => {
    if (onUpdatePosicao) {
      onUpdatePosicao(grupoId, tempPosicao);
    }
    setEditingPosicao(null);
    setTempPosicao('');
  };

  const cancelEditingPosicao = () => {
    setEditingPosicao(null);
    setTempPosicao('');
  };

  if (grupos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
        <p>Nenhum grupo cadastrado ainda.</p>
        <p className="text-sm">Clique em "Adicionar Grupo" para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => {
        const isExpanded = expandedGrupos.has(grupo.id);
        const grupoTotal = calculateGrupoTotal(grupo.itens);
        
        return (
          <div key={grupo.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header do Grupo */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-600" />
                    )}
                  </button>
                  <FolderOpen size={20} className="text-blue-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{grupo.nome}</h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-600">
                        {grupo.itens.length} item{grupo.itens.length !== 1 ? 's' : ''} • 
                        Total: {formatCurrency(grupoTotal)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Posição:</span>
                        {editingPosicao === grupo.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempPosicao}
                              onChange={(e) => setTempPosicao(e.target.value)}
                              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="1º"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  savePosicao(grupo.id);
                                } else if (e.key === 'Escape') {
                                  cancelEditingPosicao();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => savePosicao(grupo.id)}
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
                                grupo.posicao 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {grupo.posicao || 'Não definida'}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditingPosicao(grupo.id, grupo.posicao || '')}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded text-xs"
                              title="Editar posição"
                            >
                              ✎
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(grupo)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar grupo"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(grupo.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir grupo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Itens do Grupo (expandido) */}
            {isExpanded && (
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CÓDIGO
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DESCRIÇÃO
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          QTD.
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          UNIDADE
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PREÇO UNIT.
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PREÇO TOTAL
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          MARCA/MODELO
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          AÇÕES
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {grupo.itens.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.codigo_item}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {item.descricao}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.unidade_medida}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(item.preco_unitario)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(item.preco_total)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {item.marca_modelo || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            <button
                              type="button"
                              onClick={() => onViewItem(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GruposTable;
