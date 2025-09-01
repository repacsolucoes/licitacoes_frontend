import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { licitacaoService, clienteService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Filter,
  X,
  CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LicitacaoForm from '../components/LicitacaoForm';
import { Licitacao } from '../types';

const Licitacoes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLicitacao, setEditingLicitacao] = useState<Licitacao | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['licitacoes']);

  // Buscar clientes para filtro (apenas admin)
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list(),
    {
      enabled: isAdmin // Só busca clientes se for admin
    }
  );

  // Buscar licitações com filtros
  const { data: licitacoes = [], isLoading } = useQuery(
    ['licitacoes', searchTerm, selectedClienteId, dataInicio, dataFim, statusFilter],
    () => licitacaoService.list({ 
      search: searchTerm || undefined,
      cliente_id: selectedClienteId || undefined,
      status_filter: statusFilter || undefined
    })
  );

  const deleteMutation = useMutation(
    (id: number) => licitacaoService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('licitacoes');
        toast.success('Licitação deletada com sucesso!');
      },
      onError: () => {
        toast.error('Erro ao deletar licitação');
      },
    }
  );

  const updateApiMutation = useMutation(
    (id: number) => licitacaoService.atualizarApi(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('licitacoes');
        toast.success('Licitação atualizada via API!');
      },
      onError: () => {
        toast.error('Erro ao atualizar licitação via API');
      },
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar esta licitação?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateApi = (id: number) => {
    updateApiMutation.mutate(id);
  };

  const handleEdit = (licitacao: Licitacao) => {
    setEditingLicitacao(licitacao);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLicitacao(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLicitacao(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClienteId('');
    setDataInicio('');
    setDataFim('');
    setStatusFilter('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      // Se a data já está no formato YYYY-MM-DD, converter diretamente
      if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Para outros formatos, usar a biblioteca date-fns
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'GANHO':
        return 'bg-green-100 text-green-800';
      case 'DESCLASSIFICADO':
        return 'bg-red-100 text-red-800';
      case 'AGUARDANDO':
      case 'AGUARDANDO PEDIDO':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Licitações</h1>
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="licitacoes" />
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Licitação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="font-medium text-gray-900">Filtros</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número, UASG ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Pesquisa no número da licitação, UASG e descrição
                </div>
              </div>

              {/* Filtro por cliente (apenas admin) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <select
                    value={selectedClienteId}
                    onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : '')}
                    className="input-field"
                  >
                    <option value="">Todos os clientes</option>
                    {clientes.map((cliente: any) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Novos filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por data início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CalendarDays className="inline h-4 w-4 mr-1" />
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Filtro por data fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CalendarDays className="inline h-4 w-4 mr-1" />
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Filtro por status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todos os status</option>
                  <option value="AGUARDANDO">Aguardando</option>
                  <option value="GANHO">Ganho</option>
                  <option value="DESCLASSIFICADO">Desclassificado</option>
                  <option value="AGUARDANDO PEDIDO">Aguardando Pedido</option>
                </select>
              </div>
            </div>

            {/* Botão limpar filtros */}
            {(searchTerm || selectedClienteId || dataInicio || dataFim || statusFilter) && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de licitações */}
      <div className="mb-2 text-sm text-gray-600">
        Mostrando {licitacoes.length} licitação{licitacoes.length !== 1 ? 'ões' : ''}
      </div>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
        {licitacoes.map((licitacao: any) => (
          <div key={licitacao.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-relaxed pr-4 flex-1">
                    {licitacao.descricao}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(licitacao.status)}`}>
                    {licitacao.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 text-sm">
                  <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Nº {licitacao.numero}</span>
                  </div>
                  <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{formatDate(licitacao.data_licitacao)}</span>
                  </div>
                  <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">{formatCurrency(licitacao.preco_final)}</span>
                  </div>
                  <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Margem: {licitacao.margem_percentual.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    <span className="text-green-600 font-medium mr-2">💰</span>
                    <span>Imposto: {formatCurrency(licitacao.imposto_nota)}</span>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-md">
                    <span className="font-medium">Portal:</span> {licitacao.portal}
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleUpdateApi(licitacao.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Atualizar via API"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(licitacao)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(licitacao.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {licitacoes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma licitação encontrada</h3>
          <p className="text-gray-500">
            {searchTerm || selectedClienteId 
              ? 'Tente ajustar os filtros ou comece adicionando uma nova licitação.'
              : 'Comece adicionando sua primeira licitação.'
            }
          </p>
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <LicitacaoForm
          licitacao={editingLicitacao || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default Licitacoes;
