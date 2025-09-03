import React, { useState, useEffect } from 'react';
import { X, Package, FileText, DollarSign, Truck, CheckCircle } from 'lucide-react';
import { Licitacao, QuantidadesDisponiveis, PedidoCompleto, ItemPedido, Empenho } from '../types';

interface PedidoFormProps {
  licitacoes: Licitacao[];
  selectedLicitacao: Licitacao | null;
  quantidadesDisponiveis: QuantidadesDisponiveis | null;
  editingPedido: PedidoCompleto | null;
  onLicitacaoSelect: (licitacao: Licitacao) => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface FormData {
  licitacao_id: number;
  itens: Array<{
    item_licitacao_id: number;
    quantidade_solicitada: number;
  }>;
  empenhos: Array<{
    numero_empenho: string;
    data_empenho: string;
    valor_empenhado: number;
    observacoes: string;
    status: string;
  }>;
  observacoes_gerais: string;
}

const PedidoForm: React.FC<PedidoFormProps> = ({
  licitacoes,
  selectedLicitacao,
  quantidadesDisponiveis,
  editingPedido,
  onLicitacaoSelect,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState<FormData>({
    licitacao_id: 0,
    itens: [],
    empenhos: [],
    observacoes_gerais: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEmpenhoForm, setShowEmpenhoForm] = useState(false);
  const [editingEmpenho, setEditingEmpenho] = useState<Empenho | null>(null);

  // Inicializar formulário quando editingPedido mudar
  useEffect(() => {
    if (editingPedido) {
      setFormData({
        licitacao_id: editingPedido.licitacao_id,
        itens: editingPedido.itens_pedido.map(item => ({
          item_licitacao_id: item.item_licitacao_id,
          quantidade_solicitada: item.quantidade_solicitada
        })),
        empenhos: editingPedido.empenhos.map(empenho => ({
          numero_empenho: empenho.numero_empenho,
          data_empenho: empenho.data_empenho,
          valor_empenhado: empenho.valor_empenhado,
          observacoes: empenho.observacoes || '',
          status: empenho.status
        })),
        observacoes_gerais: editingPedido.observacoes_gerais || ''
      });
    }
  }, [editingPedido]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.licitacao_id) {
      newErrors.licitacao_id = 'Licitação é obrigatória';
    }

    if (formData.itens.length === 0) {
      newErrors.itens = 'Pelo menos um item deve ser selecionado';
    }

    // Validar quantidades
    formData.itens.forEach((item, index) => {
      if (item.quantidade_solicitada <= 0) {
        newErrors[`item_${index}`] = 'Quantidade deve ser maior que zero';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleLicitacaoChange = (licitacaoId: number) => {
    const licitacao = licitacoes.find(l => l.id === licitacaoId);
    if (licitacao) {
      onLicitacaoSelect(licitacao);
      setFormData(prev => ({ ...prev, licitacao_id: licitacaoId, itens: [] }));
    }
  };

  const handleItemQuantityChange = (itemIndex: number, quantidade: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, index) => 
        index === itemIndex 
          ? { ...item, quantidade_solicitada: quantidade }
          : item
      )
    }));
  };

  const handleAddItem = (itemId: number, quantidade: number) => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { item_licitacao_id: itemId, quantidade_solicitada: quantidade }]
    }));
  };

  const handleRemoveItem = (itemIndex: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, index) => index !== itemIndex)
    }));
  };

  const handleAddEmpenho = (empenho: any) => {
    if (editingEmpenho) {
      setFormData(prev => ({
        ...prev,
        empenhos: prev.empenhos.map((e, index) => 
          index === editingEmpenho.id ? empenho : e
        )
      }));
      setEditingEmpenho(null);
    } else {
      setFormData(prev => ({
        ...prev,
        empenhos: [...prev.empenhos, empenho]
      }));
    }
    setShowEmpenhoForm(false);
  };

  const handleRemoveEmpenho = (empenhoIndex: number) => {
    setFormData(prev => ({
      ...prev,
      empenhos: prev.empenhos.filter((_, index) => index !== empenhoIndex)
    }));
  };

  const getItemInfo = (itemId: number) => {
    if (!quantidadesDisponiveis) return null;
    
    if (quantidadesDisponiveis.tipo_classificacao === 'ITEM') {
      return quantidadesDisponiveis.itens_disponiveis.find((item: any) => item.item_id === itemId);
    } else {
      for (const grupo of quantidadesDisponiveis.itens_disponiveis) {
        const item = grupo.itens.find((item: any) => item.item_id === itemId);
        if (item) return item;
      }
    }
    return null;
  };

  const isItemSelected = (itemId: number) => {
    return formData.itens.some(item => item.item_licitacao_id === itemId);
  };

  const getTotalValue = () => {
    return formData.itens.reduce((total, item) => {
      const itemInfo = getItemInfo(item.item_licitacao_id);
      return total + (itemInfo?.preco_unitario || 0) * item.quantidade_solicitada;
    }, 0);
  };

  const getTotalCost = () => {
    return formData.itens.reduce((total, item) => {
      const itemInfo = getItemInfo(item.item_licitacao_id);
      return total + (itemInfo?.custo_unitario || 0) * item.quantidade_solicitada;
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
            </h2>
            <p className="text-gray-600">
              {editingPedido ? 'Edite os dados do pedido' : 'Crie um novo pedido para uma licitação'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Seleção de Licitação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Licitação *
            </label>
            <select
              value={formData.licitacao_id}
              onChange={(e) => handleLicitacaoChange(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.licitacao_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={!!editingPedido}
            >
              <option value={0}>Selecione uma licitação</option>
              {licitacoes.map((licitacao) => (
                <option key={licitacao.id} value={licitacao.id}>
                  {licitacao.numero} - {licitacao.descricao}
                </option>
              ))}
            </select>
            {errors.licitacao_id && (
              <p className="mt-1 text-sm text-red-600">{errors.licitacao_id}</p>
            )}
          </div>

          {/* Informações da Licitação Selecionada */}
          {selectedLicitacao && quantidadesDisponiveis && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Informações da Licitação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Valor Final</p>
                  <p className="text-lg font-bold text-blue-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(quantidadesDisponiveis.valor_final)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Custo Total</p>
                  <p className="text-lg font-bold text-blue-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(quantidadesDisponiveis.custo_total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Classificação</p>
                  <p className="text-lg font-bold text-blue-900">
                    {quantidadesDisponiveis.tipo_classificacao === 'ITEM' ? 'Por Item' : 'Por Grupo'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seleção de Itens */}
          {quantidadesDisponiveis && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Itens do Pedido
              </h3>
              
              {quantidadesDisponiveis.tipo_classificacao === 'ITEM' ? (
                // Classificação por Item
                <div className="space-y-4">
                  {quantidadesDisponiveis.itens_disponiveis.map((item: any) => (
                    <div key={item.item_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.codigo_item} - {item.descricao}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Quantidade na Licitação:</span> {item.quantidade_licitacao}
                            </div>
                            <div>
                              <span className="font-medium">Já Pedida:</span> {item.quantidade_pedida}
                            </div>
                            <div>
                              <span className="font-medium">Disponível:</span> {item.quantidade_disponivel}
                            </div>
                            <div>
                              <span className="font-medium">Preço Unitário:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_unitario)}
                            </div>
                          </div>
                        </div>
                        
                        {!isItemSelected(item.item_id) ? (
                          <button
                            type="button"
                            onClick={() => handleAddItem(item.item_id, 1)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            disabled={item.quantidade_disponivel <= 0}
                          >
                            Adicionar
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={item.quantidade_disponivel}
                              value={formData.itens.find(i => i.item_licitacao_id === item.item_id)?.quantidade_solicitada || 1}
                              onChange={(e) => handleItemQuantityChange(
                                formData.itens.findIndex(i => i.item_licitacao_id === item.item_id),
                                Number(e.target.value)
                              )}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(
                                formData.itens.findIndex(i => i.item_licitacao_id === item.item_id)
                              )}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Classificação por Grupo
                <div className="space-y-6">
                  {quantidadesDisponiveis.itens_disponiveis.map((grupo: any) => (
                    <div key={grupo.grupo_id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {grupo.nome} {grupo.posicao && `(${grupo.posicao})`}
                      </h4>
                      
                      <div className="space-y-3">
                        {grupo.itens.map((item: any) => (
                          <div key={item.item_id} className="border-l-4 border-blue-200 pl-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">
                                  {item.codigo_item} - {item.descricao}
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Quantidade na Licitação:</span> {item.quantidade_licitacao}
                                  </div>
                                  <div>
                                    <span className="font-medium">Já Pedida:</span> {item.quantidade_pedida}
                                  </div>
                                  <div>
                                    <span className="font-medium">Disponível:</span> {item.quantidade_disponivel}
                                  </div>
                                  <div>
                                    <span className="font-medium">Preço Unitário:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_unitario)}
                                  </div>
                                </div>
                              </div>
                              
                              {!isItemSelected(item.item_id) ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(item.item_id, 1)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                                  disabled={item.quantidade_disponivel <= 0}
                                >
                                  Adicionar
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.quantidade_disponivel}
                                    value={formData.itens.find(i => i.item_licitacao_id === item.item_id)?.quantidade_solicitada || 1}
                                    onChange={(e) => handleItemQuantityChange(
                                      formData.itens.findIndex(i => i.item_licitacao_id === item.item_id),
                                      Number(e.target.value)
                                    )}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(
                                      formData.itens.findIndex(i => i.item_licitacao_id === item.item_id)
                                    )}
                                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                  >
                                    Remover
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.itens && (
                <p className="mt-2 text-sm text-red-600">{errors.itens}</p>
              )}
            </div>
          )}

          {/* Resumo do Pedido */}
          {formData.itens.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-3">
                Resumo do Pedido
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-green-700">Total de Itens</p>
                  <p className="text-lg font-bold text-green-900">{formData.itens.length}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Valor Total</p>
                  <p className="text-lg font-bold text-green-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(getTotalValue())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Custo Total</p>
                  <p className="text-lg font-bold text-green-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(getTotalCost())}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empenhos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Empenhos
              </h3>
              <button
                type="button"
                onClick={() => setShowEmpenhoForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Adicionar Empenho
              </button>
            </div>
            
            {formData.empenhos.length > 0 && (
              <div className="space-y-3">
                {formData.empenhos.map((empenho, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{empenho.numero_empenho}</p>
                      <p className="text-sm text-gray-600">
                        {empenho.data_empenho} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(empenho.valor_empenhado)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmpenho(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações Gerais
            </label>
            <textarea
              value={formData.observacoes_gerais}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_gerais: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Observações gerais sobre o pedido..."
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || formData.itens.length === 0}
              className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle size={16} />
              {isLoading ? 'Salvando...' : (editingPedido ? 'Salvar Alterações' : 'Criar Pedido')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PedidoForm;

