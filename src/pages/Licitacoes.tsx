import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { licitacaoService, clienteService } from '../services/api';
import { Licitacao, Cliente } from '../types';
import { Search, Filter, Package, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { RefreshButton } from '../components/RefreshButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LicitacaoComItensForm from '../components/LicitacaoComItensForm';

const Licitacoes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormComItens, setShowFormComItens] = useState(false);
  const [editingLicitacao, setEditingLicitacao] = useState<Licitacao | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingLicitacao, setViewingLicitacao] = useState<Licitacao | null>(null);

  const queryClient = useQueryClient();

  // Buscar licitações com filtros
  const { data: licitacoes = [], isLoading, refetch } = useQuery(
    ['licitacoes', selectedClienteId, selectedStatus, searchTerm],
    () => licitacaoService.list({
      cliente_id: selectedClienteId || undefined,
      status_filter: selectedStatus || undefined,
      search: searchTerm || undefined
    }),
    {
      onSuccess: (data) => {
        // Licitações carregadas com sucesso
      },
      onError: (error) => {
        console.error('Erro ao carregar licitações:', error);
      }
    }
  );

  // Buscar clientes para filtro
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list()
  );

  // Mutation para deletar licitação
  const deleteLicitacaoMutation = useMutation(
    (id: number) => licitacaoService.delete(id),
    {
      onSuccess: () => {
        toast.success('Licitação removida com sucesso!');
        queryClient.invalidateQueries('licitacoes');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erro ao remover licitação');
      }
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja remover esta licitação?')) {
      deleteLicitacaoMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setShowFormComItens(false);
    setEditingLicitacao(null);
    queryClient.invalidateQueries('licitacoes');
  };

  const handleEdit = async (licitacao: Licitacao) => {
    try {
      // Buscar a licitação completa com todos os campos do órgão
      const licitacaoCompleta = await licitacaoService.getCompleta(licitacao.id);
      setEditingLicitacao(licitacaoCompleta);
      setShowFormComItens(true);
    } catch (error) {
      console.error('Erro ao buscar licitação completa:', error);
      // Se falhar, usar a licitação da lista
      setEditingLicitacao(licitacao);
      setShowFormComItens(true);
    }
  };

  const handleView = (licitacao: Licitacao) => {
    setViewingLicitacao(licitacao);
  };
  
  // Função estável para fechar o modal
  const handleCloseForm = useCallback(() => {
    setShowFormComItens(false);
    setEditingLicitacao(null); // Limpar licitação em edição
  }, []);

  const clearFilters = () => {
    setSelectedClienteId('');
    setSelectedStatus('');
    setSearchTerm('');
  };

  const filteredLicitacoes = licitacoes.filter(licitacao => {
    if (searchTerm && !licitacao.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-2 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Licitações</h1>
        
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="licitacoes" />
          <button
            onClick={() => {
              setEditingLicitacao(null); // Garantir que não há licitação em edição
              setShowFormComItens(true);
            }}
            className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Package className="h-4 w-4" />
            Nova Licitação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os clientes</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="AGUARDANDO">Aguardando</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="GANHO">Ganho</option>
                <option value="PERDIDO">Perdido</option>
                <option value="DESCLASSIFICADO">Desclassificado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>

            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por descrição..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Resultados e ações */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Mostrando {filteredLicitacoes.length} licitação{filteredLicitacoes.length !== 1 ? 'ões' : ''}
            </span>
            {(selectedClienteId || selectedStatus || searchTerm) && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Licitações */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando licitações...</p>
        </div>
      ) : filteredLicitacoes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma licitação encontrada</h3>
          <p className="text-gray-600">Comece adicionando sua primeira licitação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLicitacoes.map((licitacao) => (
            <div key={licitacao.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              {/* Header do Card */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                    {licitacao.descricao}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 flex-shrink-0 ${
                    licitacao.status === 'GANHO' ? 'bg-green-100 text-green-800' :
                    licitacao.status === 'PERDIDO' ? 'bg-red-100 text-red-800' :
                    licitacao.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-800' :
                    licitacao.status === 'AGUARDANDO' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {licitacao.status}
                  </span>
                </div>
              </div>

              {/* Detalhes do Card */}
              <div className="p-4 space-y-3">
                {/* Número */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>N° {licitacao.numero}</span>
                </div>

                {/* Data */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDate(licitacao.data_licitacao)}</span>
                </div>

                {/* Valor */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>{formatCurrency(licitacao.preco_final)}</span>
                </div>

                {/* Margem */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <span>Margem: {licitacao.margem_percentual ? `${licitacao.margem_percentual.toFixed(2)}%` : '0.00%'}</span>
                </div>

                {/* Imposto */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>Imposto: {formatCurrency(licitacao.imposto || 0)}</span>
                </div>

                {/* Portal */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Portal:</span> {licitacao.portal || 'COMPRAS NET'}
                </div>
              </div>

              {/* Ações do Card */}
              <div className="px-4 pb-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleView(licitacao)}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEdit(licitacao)}
                  className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(licitacao.id)}
                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário com itens */}
      {showFormComItens && (
        <LicitacaoComItensForm
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
          editingLicitacao={editingLicitacao}
        />
      )}
    </div>
  );
};

export default Licitacoes;
