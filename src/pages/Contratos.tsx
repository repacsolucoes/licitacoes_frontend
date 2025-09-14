import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { contratoService, licitacaoService, clienteService } from '../services/api';
import { Contrato, ContratoCreate, ContratoUpdate, Licitacao } from '../types';
import { Plus, Edit, Trash2, Search, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import toast from 'react-hot-toast'; // 🎯 NOVO: Import para notificações
import Pagination from '../components/Pagination';

const Contratos: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { alertState, hideAlert, confirm } = useCustomAlert();
  const [showModal, setShowModal] = useState(false);

  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clienteFilter, setClienteFilter] = useState<number | ''>('');
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [formData, setFormData] = useState({
    numero_contrato: '',
    data_contrato: '',
    valor_contrato: 0,
    tipo_entrega: 'ENTREGA_UNICA',
    prazo_contrato: undefined as number | undefined, // 🎯 CORRIGIDO: undefined em vez de 0
    observacoes: '',
    status: 'ATIVO'
  });

  // Buscar clientes para filtro (apenas para admin)
  const { data: clientesData = [] } = useQuery(
    'clientes',
    () => clienteService.list(),
    { enabled: user?.is_admin }
  );

  // Extrair clientes da resposta (pode ser array direto ou objeto paginado)
  const clientes = Array.isArray(clientesData) ? clientesData : (clientesData.data || []);

  // Buscar contratos com paginação
  const { data: contratosData, isLoading, error } = useQuery(
    ['contratos', currentPage, itemsPerPage, searchTerm, statusFilter, clienteFilter],
    () => contratoService.list({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      cliente_id: clienteFilter || undefined
    }),
    {
      enabled: !!user,
      refetchOnWindowFocus: false,
    }
  );

  // Extrair dados da resposta paginada
  // Verificar se é uma resposta paginada ou array direto
  let contratos: Contrato[] = [];
  let totalItems = 0;
  let totalPages = 1;
  
  if (contratosData) {
    if (Array.isArray(contratosData)) {
      // Resposta é um array direto
      contratos = contratosData;
      totalItems = contratosData.length;
      totalPages = 1;
    } else if (contratosData.data && Array.isArray(contratosData.data)) {
      // Resposta é paginada
      contratos = contratosData.data;
      totalItems = contratosData.total || contratosData.data.length;
      totalPages = contratosData.total_pages || 1;
    }
  }

  // Buscar licitações para seleção - APENAS COM STATUS GANHO
  const { data: licitacoesData } = useQuery(
    'licitacoes-ganhas',
    () => licitacaoService.list({ status_filter: 'GANHO' }),
    {
      enabled: !!user,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        console.log('Licitações GANHO carregadas:', data);
      },
      onError: (error) => {
        console.error('Erro ao carregar licitações GANHO:', error);
      }
    }
  );

  // Extrair dados da resposta paginada
  // Verificar se é uma resposta paginada ou array direto
  let licitacoes: Licitacao[] = [];
  
  if (licitacoesData) {
    if (Array.isArray(licitacoesData)) {
      // Resposta é um array direto
      licitacoes = licitacoesData;
      console.log('Licitações (array direto):', licitacoes.length);
    } else if (licitacoesData.data && Array.isArray(licitacoesData.data)) {
      // Resposta é paginada
      licitacoes = licitacoesData.data;
      console.log('Licitações (paginada):', licitacoes.length);
    }
  }
  
  console.log('Licitações finais para seleção:', licitacoes.length);

  // Buscar estatísticas
  const { data: stats } = useQuery(
    'contratosStats',
    contratoService.getStats,
    {
      enabled: !!user,
      refetchOnWindowFocus: false,
    }
  );

  // Mutação para criar/atualizar contrato
  const createMutation = useMutation(contratoService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('contratos');
      queryClient.invalidateQueries('contratosStats');
      setShowModal(false);
      setEditingContrato(null);
      resetForm();
      toast.success('Contrato criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar contrato. Tente novamente.');
    },
    onSettled: () => {
      // 🎯 CORRIGIDO: Sempre resetar o estado de loading
    }
  });

  const updateMutation = useMutation(
    (data: { id: number; contrato: ContratoUpdate }) =>
      contratoService.update(data.id, data.contrato),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contratos');
        queryClient.invalidateQueries('contratosStats');
        setShowModal(false);
        setEditingContrato(null);
        resetForm();
        toast.success('Contrato atualizado com sucesso!');
      },
      onError: () => {
        toast.error('Erro ao atualizar contrato. Tente novamente.');
      },
      onSettled: () => {
        // 🎯 CORRIGIDO: Sempre resetar o estado de loading
      }
    }
  );

  // Mutação para deletar contrato
  const deleteMutation = useMutation(contratoService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('contratos');
      queryClient.invalidateQueries('contratosStats');
      toast.success('Contrato deletado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao deletar contrato. Tente novamente.');
    },
    onSettled: () => {
      // 🎯 CORRIGIDO: Sempre resetar o estado de loading
    }
  });

  // Filtros agora são aplicados no backend, não precisamos mais de filtro local

  // Filtrar licitações que não têm contrato (já filtradas por status GANHO)
  const licitacoesDisponiveis = licitacoes.filter((licitacao: any) => {
    return !contratos.some(contrato => contrato.licitacao_id === licitacao.id);
  });

  // Estado para grupos e itens da licitação
  const [gruposItens, setGruposItens] = useState<any[]>([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<any>(null);



  // 🎯 NOVO: Listener para tecla Enter no formulário
  const handleFormKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  // Carregar dados da licitação selecionada
  const handleLicitacaoChange = async (licitacaoId: string) => {
    if (licitacaoId) {
      const licitacao = licitacoes.find((l: any) => l.id === parseInt(licitacaoId));
      if (licitacao) {
        setSelectedLicitacao(licitacao);
        setFormData(prev => ({
          ...prev,
          valor_contrato: licitacao.preco_final || 0
        }));
        
        // Buscar dados do órgão se tiver UASG
        if (licitacao.uasg) {
          try {
            const dadosOrgao = await contratoService.buscarDadosOrgao(licitacao.uasg);
            if (dadosOrgao) {
              // Atualizar a licitação com os dados do órgão
              setSelectedLicitacao(prev => prev ? {
                ...prev,
                nome_orgao: dadosOrgao.nome_orgao,
                cnpj_cpf_orgao: dadosOrgao.cnpj_cpf_orgao,
                sigla_uf: dadosOrgao.sigla_uf,
                codigo_municipio: dadosOrgao.codigo_municipio,
                nome_municipio_ibge: dadosOrgao.nome_municipio_ibge
              } : null);
            }
          } catch (error) {
            // Silenciar erro
          }
        }

        // Buscar grupos e itens da licitação
        try {
          const response = await contratoService.buscarGruposItensLicitacao(licitacao.id);
          
          // Nova estrutura: { grupos_itens, resumo_financeiro }
          if (response.grupos_itens) {
            setGruposItens(response.grupos_itens);
            setResumoFinanceiro(response.resumo_financeiro);
          } else {
            // Estrutura antiga (compatibilidade)
            setGruposItens(response);
            setResumoFinanceiro(null);
          }
        } catch (error) {
          setGruposItens([]);
          setResumoFinanceiro(null);
        }
      } else {
        setSelectedLicitacao(null);
        setGruposItens([]);
        setResumoFinanceiro(null);
      }
    } else {
      setSelectedLicitacao(null);
      setGruposItens([]);
      setResumoFinanceiro(null);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      numero_contrato: '',
      data_contrato: '',
      valor_contrato: 0,
      tipo_entrega: 'ENTREGA_UNICA',
      prazo_contrato: undefined, // 🎯 CORRIGIDO: undefined em vez de 0
      observacoes: '',
      status: 'ATIVO'
    });
    setSelectedLicitacao(null);
    setGruposItens([]);
    setResumoFinanceiro(null);
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
  }, [searchTerm, statusFilter, clienteFilter]);

  // Abrir modal para criar novo contrato
  const handleNewContrato = () => {
    hideAlert(); // 🎯 CORRIGIDO: Limpar qualquer alerta aberto PRIMEIRO
    resetForm();
    setEditingContrato(null);
    setShowModal(true);
  };

  // Função para visualizar detalhes do item
  const handleViewItem = (item: any) => {
    setViewingItem(item);
    setShowItemModal(true);
  };

  // Abrir modal para editar contrato
  const handleEditContrato = async (contrato: Contrato) => {
    setEditingContrato(contrato);
    
    // Definir a licitação associada
    if (contrato.licitacao) {
      setSelectedLicitacao(contrato.licitacao);
      
      // 🔍 CORREÇÃO: Buscar grupos e itens automaticamente
      try {
        const response = await contratoService.buscarGruposItensLicitacao(contrato.licitacao.id);
        
        // Nova estrutura: { grupos_itens, resumo_financeiro }
        if (response.grupos_itens) {
          setGruposItens(response.grupos_itens);
          setResumoFinanceiro(response.resumo_financeiro);
        } else {
          // Estrutura antiga (compatibilidade)
          setGruposItens(response);
          setResumoFinanceiro(null);
        }
      } catch (error) {
        setGruposItens([]);
        setResumoFinanceiro(null);
      }
    } else {
      setSelectedLicitacao(null);
      setGruposItens([]);
      setResumoFinanceiro(null);
    }
    
    // Definir dados do formulário
    setFormData({
      numero_contrato: contrato.numero_contrato,
      data_contrato: contrato.data_contrato.split('T')[0],
      valor_contrato: contrato.valor_contrato,
      tipo_entrega: contrato.tipo_entrega,
      prazo_contrato: contrato.prazo_contrato || undefined, // 🎯 CORRIGIDO: undefined em vez de 0
      observacoes: contrato.observacoes || '',
      status: contrato.status
    });
    
    hideAlert(); // 🎯 CORRIGIDO: Limpar qualquer alerta aberto PRIMEIRO
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLicitacao && !editingContrato) {
      alert('Selecione uma licitação para criar o contrato');
      return;
    }

    const contratoData = {
      ...formData,
      licitacao_id: selectedLicitacao?.id || editingContrato?.licitacao_id!,
      itens_contrato: [] // Por enquanto, vamos criar sem itens específicos
    };

    if (editingContrato) {
      updateMutation.mutate({ id: editingContrato.id, contrato: formData });
    } else {
      createMutation.mutate(contratoData as ContratoCreate);
    }
  };

  // 🎯 NOVO: Função para fechar modal com confirmação
  const handleCloseModal = async () => {
    if (editingContrato) {
      const confirmed = await confirm({
        title: 'Sair da Edição',
        message: 'Tem certeza que deseja sair da edição? As alterações não salvas serão perdidas.',
        type: 'warning'
      });
      if (confirmed) {
        setShowModal(false);
        setEditingContrato(null);
        resetForm();
      }
    } else {
      const confirmed = await confirm({
        title: 'Sair da Criação',
        message: 'Tem certeza que deseja sair da criação do contrato? Os dados não salvos serão perdidos.',
        type: 'warning'
      });
      if (confirmed) {
        setShowModal(false);
        setEditingContrato(null);
        resetForm();
      }
    }
  };

  // 🎯 NOVO: Função para deletar com confirmação customizada
  const handleDeleteWithConfirm = async (id: number) => {
    const confirmed = await confirm({
      title: 'Deletar Contrato',
      message: 'Tem certeza que deseja deletar este contrato? Esta ação não pode ser desfeita.',
      type: 'warning',
      confirmText: 'Deletar',
      cancelText: 'Cancelar'
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  // 🎯 NOVO: Listener para tecla Esc para fechar modais
  useEffect(() => {
    // 🎯 CORRIGIDO: Só adicionar listener quando modal estiver aberto
    if (!showModal && !showItemModal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 🎯 CORRIGIDO: Não interferir quando CustomAlert estiver aberto
        if (alertState.isOpen) {
          return; // Deixar o CustomAlert lidar com ESC
        }
        
        if (showModal) {
          handleCloseModal();
        }
        if (showItemModal) {
          setShowItemModal(false);
          setViewingItem(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, showItemModal, handleCloseModal]); // 🎯 REMOVIDO: alertState.isOpen da dependência


  if (isLoading) return <div className="flex justify-center items-center h-64">Carregando...</div>;
  if (error) return <div className="text-red-600">Erro ao carregar contratos</div>;

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-2">Gerencie os contratos das licitações</p>
        </div>
        <button
          onClick={handleNewContrato}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Novo Contrato
        </button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total</h3>
            <p className="text-3xl font-bold text-primary-600">{stats.total_contratos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Ativos</h3>
            <p className="text-3xl font-bold text-green-600">{stats.contratos_ativos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Suspensos</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.contratos_suspensos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Encerrados</h3>
            <p className="text-3xl font-bold text-gray-600">{stats.contratos_encerrados}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Valor Total</h3>
            <p className="text-3xl font-bold text-blue-600">
              R$ {stats.valor_total_contratos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por número, licitação ou objeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="ATIVO">Ativo</option>
              <option value="SUSPENSO">Suspenso</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>
          {user?.is_admin && (
            <div className="w-full md:w-48">
              <select
                value={clienteFilter}
                onChange={(e) => setClienteFilter(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

      {/* Lista de Contratos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Licitação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contratos.map((contrato) => (
                <tr key={contrato.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contrato.numero_contrato}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{contrato.licitacao?.numero}</div>
                      <div className="text-gray-500 text-xs truncate max-w-xs">
                        {contrato.licitacao?.descricao}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(contrato.data_contrato).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {contrato.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      contrato.status === 'ATIVO' ? 'bg-green-100 text-green-800' :
                      contrato.status === 'SUSPENSO' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {contrato.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditContrato(contrato)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWithConfirm(contrato.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {contratos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum contrato encontrado</p>
          </div>
        )}

      </div>

      {/* Modal de Criar/Editar Contrato */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={(e) => {
            // 🎯 NOVO: Clique fora do modal fecha com confirmação
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
              </h3>
              
              <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
                {/* Seleção de Licitação */}
                {!editingContrato && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-md font-medium text-blue-900 mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Selecionar Licitação
                    </h4>
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">
                        <strong>📋 Filtro ativo:</strong> Apenas licitações com status <span className="font-semibold text-green-800">GANHO</span> são exibidas para criação de contratos.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-2">
                          Licitação *
                        </label>
                        <select
                          value={selectedLicitacao?.id || ''}
                          onChange={(e) => handleLicitacaoChange(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione uma licitação</option>
                          {licitacoesDisponiveis.map((licitacao: any) => (
                            <option key={licitacao.id} value={licitacao.id}>
                              {licitacao.numero} - {licitacao.descricao?.substring(0, 50)}...
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedLicitacao && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm text-gray-600">
                            <strong>Descrição:</strong> {selectedLicitacao.descricao}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Valor Final:</strong> R$ {selectedLicitacao.preco_final?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Número:</strong> {selectedLicitacao.numero}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>UASG:</strong> {selectedLicitacao.uasg}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Órgão:</strong> {selectedLicitacao.nome_orgao || 'Não informado'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>CNPJ/CPF:</strong> {selectedLicitacao.cnpj_cpf_orgao || 'Não informado'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Município:</strong> {selectedLicitacao.nome_municipio_ibge || 'Não informado'} - {selectedLicitacao.sigla_uf || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dados do Contrato */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número do Contrato *
                    </label>
                    <input
                      type="text"
                      value={formData.numero_contrato}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_contrato: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data do Contrato *
                    </label>
                    <input
                      type="date"
                      value={formData.data_contrato}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_contrato: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor do Contrato *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_contrato}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_contrato: parseFloat(e.target.value) || 0 }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Entrega *
                    </label>
                    <select
                      value={formData.tipo_entrega}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_entrega: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="ENTREGA_UNICA">Entrega Única</option>
                      <option value="FORNECIMENTO_ANUAL">Fornecimento durante o ano</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prazo (dias)
                    </label>
                    <input
                      type="number"
                      value={formData.prazo_contrato || ''} // 🎯 CORRIGIDO: '' em vez de undefined
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        prazo_contrato: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      disabled={formData.tipo_entrega === 'ENTREGA_UNICA'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        formData.tipo_entrega === 'ENTREGA_UNICA' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder={formData.tipo_entrega === 'ENTREGA_UNICA' ? 'Não aplicável' : 'Digite o prazo em dias'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="SUSPENSO">Suspenso</option>
                      <option value="ENCERRADO">Encerrado</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Seção de Grupos e Itens da Licitação */}
                {gruposItens.length > 0 && (() => {
  // Verificar se há grupos reais (não apenas itens soltos)
  const gruposReais = gruposItens.filter(grupo => grupo.tipo !== 'ITENS_DIRETOS');
  const itensSolos = gruposItens.filter(grupo => grupo.tipo === 'ITENS_DIRETOS');
  
  // Se há grupos reais, mostrar apenas eles (evita redundância)
  if (gruposReais.length > 0) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          📊 Grupos da Licitação
          <span className="ml-2 text-sm text-gray-500 font-normal">
            (Itens organizados por grupos)
          </span>
        </h3>
        <div className="space-y-4">
          {gruposReais.map((grupo) => (
            <div key={grupo.id || `grupo-${grupo.posicao}`} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Header do Grupo */}
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 text-sm font-semibold">
                        {grupo.posicao}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {grupo.posicao}º Grupo: {grupo.nome}
                      </h4>
                      {grupo.descricao && (
                        <p className="text-sm text-gray-600">{grupo.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {grupo.itens.length} item{grupo.itens.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-lg font-bold text-indigo-600">
                      R$ {grupo.itens.reduce((total: number, item: any) => total + (item.preco_total || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tabela de Itens do Grupo */}
              {grupo.itens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CÓDIGO
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DESCRIÇÃO
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          QTD.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          UNIDADE
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PREÇO UNIT.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PREÇO TOTAL
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          MARCA/MODELO
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          AÇÕES
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {grupo.itens.map((item: any, index: number) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.posicao?.toString().padStart(3, '0') || (index + 1).toString().padStart(3, '0')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium text-gray-900">{item.descricao}</div>
                              {item.especificacoes_tecnicas && (
                                <div className="text-xs text-gray-500 mt-1">
                                  <strong>Especificações:</strong> {item.especificacoes_tecnicas}
                                </div>
                              )}
                              {item.observacoes && (
                                <div className="text-xs text-gray-500 mt-1">
                                  <strong>Obs:</strong> {item.observacoes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.quantidade?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.unidade}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            R$ {item.preco_unitario?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                            R$ {item.preco_total?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.marca_modelo || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button 
                                type="button"
                                onClick={() => handleViewItem(item)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Ver detalhes do item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-indigo-600 text-2xl">📋</span>
                  </div>
                  <p className="text-sm text-indigo-700">
                    Este grupo não possui itens cadastrados.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Se só há itens soltos (sem grupos), mostrar apenas eles
  if (itensSolos.length > 0) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          📦 Itens da Licitação
          <span className="ml-2 text-sm text-gray-500 font-normal">
            (Itens disponíveis para contratação)
          </span>
        </h3>
        <div className="space-y-4">
          {itensSolos.map((grupo) => (
            <div key={grupo.id || `grupo-${grupo.posicao}`} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Header dos Itens Soltos */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📦</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        Itens da Licitação
                      </h4>
                      {grupo.descricao && (
                        <p className="text-sm text-gray-600">{grupo.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {grupo.itens.length} item{grupo.itens.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      R$ {grupo.itens.reduce((total: number, item: any) => total + (item.preco_total || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Cards de Itens Soltos */}
              {grupo.itens.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {grupo.itens.map((item: any, index: number) => (
                    <div key={item.id} className={`p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Header do Item */}
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-700">
                                {item.posicao || index + 1}
                              </span>
                            </div>
                            <div className="font-semibold text-gray-800">{item.descricao}</div>
                          </div>
                          
                          {/* Grid de Informações do Item */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500 text-xs">Quantidade:</span>
                              <div className="font-medium text-gray-700">
                                {item.quantidade} {item.unidade}
                              </div>
                            </div>
                            
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500 text-xs">Preço Unit.:</span>
                              <div className="font-medium text-gray-700">
                                R$ {item.preco_unitario?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                            
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500 text-xs">Total:</span>
                              <div className="font-semibold text-green-600">
                                R$ {item.preco_total?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                            
                            {item.marca_modelo && (
                              <div className="bg-white p-2 rounded border">
                                <span className="text-gray-500 text-xs">Marca/Modelo:</span>
                                <div className="font-medium text-gray-700">
                                  {item.marca_modelo}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Especificações e Observações */}
                          {(item.especificacoes_tecnicas || item.observacoes) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {item.especificacoes_tecnicas && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 font-medium">Especificações:</span>
                                    <span className="ml-2 text-gray-700">{item.especificacoes_tecnicas}</span>
                                  </div>
                                )}
                                {item.observacoes && (
                                  <div className="bg-blue-50 p-2 rounded">
                                    <span className="text-gray-500 font-medium">Obs:</span>
                                    <span className="ml-2 text-gray-700">{item.observacoes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-blue-600 text-2xl">📋</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Nenhum item cadastrado nesta licitação.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return null;
})()}

                {gruposItens.length === 0 && selectedLicitacao && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <div className="text-yellow-800">
                        <p className="text-sm">
                          <strong>Nenhum grupo ou item encontrado</strong> para esta licitação.
                        </p>
                        <p className="text-xs mt-1">
                          Verifique se a licitação possui grupos e itens cadastrados.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Seção de Resumo Financeiro da Licitação */}
                {resumoFinanceiro && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      📊 Resumo Financeiro da Licitação
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-blue-600">
                          {resumoFinanceiro.tipo_contagem === 'grupos' ? 'Total de Grupos' : 'Total de Itens'}
                        </div>
                        <div className="text-2xl font-bold text-blue-800">{resumoFinanceiro.total_itens}</div>
                        <div className="text-xs text-blue-600">
                          {resumoFinanceiro.tipo_contagem === 'grupos' ? 'Grupos organizados' : 'Quantidade total'}
                        </div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-green-600">Preço Final</div>
                        <div className="text-2xl font-bold text-green-800">
                          R$ {resumoFinanceiro.preco_final?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-green-600">Valor da licitação</div>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-orange-600">Custo Real</div>
                        <div className="text-2xl font-bold text-orange-800">
                          R$ {resumoFinanceiro.custo_real?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-orange-600">Custo total dos itens</div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-purple-600">Margem</div>
                        <div className="text-2xl font-bold text-purple-800">
                          {resumoFinanceiro.margem?.toFixed(2) || '0.00'}%
                        </div>
                        <div className="text-xs text-purple-600">Lucro sobre custo</div>
                      </div>
                    </div>
                  </div>
                )}


                
                <div className="flex justify-end space-x-3">
                                      <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    disabled={createMutation.isLoading || updateMutation.isLoading || (!editingContrato && !selectedLicitacao)}
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar detalhes do item */}
      {showItemModal && viewingItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // 🎯 NOVO: Clique fora do modal fecha
            if (e.target === e.currentTarget) {
              setShowItemModal(false);
              setViewingItem(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  📋 Detalhes do Item
                </h3>
                <button
                  onClick={() => {
                    setShowItemModal(false);
                    setViewingItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Código:</span>
                    <div className="text-lg font-semibold text-gray-800 mt-1">
                      {viewingItem.posicao?.toString().padStart(3, '0') || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Quantidade:</span>
                    <div className="text-lg font-semibold text-gray-800 mt-1">
                      {viewingItem.quantidade} {viewingItem.unidade}
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <span className="text-sm font-medium text-blue-600">Descrição:</span>
                  <div className="text-gray-800 mt-2 font-medium">
                    {viewingItem.descricao}
                  </div>
                </div>

                {/* Especificações técnicas */}
                {viewingItem.especificacoes_tecnicas && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-green-600">Especificações Técnicas:</span>
                    <div className="text-gray-800 mt-2">
                      {viewingItem.especificacoes_tecnicas}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {viewingItem.observacoes && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-yellow-600">Observações:</span>
                    <div className="text-gray-800 mt-2">
                      {viewingItem.observacoes}
                    </div>
                  </div>
                )}

                {/* Informações financeiras */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-green-600">Preço Unitário:</span>
                    <div className="text-lg font-semibold text-green-800 mt-1">
                      R$ {viewingItem.preco_unitario?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-blue-600">Preço Total:</span>
                    <div className="text-lg font-semibold text-blue-800 mt-1">
                      R$ {viewingItem.preco_total?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                {/* Marca/Modelo */}
                {viewingItem.marca_modelo && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-purple-600">Marca/Modelo:</span>
                    <div className="text-gray-800 mt-2 font-medium">
                      {viewingItem.marca_modelo}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setViewingItem(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
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

export default Contratos;
