import React from 'react';
import { X, Package, FileText, DollarSign, Truck, CheckCircle, Calendar, Hash } from 'lucide-react';
import { PedidoCompleto } from '../types';

interface PedidoDetailProps {
  pedido: PedidoCompleto;
  onClose: () => void;
}

const PedidoDetail: React.FC<PedidoDetailProps> = ({ pedido, onClose }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EM_ANDAMENTO':
        return 'bg-blue-100 text-blue-800';
      case 'CONCLUIDO':
        return 'bg-green-100 text-green-800';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalValue = () => {
    return pedido.itens_pedido.reduce((total, item) => total + item.preco_total, 0);
  };

  const getTotalCost = () => {
    return pedido.itens_pedido.reduce((total, item) => total + item.custo_total, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Detalhes do Pedido
            </h2>
            <p className="text-gray-600">
              Pedido #{pedido.id} - {pedido.licitacao?.numero}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações da Licitação */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações da Licitação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700">Número</p>
                <p className="font-medium text-blue-900">{pedido.licitacao?.numero}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Descrição</p>
                <p className="font-medium text-blue-900">{pedido.licitacao?.descricao}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Cliente</p>
                <p className="font-medium text-blue-900">{pedido.licitacao?.cliente?.nome}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Valor Final</p>
                <p className="font-medium text-blue-900">
                  {formatCurrency(pedido.licitacao?.preco_final || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Status do Pedido */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status do Pedido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status Geral</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pedido.status_geral)}`}>
                  {pedido.status_geral}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status Pagamento</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pedido.status_pagamento)}`}>
                  {pedido.status_pagamento}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data de Criação</p>
                <p className="font-medium text-gray-900">{formatDate(pedido.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens do Pedido ({pedido.itens_pedido.length})
            </h3>
            
            <div className="space-y-3">
              {pedido.itens_pedido.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Código</p>
                      <p className="font-medium text-gray-900">{item.item_licitacao?.codigo_item}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Descrição</p>
                      <p className="font-medium text-gray-900">{item.item_licitacao?.descricao}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantidade</p>
                      <p className="font-medium text-gray-900">{item.quantidade_solicitada}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preço Total</p>
                      <p className="font-medium text-gray-900">{formatCurrency(item.preco_total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumo Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-700">Valor Total</p>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(getTotalValue())}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Custo Total</p>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(getTotalCost())}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Margem</p>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(getTotalValue() - getTotalCost())}
                </p>
              </div>
            </div>
          </div>

          {/* Empenhos */}
          {pedido.empenhos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Empenhos ({pedido.empenhos.length})
              </h3>
              
              <div className="space-y-3">
                {pedido.empenhos.map((empenho, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Número</p>
                        <p className="font-medium text-gray-900">{empenho.numero_empenho}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Data</p>
                        <p className="font-medium text-gray-900">{formatDate(empenho.data_empenho)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Valor</p>
                        <p className="font-medium text-gray-900">{formatCurrency(empenho.valor_empenhado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(empenho.status)}`}>
                          {empenho.status}
                        </span>
                      </div>
                    </div>
                    {empenho.observacoes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Observações</p>
                        <p className="text-gray-900">{empenho.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagamentos */}
          {pedido.pagamentos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagamentos ({pedido.pagamentos.length})
              </h3>
              
              <div className="space-y-3">
                {pedido.pagamentos.map((pagamento, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Número</p>
                        <p className="font-medium text-gray-900">{pagamento.numero_pagamento}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Data</p>
                        <p className="font-medium text-gray-900">{formatDate(pagamento.data_pagamento)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Valor</p>
                        <p className="font-medium text-gray-900">{formatCurrency(pagamento.valor_pago)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Forma</p>
                        <p className="font-medium text-gray-900">{pagamento.forma_pagamento}</p>
                      </div>
                    </div>
                    {pagamento.observacoes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Observações</p>
                        <p className="text-gray-900">{pagamento.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {pedido.observacoes_gerais && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Observações Gerais
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900">{pedido.observacoes_gerais}</p>
              </div>
            </div>
          )}

          {/* Botão Fechar */}
          <div className="flex justify-end pt-6 border-t">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidoDetail;

