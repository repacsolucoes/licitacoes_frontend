import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { licitacaoService, clienteService } from '../services/api';
import { Licitacao, Cliente } from '../types';
import { Search, Filter, Package, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { RefreshButton } from '../components/RefreshButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LicitacaoComItensForm from '../components/LicitacaoComItensForm';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import Pagination from '../components/Pagination';

const Licitacoes: React.FC = () => {
  const { alertState, hideAlert, confirm } = useCustomAlert();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormComItens, setShowFormComItens] = useState(false);
  const [editingLicitacao, setEditingLicitacao] = useState<Licitacao | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewingLicitacao, setViewingLicitacao] = useState<Licitacao | null>(null);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const queryClient = useQueryClient();

  // Buscar licitações com filtros e paginação
  const { data: licitacoesData, isLoading, refetch, error } = useQuery(
    ['licitacoes', selectedClienteId, selectedStatus, searchTerm, currentPage, itemsPerPage],
    () => licitacaoService.list({
      cliente_id: selectedClienteId || undefined,
      status_filter: selectedStatus || undefined,
      search: searchTerm || undefined,
      page: currentPage,
      limit: itemsPerPage
    }),
    {
      onError: (error) => {
        console.error('Erro ao carregar licitações:', error);
      }
    }
  );

  // Extrair dados da resposta paginada
  // Verificar se é uma resposta paginada ou array direto
  let licitacoes = [];
  let totalItems = 0;
  let totalPages = 1;
  
  if (licitacoesData) {
    if (Array.isArray(licitacoesData)) {
      // Resposta é um array direto
      licitacoes = licitacoesData;
      totalItems = licitacoesData.length;
      totalPages = 1;
    } else if (licitacoesData.data && Array.isArray(licitacoesData.data)) {
      // Resposta é paginada
      licitacoes = licitacoesData.data;
      totalItems = licitacoesData.total || licitacoesData.data.length;
      totalPages = licitacoesData.total_pages || 1;
    }
  }

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

  // Funções de paginação
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
  };

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClienteId, selectedStatus, searchTerm]);

  const handleEdit = async (licitacao: Licitacao) => {
    try {
      // Buscar a licitação completa com todos os campos do órgão
      const licitacaoCompleta = await licitacaoService.getCompleta(licitacao.id);
      hideAlert(); // 🎯 CORRIGIDO: Limpar qualquer alerta aberto PRIMEIRO
      setEditingLicitacao(licitacaoCompleta);
      setShowFormComItens(true);
    } catch (error) {
      console.error('Erro ao buscar licitação completa:', error);
      // Se falhar, usar a licitação da lista
      hideAlert(); // 🎯 CORRIGIDO: Limpar qualquer alerta aberto PRIMEIRO
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



  // 🎯 NOVO: Função para fechar modal com confirmação
  const handleCloseFormWithConfirm = async () => {
    if (editingLicitacao) {
      const confirmed = await confirm({
        title: 'Sair da Edição',
        message: 'Tem certeza que deseja sair da edição? As alterações não salvas serão perdidas.',
        type: 'warning'
      });
      if (confirmed) {
        handleCloseForm();
      }
    } else {
      const confirmed = await confirm({
        title: 'Sair da Criação',
        message: 'Tem certeza que deseja sair da criação da licitação? Os dados não salvos serão perdidos.',
        type: 'warning'
      });
      if (confirmed) {
        handleCloseForm();
      }
    }
  };

  // 🎯 NOVO: Função para deletar com confirmação customizada
  const handleDeleteWithConfirm = async (id: number) => {
    const confirmed = await confirm({
      title: 'Deletar Licitação',
      message: 'Tem certeza que deseja deletar esta licitação? Esta ação não pode ser desfeita.',
      type: 'warning',
      confirmText: 'Deletar',
      cancelText: 'Cancelar'
    });
    if (confirmed) {
      deleteLicitacaoMutation.mutate(id);
    }
  };

  // 🎯 NOVO: Listener para tecla Esc para fechar modais
  useEffect(() => {
    // 🎯 CORRIGIDO: Só adicionar listener quando modal estiver aberto
    if (!showFormComItens && !viewingLicitacao) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 🎯 CORRIGIDO: Não interferir quando CustomAlert estiver aberto
        if (alertState.isOpen) {
          return; // Deixar o CustomAlert lidar com ESC
        }
        
        if (showFormComItens) {
          handleCloseFormWithConfirm();
        }
        if (viewingLicitacao) {
          setViewingLicitacao(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFormComItens, viewingLicitacao, handleCloseFormWithConfirm]); // 🎯 REMOVIDO: alertState.isOpen da dependência

  // Filtros agora são aplicados no backend, não precisamos mais de filtro local

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
    <div className="container mx-auto px-2 py-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Licitações</h1>
        
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="licitacoes" />
          <button
            onClick={() => {
              hideAlert(); // 🎯 CORRIGIDO: Limpar qualquer alerta aberto PRIMEIRO
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
              Mostrando {totalItems} licitação{totalItems !== 1 ? 'ões' : ''}
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
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-600 mb-2">Erro ao carregar licitações</h3>
          <p className="text-gray-600 mb-4">Verifique sua conexão e tente novamente.</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      ) : licitacoes.length === 0 ? (
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
          {licitacoes.map((licitacao) => (
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
                  onClick={() => handleDeleteWithConfirm(licitacao.id)}
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
          onClose={handleCloseForm} // 🎯 Para botão Cancelar (sem alerta)
          onCloseWithConfirm={handleCloseFormWithConfirm} // 🎯 NOVO: Para botão X e click outside (com alerta)
          onSuccess={handleFormSuccess}
          editingLicitacao={editingLicitacao}
        />
      )}

      {/* Componente de Paginação - Fixo na parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 md:left-64">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          showItemsPerPage={true}
          itemsPerPageOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* 🎯 NOVO: Alerta Customizado */}
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        onConfirm={alertState.onConfirm}
        title={alertState.options.title}
        message={alertState.options.message}
        type={alertState.options.type}
        confirmText={alertState.options.confirmText}
        cancelText={alertState.options.cancelText}
      />
    </div>
  );
};

export default Licitacoes;
