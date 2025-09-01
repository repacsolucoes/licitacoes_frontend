import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { pedidoService, licitacaoService, clienteService } from '../services/api';
import { Pedido, PedidoCreate, PedidoUpdate, Licitacao, Cliente } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface PedidoWithDetails extends Pedido {
  licitacao: Licitacao & {
    cliente: Cliente;
  };
}

const Pedidos: React.FC = () => {
  const { user } = useAuth();
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['pedidos', 'pedidos-stats']);
  
  // Verificar token no carregamento do componente
  useEffect(() => {
    // Verificação de token removida para limpeza
  }, []);
  const [pedidos, setPedidos] = useState<PedidoWithDetails[]>([]);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState<PedidoWithDetails | null>(null);
  const [viewingPedido, setViewingPedido] = useState<PedidoWithDetails | null>(null);
  const [stats, setStats] = useState({
    total_pedidos: 0,
    pedidos_pendentes: 0,
    pedidos_em_andamento: 0,
    pedidos_concluidos: 0,
    pedidos_cancelados: 0
  });

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<number | ''>('');

  // Formulário
  const [formData, setFormData] = useState<PedidoCreate>({
    licitacao_id: 0,
    empenho_feito: false,
    pedido_orgao_feito: false,
    contrato_feito: false,
    outros_documentos: false,
    entrega_feita: false,
    status_geral: 'PENDENTE',
    status_pagamento: 'PENDENTE',
    valor_pago: 0.0,
    data_pagamento: undefined,
    observacoes_pagamento: ''
  });

  // Estado para controlar menus desplegáveis
  const [expandedSections, setExpandedSections] = useState({
    empenho: false,
    pedido_orgao: false,
    contrato: false,
    outros_documentos: false,
    entrega: false,
    pagamento: false
  });

  useEffect(() => {
    carregarDados();
  }, [filtroStatus, filtroCliente]);





  const carregarDados = async () => {
    try {
      setLoading(true);
      

      
      // Carregar pedidos
      try {
        const pedidosData = await pedidoService.list(
          filtroStatus || undefined,
          filtroCliente || undefined
        );
        setPedidos(pedidosData as PedidoWithDetails[]);
      } catch (error: any) {
        setPedidos([]);
      }

      // Carregar estatísticas
      try {
        const statsData = await pedidoService.getStats();
        setStats(statsData);
      } catch (error: any) {
        // Erro ao carregar estatísticas
      }

      // Carregar licitações ganhas (para criar novos pedidos)
      
      // Aguardar um pouco para garantir que o usuário está carregado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Testar autenticação primeiro
      try {
        const authResponse = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (!authResponse.ok) {
          // Falha na autenticação
        }
      } catch (authError) {
        // Erro no teste de autenticação
      }
      
       try {
        const licitacoesData = await licitacaoService.list({ 
          status_filter: 'GANHO',
          sem_pedidos: true 
        });
        setLicitacoes(licitacoesData);
      } catch (error: any) {
        setLicitacoes([]);
      }

      // Carregar clientes (se for admin)
      if (user?.is_admin) {
        const clientesData = await clienteService.list();
        setClientes(clientesData);
      }
    } catch (error) {
      // Erro ao carregar dados
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPedido) {
        await pedidoService.update(editingPedido.id, formData as PedidoUpdate);
      } else {
        await pedidoService.create(formData);
      }
      
      setShowModal(false);
      setEditingPedido(null);
      resetForm();
      carregarDados();
    } catch (error) {
      // Erro ao salvar pedido
    }
  };

  const handleEdit = (pedido: PedidoWithDetails) => {
    
    setEditingPedido(pedido);
    setFormData({
      licitacao_id: pedido.licitacao_id,
      empenho_feito: pedido.empenho_feito,
      empenho_data: pedido.empenho_data,
      empenho_observacoes: pedido.empenho_observacoes,
      pedido_orgao_feito: pedido.pedido_orgao_feito,
      pedido_orgao_data: pedido.pedido_orgao_data,
      pedido_orgao_observacoes: pedido.pedido_orgao_observacoes,
      contrato_feito: pedido.contrato_feito,
      contrato_data: pedido.contrato_data,
      contrato_observacoes: pedido.contrato_observacoes,
      outros_documentos: pedido.outros_documentos,
      outros_documentos_descricao: pedido.outros_documentos_descricao,
      outros_documentos_data: pedido.outros_documentos_data,
      entrega_feita: pedido.entrega_feita,
      entrega_data: pedido.entrega_data,
      entrega_observacoes: pedido.entrega_observacoes,
      status_geral: pedido.status_geral,
      status_pagamento: pedido.status_pagamento,
      valor_pago: pedido.valor_pago,
      data_pagamento: pedido.data_pagamento,
      observacoes_pagamento: pedido.observacoes_pagamento,
      observacoes_gerais: pedido.observacoes_gerais
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      try {
        await pedidoService.delete(id);
        carregarDados();
      } catch (error) {
        console.error('Erro ao deletar pedido:', error);
      }
    }
  };

  const handleView = (pedido: PedidoWithDetails) => {
    setViewingPedido(pedido);
  };

  const resetForm = () => {
    setFormData({
      licitacao_id: 0,
      empenho_feito: false,
      pedido_orgao_feito: false,
      contrato_feito: false,
      outros_documentos: false,
      entrega_feita: false,
      status_geral: 'PENDENTE',
      status_pagamento: 'PENDENTE',
      valor_pago: 0.0,
      data_pagamento: undefined,
      observacoes_pagamento: ''
    });
    
    // Resetar menus desplegáveis
    setExpandedSections({
      empenho: false,
      pedido_orgao: false,
      contrato: false,
      outros_documentos: false,
      entrega: false,
      pagamento: false
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'EM_ANDAMENTO':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case 'CONCLUIDO':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'CANCELADO':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'CONCLUIDO':
        return 'Concluído';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  // Função para preencher o valor pago com o preço final da licitação
  const preencherValorPago = () => {
    if (formData.licitacao_id) {
      // Se estamos editando um pedido, usar a licitação do pedido
      if (editingPedido) {
        const novoValor = Number(editingPedido.licitacao.preco_final) || 0;
        setFormData(prev => ({
          ...prev,
          valor_pago: novoValor
        }));
      } else {
        // Se estamos criando um novo pedido, buscar na lista de licitações
        const licitacao = licitacoes.find(l => l.id === formData.licitacao_id);
        if (licitacao) {
          setFormData({
            ...formData,
            valor_pago: licitacao.preco_final
          });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="pedidos" />
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{stats.total_pedidos}</div>
          <div className="text-sm text-gray-600">Total de Pedidos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{stats.pedidos_pendentes}</div>
          <div className="text-sm text-gray-600">Pendentes</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.pedidos_em_andamento}</div>
          <div className="text-sm text-gray-600">Em Andamento</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.pedidos_concluidos}</div>
          <div className="text-sm text-gray-600">Concluídos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{stats.pedidos_cancelados}</div>
          <div className="text-sm text-gray-600">Cancelados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          {user?.is_admin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os clientes</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Licitação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empenho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrega
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {pedido.licitacao.descricao}
                    </div>
                    <div className="text-sm text-gray-500">
                      {pedido.licitacao.numero} - {pedido.licitacao.uasg}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {pedido.licitacao.cliente.nome}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(pedido.status_geral)}
                      <span className="text-sm text-gray-900">
                        {getStatusText(pedido.status_geral)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {pedido.empenho_feito ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {pedido.empenho_feito ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    {pedido.empenho_data && (
                      <div className="text-xs text-gray-500">
                        {formatDate(pedido.empenho_data)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {pedido.pedido_orgao_feito ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {pedido.pedido_orgao_feito ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    {pedido.pedido_orgao_data && (
                      <div className="text-xs text-gray-500">
                        {formatDate(pedido.pedido_orgao_data)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {pedido.contrato_feito ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {pedido.contrato_feito ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    {pedido.contrato_data && (
                      <div className="text-xs text-gray-500">
                        {formatDate(pedido.contrato_data)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {pedido.entrega_feita ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {pedido.entrega_feita ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    {pedido.entrega_data && (
                      <div className="text-xs text-gray-500">
                        {formatDate(pedido.entrega_data)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(pedido)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(pedido)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pedido.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Licitação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Licitação *
                  </label>
                  <select
                    value={formData.licitacao_id}
                    onChange={(e) => setFormData({...formData, licitacao_id: Number(e.target.value)})}
                    required
                    disabled={!!editingPedido}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma licitação</option>
                    {licitacoes && licitacoes.length > 0 ? (
                      licitacoes.map((licitacao) => (
                        <option key={licitacao.id} value={licitacao.id}>
                          {licitacao.descricao} - {licitacao.numero}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Nenhuma licitação GANHO sem pedido disponível</option>
                    )}
                  </select>
                  {licitacoes && licitacoes.length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      Todas as licitações ganhas já possuem pedidos criados.
                    </p>
                  )}
                </div>

                {/* Status Geral */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Geral
                  </label>
                  <select
                    value={formData.status_geral}
                    onChange={(e) => setFormData({...formData, status_geral: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>

                {/* Botão para expandir/colapsar todas as seções */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const allExpanded = Object.values(expandedSections).every(Boolean);
                      setExpandedSections({
                        empenho: !allExpanded,
                        pedido_orgao: !allExpanded,
                        contrato: !allExpanded,
                        outros_documentos: !allExpanded,
                        entrega: !allExpanded,
                        pagamento: !allExpanded
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {Object.values(expandedSections).every(Boolean) ? 'Colapsar Tudo' : 'Expandir Tudo'}
                  </button>
                </div>

                {/* Empenho */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSections({...expandedSections, empenho: !expandedSections.empenho})}
                    className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <h4 className="text-md font-medium text-gray-900">Empenho</h4>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.empenho ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.empenho && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.empenho_feito}
                            onChange={(e) => setFormData({...formData, empenho_feito: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Empenho feito</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data do Empenho
                          </label>
                          <input
                            type="date"
                            value={formData.empenho_data || ''}
                            onChange={(e) => setFormData({...formData, empenho_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações do Empenho
                        </label>
                        <textarea
                          value={formData.empenho_observacoes || ''}
                          onChange={(e) => setFormData({...formData, empenho_observacoes: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pedido do Órgão */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSections({...expandedSections, pedido_orgao: !expandedSections.pedido_orgao})}
                    className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <h4 className="text-md font-medium text-gray-900">Pedido do Órgão</h4>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.pedido_orgao ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.pedido_orgao && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.pedido_orgao_feito}
                            onChange={(e) => setFormData({...formData, pedido_orgao_feito: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Pedido feito</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data do Pedido
                          </label>
                          <input
                            type="date"
                            value={formData.pedido_orgao_data || ''}
                            onChange={(e) => setFormData({...formData, pedido_orgao_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações do Pedido
                        </label>
                        <textarea
                          value={formData.pedido_orgao_observacoes || ''}
                          onChange={(e) => setFormData({...formData, pedido_orgao_observacoes: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Contrato */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSections({...expandedSections, contrato: !expandedSections.contrato})}
                    className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <h4 className="text-md font-medium text-gray-900">Contrato</h4>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.contrato ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.contrato && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.contrato_feito}
                            onChange={(e) => setFormData({...formData, contrato_feito: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Contrato assinado</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data do Contrato
                          </label>
                          <input
                            type="date"
                            value={formData.contrato_data || ''}
                            onChange={(e) => setFormData({...formData, contrato_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações do Contrato
                        </label>
                        <textarea
                          value={formData.contrato_observacoes || ''}
                          onChange={(e) => setFormData({...formData, contrato_observacoes: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Outros Documentos */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSections({...expandedSections, outros_documentos: !expandedSections.outros_documentos})}
                    className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <h4 className="text-md font-medium text-gray-900">Outros Documentos</h4>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.outros_documentos ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.outros_documentos && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.outros_documentos}
                            onChange={(e) => setFormData({...formData, outros_documentos: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Outros documentos</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data dos Documentos
                          </label>
                          <input
                            type="date"
                            value={formData.outros_documentos_data || ''}
                            onChange={(e) => setFormData({...formData, outros_documentos_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descrição dos Documentos
                        </label>
                        <textarea
                          value={formData.outros_documentos_descricao || ''}
                          onChange={(e) => setFormData({...formData, outros_documentos_descricao: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Entrega */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSections({...expandedSections, entrega: !expandedSections.entrega})}
                    className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <h4 className="text-md font-medium text-gray-900">Entrega</h4>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.entrega ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.entrega && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.entrega_feita}
                            onChange={(e) => setFormData({...formData, entrega_feita: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700">Entrega realizada</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data da Entrega
                          </label>
                          <input
                            type="date"
                            value={formData.entrega_data || ''}
                            onChange={(e) => setFormData({...formData, entrega_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações da Entrega
                        </label>
                        <textarea
                          value={formData.entrega_observacoes || ''}
                          onChange={(e) => setFormData({...formData, entrega_observacoes: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagamento */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSections({...expandedSections, pagamento: !expandedSections.pagamento})}
                    className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <h4 className="text-md font-medium text-gray-900">Pagamento</h4>
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.pagamento ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.pagamento && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status do Pagamento
                          </label>
                          <select
                            value={formData.status_pagamento}
                            onChange={(e) => setFormData({...formData, status_pagamento: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="PENDENTE">Pendente</option>
                            <option value="PARCIAL">Parcial</option>
                            <option value="PAGO">Pago</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor Pago
                          </label>
                          <div className="flex gap-2">
                            <input
                              key={`valor_pago_${formData.valor_pago}`}
                              type="number"
                              step="0.01"
                              value={formData.valor_pago || ''}
                              onChange={(e) => {
                                setFormData({...formData, valor_pago: parseFloat(e.target.value) || 0});
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                            <button
                              type="button"
                              onClick={preencherValorPago}
                              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                              title="Preencher com valor da licitação"
                            >
                              Auto
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data do Pagamento
                        </label>
                        <input
                          type="date"
                          value={formData.data_pagamento || ''}
                          onChange={(e) => setFormData({...formData, data_pagamento: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações do Pagamento
                        </label>
                        <textarea
                          value={formData.observacoes_pagamento || ''}
                          onChange={(e) => setFormData({...formData, observacoes_pagamento: e.target.value})}
                          rows={2}
                          placeholder="Observações sobre o pagamento..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações Gerais */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações Gerais
                  </label>
                  <textarea
                    value={formData.observacoes_gerais || ''}
                    onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
                    rows={3}
                    placeholder="Observações gerais sobre o pedido..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPedido(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingPedido ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {viewingPedido && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Pedido
                </h3>
                <button
                  onClick={() => setViewingPedido(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                                     <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Informações da Licitação */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Licitação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Descrição:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.licitacao.descricao}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Número:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.licitacao.numero}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">UASG:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.licitacao.uasg}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Cliente:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.licitacao.cliente.nome}</p>
                    </div>
                  </div>
                </div>

                {/* Status Geral */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Status Geral</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(viewingPedido.status_geral)}
                    <span className="text-sm text-gray-900">
                      {getStatusText(viewingPedido.status_geral)}
                    </span>
                  </div>
                </div>

                {/* Empenho */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Empenho</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                                             {viewingPedido.empenho_feito ? (
                         <CheckCircle className="h-5 w-5 text-green-500" />
                       ) : (
                         <XCircle className="h-5 w-5 text-red-500" />
                       )}
                      <span className="text-sm text-gray-900">
                        {viewingPedido.empenho_feito ? 'Realizado' : 'Não realizado'}
                      </span>
                    </div>
                    {viewingPedido.empenho_data && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Data:</span>
                        <p className="text-sm text-gray-900">{formatDate(viewingPedido.empenho_data)}</p>
                      </div>
                    )}
                  </div>
                  {viewingPedido.empenho_observacoes && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-500">Observações:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.empenho_observacoes}</p>
                    </div>
                  )}
                </div>

                {/* Pedido do Órgão */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Pedido do Órgão</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                                             {viewingPedido.pedido_orgao_feito ? (
                         <CheckCircle className="h-5 w-5 text-green-500" />
                       ) : (
                         <XCircle className="h-5 w-5 text-red-500" />
                       )}
                      <span className="text-sm text-gray-900">
                        {viewingPedido.pedido_orgao_feito ? 'Realizado' : 'Não realizado'}
                      </span>
                    </div>
                    {viewingPedido.pedido_orgao_data && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Data:</span>
                        <p className="text-sm text-gray-900">{formatDate(viewingPedido.pedido_orgao_data)}</p>
                      </div>
                    )}
                  </div>
                  {viewingPedido.pedido_orgao_observacoes && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-500">Observações:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.pedido_orgao_observacoes}</p>
                    </div>
                  )}
                </div>

                {/* Contrato */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Contrato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                                             {viewingPedido.contrato_feito ? (
                         <CheckCircle className="h-5 w-5 text-green-500" />
                       ) : (
                         <XCircle className="h-5 w-5 text-red-500" />
                       )}
                      <span className="text-sm text-gray-900">
                        {viewingPedido.contrato_feito ? 'Assinado' : 'Não assinado'}
                      </span>
                    </div>
                    {viewingPedido.contrato_data && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Data:</span>
                        <p className="text-sm text-gray-900">{formatDate(viewingPedido.contrato_data)}</p>
                      </div>
                    )}
                  </div>
                  {viewingPedido.contrato_observacoes && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-500">Observações:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.contrato_observacoes}</p>
                    </div>
                  )}
                </div>

                {/* Outros Documentos */}
                {viewingPedido.outros_documentos && (
                  <div className="border-b pb-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Outros Documentos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Descrição:</span>
                        <p className="text-sm text-gray-900">{viewingPedido.outros_documentos_descricao}</p>
                      </div>
                      {viewingPedido.outros_documentos_data && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Data:</span>
                          <p className="text-sm text-gray-900">{formatDate(viewingPedido.outros_documentos_data)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Entrega */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Entrega</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                                             {viewingPedido.entrega_feita ? (
                         <CheckCircle className="h-5 w-5 text-green-500" />
                       ) : (
                         <XCircle className="h-5 w-5 text-red-500" />
                       )}
                      <span className="text-sm text-gray-900">
                        {viewingPedido.entrega_feita ? 'Realizada' : 'Não realizada'}
                      </span>
                    </div>
                    {viewingPedido.entrega_data && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Data:</span>
                        <p className="text-sm text-gray-900">{formatDate(viewingPedido.entrega_data)}</p>
                      </div>
                    )}
                  </div>
                  {viewingPedido.entrega_observacoes && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-500">Observações:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.entrega_observacoes}</p>
                    </div>
                  )}
                </div>

                {/* Pagamento */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Pagamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.status_pagamento}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Valor Pago:</span>
                      <p className="text-sm text-gray-900">{formatCurrency(viewingPedido.valor_pago)}</p>
                    </div>
                    {viewingPedido.data_pagamento && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Data do Pagamento:</span>
                        <p className="text-sm text-gray-900">{formatDate(viewingPedido.data_pagamento)}</p>
                      </div>
                    )}
                  </div>
                  {viewingPedido.observacoes_pagamento && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-500">Observações:</span>
                      <p className="text-sm text-gray-900">{viewingPedido.observacoes_pagamento}</p>
                    </div>
                  )}
                </div>

                {/* Observações Gerais */}
                {viewingPedido.observacoes_gerais && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Observações Gerais</h4>
                    <p className="text-sm text-gray-900">{viewingPedido.observacoes_gerais}</p>
                  </div>
                )}

                {/* Informações do Sistema */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Criado por:</span> {viewingPedido.user_criador.full_name}
                    </div>
                    <div>
                      <span className="font-medium">Criado em:</span> {formatDate(viewingPedido.created_at)}
                    </div>
                    {viewingPedido.updated_at && (
                      <div>
                        <span className="font-medium">Atualizado em:</span> {formatDate(viewingPedido.updated_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pedidos;
