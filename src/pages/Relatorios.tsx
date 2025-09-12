import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { licitacaoService, clienteService, pedidoService, relatorioService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Download,
  Filter,
  Users,
  PieChart,
  ShoppingCart,
  Clock,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const Relatorios: React.FC = () => {
  const [dateRange, setDateRange] = useState('30'); // dias
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['estatisticas-gerais', 'relatorio-modalidade', 'dashboard-stats', 'pedidos-stats']);
  const [reportType, setReportType] = useState('performance');
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [pedidoFilter, setPedidoFilter] = useState<'todos' | 'especifico'>('todos');
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | ''>('');
  const { user } = useAuth();
  const isAdmin = user?.is_admin;

  // Buscar clientes para filtro (apenas para admin)
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list(),
    { enabled: isAdmin }
  );

  const { data: stats } = useQuery(
    ['dashboard-stats', selectedClienteId], 
    () => licitacaoService.getDashboardStats(selectedClienteId ? Number(selectedClienteId) : undefined),
    { staleTime: 30000 }
  );
  const { data: relatorioClientes } = useQuery(
    ['relatorio-clientes', selectedClienteId], 
    () => licitacaoService.getRelatorioPorCliente(selectedClienteId ? Number(selectedClienteId) : undefined),
    { enabled: reportType === 'clients', staleTime: 30000 }
  );
  const { data: relatorioStatus } = useQuery(
    ['relatorio-status', selectedClienteId], 
    () => pedidoService.getRelatorioPorStatusPedidos(selectedClienteId ? Number(selectedClienteId) : undefined),
    { enabled: reportType === 'status', staleTime: 30000, refetchOnWindowFocus: true }
  );

  // Relatório financeiro detalhado (baseado em pedidos)
  const { data: relatorioFinanceiro } = useQuery(
    ['relatorio-financeiro-pedidos'], 
    () => relatorioService.financeiro(),
    { enabled: reportType === 'financial' || reportType === 'financial-detailed', refetchOnWindowFocus: true, staleTime: 30000 }
  );

  // Dados para gráficos
  const { data: tendenciaPerformance } = useQuery(
    ['tendencia-performance', selectedClienteId], 
    () => licitacaoService.getTendenciaPerformance(selectedClienteId ? Number(selectedClienteId) : undefined),
    { staleTime: 30000 }
  );
  const { data: distribuicaoPortal } = useQuery(
    ['distribuicao-portal', selectedClienteId], 
    () => licitacaoService.getDistribuicaoPortal(selectedClienteId ? Number(selectedClienteId) : undefined),
    { staleTime: 30000 }
  );

  // Estatísticas de pedidos
  const { data: pedidosStats } = useQuery(
    ['pedidos-stats', selectedClienteId], 
    () => pedidoService.getStats(),
    { staleTime: 30000 }
  );

  // Lista de todos os pedidos para filtro
  const { data: todosPedidos = [] } = useQuery(
    ['todos-pedidos', selectedClienteId], 
    () => pedidoService.list({ cliente_id: selectedClienteId ? Number(selectedClienteId) : undefined }),
    { enabled: reportType === 'financial' || reportType === 'financial-detailed', staleTime: 30000 }
  );

  // Relatório por modalidade
  const { data: relatorioModalidade } = useQuery(
    ['relatorio-modalidade', selectedClienteId], 
    () => licitacaoService.getRelatorioPorModalidade(selectedClienteId ? Number(selectedClienteId) : undefined),
    { enabled: reportType === 'modalidade', staleTime: 30000 }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value.toFixed(2)}%`;
  };

  const formatMonth = (mes: string) => {
    const [ano, mes_num] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes_num) - 1]}/${ano.slice(-2)}`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GANHO':
        return 'bg-green-500';
      case 'AGUARDANDO':
      case 'AGUARDANDO pedido':
      case 'AINDA NÃO FOI ENCERRADO':
        return 'bg-yellow-500';
      case 'DESCLASSIFICADO':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'GANHO':
        return 'Ganhas';
      case 'AGUARDANDO':
      case 'AGUARDANDO pedido':
      case 'AINDA NÃO FOI ENCERRADO':
        return 'Pendentes';
      case 'DESCLASSIFICADO':
        return 'Desclassificadas';
      default:
        return status;
    }
  };

  const clearFilters = () => {
    setSelectedClienteId('');
    setDateRange('30');
    setPedidoFilter('todos');
    setSelectedPedidoId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="relatorios" />
          <button className="btn-primary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field w-32"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
          
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="input-field w-48"
          >
            <option value="performance">Performance Geral</option>
            <option value="financial">Relatório Financeiro</option>
            <option value="financial-detailed">Relatório Financeiro Detalhado</option>
            <option value="pedidos">Relatório de Pedidos</option>
            <option value="modalidade">Relatório por Modalidade</option>
            {isAdmin && <option value="clients">Por Cliente</option>}
            <option value="status">Por Status</option>
          </select>

          {/* Filtro de cliente (apenas para admin) */}
          {isAdmin && (
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : '')}
              className="input-field w-48"
            >
              <option value="">Todos os clientes</option>
              {(Array.isArray(clientes) ? clientes : clientes.data || []).map((cliente: any) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          )}

          {/* Filtro de pedido (apenas para relatórios financeiros) */}
          {(reportType === 'financial' || reportType === 'financial-detailed') && (
            <>
              <select
                value={pedidoFilter}
                onChange={(e) => setPedidoFilter(e.target.value as 'todos' | 'especifico')}
                className="input-field w-40"
              >
                <option value="todos">Todos os pedidos</option>
                <option value="especifico">Pedido específico</option>
              </select>

              {pedidoFilter === 'especifico' && (
                <select
                  value={selectedPedidoId}
                  onChange={(e) => setSelectedPedidoId(e.target.value ? Number(e.target.value) : '')}
                  className="input-field w-48"
                >
                  <option value="">Selecione um pedido</option>
                  {(Array.isArray(todosPedidos) ? todosPedidos : todosPedidos.data || []).map((pedido: any) => (
                    <option key={pedido.id} value={pedido.id}>
                      Pedido #{pedido.id} - {pedido.licitacao?.descricao?.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Botão limpar filtros */}
          {((isAdmin && selectedClienteId) || dateRange !== '30' || pedidoFilter === 'especifico') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Relatório de Performance */}
      {reportType === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Métricas Principais */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Métricas Principais
              {isAdmin && selectedClienteId && (
                <span className="ml-2 text-sm text-gray-500">
                  (Filtrado por cliente)
                </span>
              )}
            </h3>
            
            {stats && stats.total_licitacoes > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Total de Licitações</span>
                  <span className="font-semibold text-gray-900">{stats?.total_licitacoes || 0}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Taxa de Sucesso</span>
                  <span className="font-semibold text-green-900">
                    {stats?.total_licitacoes ? 
                      formatPercentage((stats.licitacoes_ganhas / stats.total_licitacoes) * 100) : 
                      '0%'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">Valor Total Ganho</span>
                  <span className="font-semibold text-blue-900">
                    {formatCurrency(stats?.valor_total_ganho || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-700">Margem Média</span>
                  <span className="font-semibold text-yellow-900">
                    {formatPercentage(stats?.margem_media || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-700">Pedidos Pendentes</span>
                  <span className="font-semibold text-purple-900">
                    {pedidosStats?.pedidos_pendentes || 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Pedidos Entregues</span>
                  <span className="font-semibold text-emerald-900">
                    {pedidosStats?.pedidos_concluidos || 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {isAdmin && selectedClienteId ? (
                  <div>
                    <p className="text-gray-600 mb-2">
                      O cliente selecionado não possui licitações cadastradas.
                    </p>
                    <p className="text-sm text-gray-500">
                      Selecione outro cliente ou crie licitações para este cliente.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">Nenhum dado disponível</p>
                )}
              </div>
            )}
          </div>

          {/* Distribuição por Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Distribuição por Status
              {isAdmin && selectedClienteId && (
                <span className="ml-2 text-sm text-gray-500">
                  (Filtrado por cliente)
                </span>
              )}
            </h3>
            
            {stats && stats.total_licitacoes > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">Ganhas</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats?.licitacoes_ganhas || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">Pendentes</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats?.licitacoes_pendentes || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">Desclassificadas</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats?.licitacoes_desclassificadas || 0}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {isAdmin && selectedClienteId ? (
                  <div>
                    <p className="text-gray-600 mb-2">
                      O cliente selecionado não possui licitações cadastradas.
                    </p>
                    <p className="text-sm text-gray-500">
                      Selecione outro cliente ou crie licitações para este cliente.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">Nenhum dado disponível</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Relatório Financeiro */}
      {reportType === 'financial' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Relatório Financeiro
            {isAdmin && selectedClienteId && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtrado por cliente)
              </span>
            )}
          </h3>
          
          {relatorioFinanceiro && relatorioFinanceiro.total_pedidos > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-600 font-medium">Receita Total</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(relatorioFinanceiro?.pedidos_pagos || 0)}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Valores a Receber</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(relatorioFinanceiro?.valores_receber || 0)}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-purple-600 font-medium">Valor Médio por Pedido</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {relatorioFinanceiro?.total_pedidos ? 
                      formatCurrency((relatorioFinanceiro.pedidos_pagos + relatorioFinanceiro.valores_receber) / relatorioFinanceiro.total_pedidos) : 
                      formatCurrency(0)
                    }
                  </p>
                </div>
              </div>

              {/* Estatísticas detalhadas */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Resumo Financeiro</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total de Pedidos:</span>
                      <span className="text-sm font-medium">{relatorioFinanceiro?.total_pedidos || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pedidos Entregues:</span>
                      <span className="text-sm font-medium">{relatorioFinanceiro?.pedidos_entregues || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Lucro Líquido:</span>
                      <span className="text-sm font-medium">{formatCurrency(relatorioFinanceiro?.lucro_liquido || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              {isAdmin && selectedClienteId ? (
                <div>
                  <p className="text-gray-600 mb-2">
                    O cliente selecionado não possui licitações cadastradas.
                  </p>
                  <p className="text-sm text-gray-500">
                    Selecione outro cliente ou crie licitações para este cliente.
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">Nenhum dado disponível</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório Financeiro Detalhado */}
      {reportType === 'financial-detailed' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Relatório Financeiro Detalhado
            {isAdmin && selectedClienteId && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtrado por cliente)
              </span>
            )}
          </h3>
          
          {relatorioFinanceiro && relatorioFinanceiro.total_pedidos > 0 ? (
            <>
              {/* Resumo Financeiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-600 font-medium">Valores a Receber</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(relatorioFinanceiro?.valores_receber || 0)}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-red-600 font-medium">Valores a Pagar (Fornecedores)</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(relatorioFinanceiro?.valores_pagar || 0)}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Impostos e Taxas</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(relatorioFinanceiro?.impostos_taxas || 0)}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-purple-600 font-medium">Custos Produtos/Serviços</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(relatorioFinanceiro?.custos_produtos_servicos || 0)}
                  </p>
                </div>
              </div>

              {/* Lucro Líquido */}
              <div className="text-center p-6 bg-gray-50 rounded-lg mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Lucro Líquido</h4>
                <p className={`text-3xl font-bold ${(relatorioFinanceiro?.lucro_liquido || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(relatorioFinanceiro?.lucro_liquido || 0)}
                </p>
              </div>

              {/* Análise de Fluxo de Caixa Real */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                    Controle de Recebimentos
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-700">Valores a Receber</span>
                      <span className="font-semibold text-green-900">
                        {formatCurrency(relatorioFinanceiro?.valores_receber || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-700">Pedidos Pagos</span>
                      <span className="font-semibold text-green-900">
                        {formatCurrency(relatorioFinanceiro?.pedidos_pagos || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-700">Pedidos com Pagamento Parcial</span>
                      <span className="font-semibold text-green-900">
                        {formatCurrency(relatorioFinanceiro?.pedidos_pagamento_parcial || 0)}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total a Receber</span>
                        <span className="text-lg font-bold text-green-900">
                          {formatCurrency(relatorioFinanceiro?.valores_receber || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-red-600" />
                    {pedidoFilter === 'especifico' ? 'Custos Reais do Pedido' : 'Custos Reais dos Pedidos'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-700">Custo dos Produtos/Serviços</span>
                      <span className="font-semibold text-red-900">
                        {formatCurrency(relatorioFinanceiro?.custos_produtos_servicos || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-700">Imposto (0.02% do preço final)</span>
                      <span className="font-semibold text-red-900">
                        {formatCurrency(relatorioFinanceiro?.impostos_taxas || 0)}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total de Custos Reais</span>
                        <span className="text-lg font-bold text-red-900">
                          {formatCurrency(relatorioFinanceiro?.total_custos_reais || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status dos Pedidos */}
              <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-gray-600" />
                  Status dos Pedidos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total de Pedidos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {pedidosStats?.total_pedidos || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Pedidos Pendentes</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {pedidosStats?.pedidos_pendentes || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Em Andamento</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {pedidosStats?.pedidos_em_andamento || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Pedidos Entregues</p>
                    <p className="text-2xl font-bold text-green-600">
                      {pedidosStats?.pedidos_concluidos || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumo Final */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4 text-center">Resumo Financeiro Atual</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Valor Total Ganho</p>
                    <p className="text-xl font-bold text-green-900">
                      {formatCurrency(relatorioFinanceiro?.resumo_financeiro?.valor_total_ganho || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total de Pedidos</p>
                    <p className="text-xl font-bold text-blue-900">
                      {pedidosStats?.total_pedidos || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Custos Reais</p>
                    <p className="text-xl font-bold text-red-900">
                      {formatCurrency(relatorioFinanceiro?.resumo_financeiro?.custos_reais || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Margem Real</p>
                    <p className="text-xl font-bold text-emerald-900">
                      {formatCurrency(relatorioFinanceiro?.resumo_financeiro?.margem_real || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">ℹ️</span>
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Este relatório usa dados reais do sistema: custo configurado na licitação, 
                      imposto configurado na empresa (0.02%) e valores calculados automaticamente. 
                      Os custos são aplicados apenas aos pedidos criados.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              {isAdmin && selectedClienteId ? (
                <div>
                  <p className="text-gray-600 mb-2">
                    O cliente selecionado não possui licitações cadastradas.
                  </p>
                  <p className="text-sm text-gray-500">
                    Selecione outro cliente ou crie licitações para este cliente.
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">Nenhum dado disponível</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório de Pedidos */}
      {reportType === 'pedidos' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Relatório de Pedidos
            {isAdmin && selectedClienteId && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtrado por cliente)
              </span>
            )}
          </h3>
          
          {pedidosStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total de Pedidos */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-600 font-medium">Total de Pedidos</p>
                <p className="text-2xl font-bold text-blue-900">
                  {pedidosStats.total_pedidos || 0}
                </p>
              </div>
              
              {/* Pedidos Pendentes */}
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-600 font-medium">Pedidos Pendentes</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {pedidosStats.pedidos_pendentes || 0}
                </p>
              </div>
              
              {/* Pedidos em Andamento */}
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-orange-600 font-medium">Em Andamento</p>
                <p className="text-2xl font-bold text-orange-900">
                  {pedidosStats.pedidos_em_andamento || 0}
                </p>
              </div>
              
              {/* Pedidos Concluídos */}
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">Pedidos Entregues</p>
                <p className="text-2xl font-bold text-green-900">
                  {pedidosStats.pedidos_concluidos || 0}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhum dado de pedidos disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Relatório por Modalidade */}
      {reportType === 'modalidade' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Relatório por Modalidade
            {isAdmin && selectedClienteId && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtrado por cliente)
              </span>
            )}
          </h3>
          
          {relatorioModalidade && relatorioModalidade.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modalidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total de Licitações
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Licitações Ganhas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Licitações Pendentes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos Pendentes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos Entregues
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total Ganho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxa de Sucesso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relatorioModalidade.map((modalidade: any) => (
                    <tr key={modalidade.modalidade} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {modalidade.modalidade || 'Não informado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {modalidade.total_licitacoes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {modalidade.licitacoes_ganhas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                        {modalidade.licitacoes_pendentes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                        {modalidade.pedidos_pendentes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium">
                        {modalidade.pedidos_entregues}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(modalidade.valor_total_ganho)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(modalidade.taxa_sucesso)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              {isAdmin && selectedClienteId ? (
                <div>
                  <p className="text-gray-600 mb-2">
                    O cliente selecionado não possui licitações cadastradas.
                  </p>
                  <p className="text-sm text-gray-500">
                    Selecione outro cliente ou crie licitações para este cliente.
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">Nenhum dado disponível</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório por Cliente */}
      {reportType === 'clients' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Relatório por Cliente
            {isAdmin && selectedClienteId && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtrado por cliente específico)
              </span>
            )}
          </h3>
          
          {relatorioClientes && relatorioClientes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ganhas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pendentes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Desclassificadas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxa Sucesso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Ganho
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relatorioClientes.map((cliente: any) => (
                    <tr key={cliente.cliente_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cliente.cliente_nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cliente.total_licitacoes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {cliente.licitacoes_ganhas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                        {cliente.licitacoes_pendentes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {cliente.licitacoes_desclassificadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(cliente.taxa_sucesso)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cliente.valor_total_ganho)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              {isAdmin && selectedClienteId ? (
                <div>
                  <p className="text-gray-600 mb-2">
                    O cliente selecionado não possui licitações cadastradas.
                  </p>
                  <p className="text-sm text-gray-500">
                    Selecione outro cliente ou crie licitações para este cliente.
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">Nenhum cliente encontrado</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relatório por Status */}
      {reportType === 'status' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Relatório por Status
            {isAdmin && selectedClienteId && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtrado por cliente)
              </span>
            )}
          </h3>
          
          {relatorioStatus && relatorioStatus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tabela de status */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Distribuição por Status</h4>
                <div className="space-y-3">
                  {relatorioStatus.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 ${getStatusColor(item.status)} rounded-full mr-3`}></div>
                        <span className="text-sm font-medium text-gray-900">
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{item.quantidade}</div>
                        <div className="text-xs text-gray-500">{formatPercentage(item.percentual)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valores por status */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Valores por Status</h4>
                <div className="space-y-3">
                  {relatorioStatus.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 ${getStatusColor(item.status)} rounded-full mr-3`}></div>
                        <span className="text-sm font-medium text-gray-900">
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(item.valor_total)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              {isAdmin && selectedClienteId ? (
                <div>
                  <p className="text-gray-600 mb-2">
                    O cliente selecionado não possui licitações cadastradas.
                  </p>
                  <p className="text-sm text-gray-500">
                    Selecione outro cliente ou crie licitações para este cliente.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhum dado disponível</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Não há pedidos para exibir o relatório financeiro detalhado
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gráficos e análises avançadas */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Análises Avançadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Tendência de Performance</h4>
            <p className="text-sm text-gray-600">Gráfico de linha mostrando evolução ao longo do tempo</p>
            {tendenciaPerformance && tendenciaPerformance.length > 0 ? (
              <div className="space-y-4">
                {/* Gráfico de Valor Ganho */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Valor Ganho por Mês</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={tendenciaPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tickFormatter={formatMonth} />
                      <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Valor Ganho']}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Line type="monotone" dataKey="valor_ganho" stroke="#10B981" strokeWidth={3} name="Valor Ganho" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Gráfico de Quantidade de Licitações */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Quantidade de Licitações</h5>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={tendenciaPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tickFormatter={formatMonth} />
                      <YAxis domain={[0, 'dataMax + 1']} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          value, 
                          name === 'total_licitacoes' ? 'Total de Licitações' : 'Licitações Ganhas'
                        ]}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Line type="monotone" dataKey="total_licitacoes" stroke="#3B82F6" name="Total de Licitações" />
                      <Line type="monotone" dataKey="licitacoes_ganhas" stroke="#10B981" name="Licitações Ganhas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {isAdmin && selectedClienteId ? (
                  <div>
                    <p className="text-gray-600 mb-2">
                      O cliente selecionado não possui licitações cadastradas.
                    </p>
                    <p className="text-sm text-gray-500">
                      Selecione outro cliente ou crie licitações para este cliente.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum dado disponível para o período selecionado</p>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Distribuição por Portal</h4>
            <p className="text-sm text-gray-600">Gráfico de pizza mostrando distribuição por portal</p>
            {distribuicaoPortal && distribuicaoPortal.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={distribuicaoPortal}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884D8"
                    label={({ portal, percentual }) => `${portal}: ${percentual.toFixed(1)}%`}
                    dataKey="quantidade"
                  >
                    {distribuicaoPortal.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, _name: string, props: any) => [
                      `${props.payload.portal}: ${value} licitações`,
                      'Quantidade'
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8">
                {isAdmin && selectedClienteId ? (
                  <div>
                    <p className="text-gray-600 mb-2">
                      O cliente selecionado não possui licitações cadastradas.
                    </p>
                    <p className="text-sm text-gray-500">
                      Selecione outro cliente ou crie licitações para este cliente.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum dado disponível</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
