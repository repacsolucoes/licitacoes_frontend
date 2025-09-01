import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { licitacaoService, clienteService, pedidoService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Users,
  BarChart3
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['dashboard-stats', 'pedidos-stats']);

  // Buscar clientes para filtro (apenas para admin)
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list(),
    { enabled: isAdmin }
  );

  // Buscar estatísticas do dashboard
  const { data: stats, isLoading } = useQuery(
    ['dashboard-stats', selectedClienteId],
    () => licitacaoService.getDashboardStats(selectedClienteId ? Number(selectedClienteId) : undefined),
    {
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 segundos
      cacheTime: 60000  // 1 minuto
    }
  );

  // Buscar estatísticas de pedidos
  const { data: pedidosStats, isLoading: pedidosLoading } = useQuery(
    ['pedidos-stats', selectedClienteId],
    () => pedidoService.getStats(),
    {
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 segundos
      cacheTime: 60000  // 1 minuto
    }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handleClienteChange = (clienteId: string) => {
    setSelectedClienteId(clienteId ? Number(clienteId) : '');
  };



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        
        <div className="flex items-center gap-4">
          {/* Botão de refresh */}
          <RefreshButton refreshType="all" />
          
          {/* Filtro por cliente (apenas para admin) */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filtrar por cliente:</label>
              <select
                value={selectedClienteId}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="input-field w-64"
              >
                <option value="">Todos os clientes</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.cpf_cnpj} - {cliente.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading || pedidosLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando estatísticas...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {/* Total de Licitações */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total de Licitações</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_licitacoes || 0}</p>
              </div>
            </div>

            {/* Licitações Ganhas */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Licitações Ganhas</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.licitacoes_ganhas || 0}</p>
              </div>
            </div>

            {/* Licitações Pendentes */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Licitações Pendentes</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.licitacoes_pendentes || 0}</p>
              </div>
            </div>

            {/* Licitações Desclassificadas */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Users className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Desclassificadas</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.licitacoes_desclassificadas || 0}</p>
              </div>
            </div>

            {/* Pedidos Criados */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pedidos Criados</p>
                <p className="text-3xl font-bold text-gray-900">{pedidosStats?.total_pedidos || 0}</p>
              </div>
            </div>

            {/* Pedidos Entregues */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pedidos Entregues</p>
                <p className="text-3xl font-bold text-gray-900">{pedidosStats?.pedidos_concluidos || 0}</p>
              </div>
            </div>
          </div>

          {/* Estatísticas Financeiras */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Valor Total Ganho</h3>
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                <span className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats?.valor_total_ganho || 0)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Margem Média</h3>
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
                <span className="text-3xl font-bold text-blue-600">
                  {formatPercentage(stats?.margem_media || 0)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Taxa de Sucesso</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Geral:</span>
                  <span className="text-sm font-medium">
                    {stats?.total_licitacoes ?
                      formatPercentage((stats.licitacoes_ganhas / stats.total_licitacoes) * 100) :
                      '0.00%'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor médio ganho:</span>
                  <span className="text-sm font-medium">
                    {stats?.licitacoes_ganhas ?
                      formatCurrency(stats.valor_total_ganho / stats.licitacoes_ganhas) :
                      formatCurrency(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pendentes:</span>
                  <span className="text-sm font-medium">
                    {stats?.licitacoes_pendentes || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas de Pedidos */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas de Pedidos</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Status dos Pedidos</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pendentes:</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {pedidosStats?.pedidos_pendentes || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Em Andamento:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {pedidosStats?.pedidos_em_andamento || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Concluídos:</span>
                    <span className="text-sm font-medium text-green-600">
                      {pedidosStats?.pedidos_concluidos || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cancelados:</span>
                    <span className="text-sm font-medium text-red-600">
                      {pedidosStats?.pedidos_cancelados || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Taxa de Entrega</h4>
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-emerald-600 mr-3" />
                  <span className="text-3xl font-bold text-emerald-600">
                    {pedidosStats?.total_pedidos && pedidosStats?.pedidos_concluidos ?
                      formatPercentage((pedidosStats.pedidos_concluidos / pedidosStats.total_pedidos) * 100) :
                      '0.00%'
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {pedidosStats?.pedidos_concluidos || 0} de {pedidosStats?.total_pedidos || 0} pedidos entregues
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Pedidos em Progresso</h4>
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                  <span className="text-3xl font-bold text-blue-600">
                    {pedidosStats?.pedidos_em_andamento || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Pedidos em andamento
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Pedidos Pendentes</h4>
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-yellow-600 mr-3" />
                  <span className="text-3xl font-bold text-yellow-600">
                    {pedidosStats?.pedidos_pendentes || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Aguardando início
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
