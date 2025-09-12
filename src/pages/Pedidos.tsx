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
import { pedidoService, clienteService, contratoService } from '../services/api';
import { Pedido, PedidoCreate, Licitacao, Cliente, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import Pagination from '../components/Pagination';

interface PedidoWithDetails extends Pedido {
  licitacao: Licitacao;
  user_criador: User;
  data_pagamento_previsto?: string;
}

const Pedidos: React.FC = () => {
  const { user } = useAuth();
  const { alertState, hideAlert, confirm } = useCustomAlert();
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['pedidos', 'pedidos-stats']);
  
  // Verificar token no carregamento do componente
  useEffect(() => {
    // Verificação de token removida para limpeza
  }, []);
  const [pedidos, setPedidos] = useState<PedidoWithDetails[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
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
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<number | ''>('');

  // Formulário
  const [formData, setFormData] = useState<PedidoCreate>({
    licitacao_id: 0,
    data_criacao: '', // Será preenchido automaticamente pelo backend
    empenho_feito: false,
    pedido_orgao_feito: false,
    contrato_feito: false,
    outros_documentos: false,
    entrega_feita: false,
    entrega_confirmada: false,
    data_entrega: '',
    numero_nota_fiscal: '',
    valor_nota_fiscal: 0.0,
    observacoes_entrega: '',
    status_geral: 'PENDENTE',
    status_pagamento: 'PENDENTE',
    pagamento_confirmado: false,
    data_pagamento_previsto: '',
    valor_pago: 0.0,
    data_pagamento: undefined,
    observacoes_pagamento: ''
  });


  // Estado para o novo modal avançado
  const [pedidoItems, setPedidoItems] = useState<Array<{
    item_id: number;
    quantidade: number | string;
    max_quantidade: number;
    preco_unitario?: number;
    preco_total?: number;
    custo_unitario?: number;
    custo_total?: number;
    item_licitacao?: any;
  }>>([]);
  const [availableItems, setAvailableItems] = useState<Array<{
    id: number;
    descricao: string;
    quantidade_disponivel: number;
  }>>([]);
  
  // 🎯 NOVO: Estado para modal de adicionar itens
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  
  // 🎯 NOVO: Estado para dados do contrato
  const [contratoData, setContratoData] = useState<any>(null);

  // 🎯 CORRIGIDO: useEffect otimizado para evitar loops infinitos
  useEffect(() => {
    carregarDados();
  }, [filtroStatus, filtroCliente, currentPage, itemsPerPage]);

  // Funções de paginação
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
  };

  // Listener para tecla Esc para fechar modais
  useEffect(() => {
    const handleEscKey = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showModal) {
          // 🎯 NOVO: Confirmar antes de sair se estiver editando
          if (editingPedido) {
            const confirmed = await confirm({
              title: 'Sair da Edição',
              message: 'Tem certeza que deseja sair da edição? As alterações não salvas serão perdidas.',
              type: 'warning'
            });
            if (confirmed) {
              setShowModal(false);
              setEditingPedido(null);
              resetForm();
            }
          } else {
            const confirmed = await confirm({
              title: 'Sair da Criação',
              message: 'Tem certeza que deseja sair da criação do pedido? Os dados não salvos serão perdidos.',
              type: 'warning'
            });
            if (confirmed) {
              setShowModal(false);
              setEditingPedido(null);
              resetForm();
            }
          }
        }
        if (viewingPedido) {
          setViewingPedido(null);
        }
        if (showAddItemModal) {
          setShowAddItemModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showModal, viewingPedido, showAddItemModal, editingPedido, confirm]);





  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar pedidos com paginação
      try {
        const pedidosData = await pedidoService.list({
          page: currentPage,
          limit: itemsPerPage,
          status: filtroStatus || undefined,
          cliente_id: filtroCliente || undefined
        });
        
        // Verificar se a resposta tem formato paginado ou é um array direto
        if (pedidosData && typeof pedidosData === 'object' && 'data' in pedidosData) {
          // Formato paginado
          setPedidos(pedidosData.data as PedidoWithDetails[]);
          setTotalItems(pedidosData.total || 0);
          setTotalPages(pedidosData.total_pages || 1);
        } else if (Array.isArray(pedidosData)) {
          // Formato array direto (fallback)
          setPedidos(pedidosData as PedidoWithDetails[]);
          setTotalItems((pedidosData as PedidoWithDetails[]).length);
          setTotalPages(1);
        } else {
          setPedidos([]);
          setTotalItems(0);
          setTotalPages(1);
        }
      } catch (error: any) {
        console.error('Erro ao carregar pedidos:', error);
        setPedidos([]);
        setTotalItems(0);
        setTotalPages(1);
      }

      // Carregar estatísticas
      try {
        const statsData = await pedidoService.getStats();
        setStats(statsData);
      } catch (error: any) {
        // Erro ao carregar estatísticas
      }

      // 🎯 NOVO: Carregar contratos (para criar novos pedidos)
      
      try {
        // Primeiro tentar contratos ativos para criação
        const contratosData = await contratoService.listarContratos();
        setContratos(contratosData);
      } catch (error: any) {
        console.error('Erro ao carregar contratos ativos:', error);
        // Se falhar, tentar endpoint geral
        try {
          const contratosData = await contratoService.list();
          setContratos(contratosData.data || []);
        } catch (error2: any) {
          console.error('Erro ao carregar contratos gerais:', error2);
          setContratos([]);
        }
      }

      // Carregar clientes (sempre necessário para exibir informações)
      try {
        const clientesData = await clienteService.list();
        setClientes(clientesData.data || []);
      } catch (error: any) {
        setClientes([]);
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
      // 🎯 NOVO: Preparar dados completos incluindo itens
      const dadosCompletos = {
        ...formData,
        // 🎯 CORRIGIDO: Mapear campos do frontend para o backend
        entrega_feita: formData.entrega_confirmada || false,
        entrega_data: formData.data_entrega || undefined,
        // 🎯 NOVO: Garantir que campos de pagamento sejam enviados
        status_pagamento: formData.status_pagamento,
        valor_pago: formData.valor_pago || 0,
        data_pagamento: formData.data_pagamento || null,
        data_pagamento_previsto: formData.data_pagamento_previsto || null,
        observacoes_pagamento: formData.observacoes_pagamento || '',
        // 🎯 NOVO: Garantir que campos da Nota Fiscal sejam enviados
        numero_nota_fiscal: formData.numero_nota_fiscal || '',
        valor_nota_fiscal: formData.valor_nota_fiscal || 0,
        // Incluir dados dos itens se existirem
        itens: pedidoItems.length > 0 ? pedidoItems : undefined,
        // Incluir dados do contrato se existir
        contrato_id: contratoData?.contrato?.id || undefined,
        // Calcular totais baseados nos itens
        valor_total: pedidoItems.reduce((total, item) => {
          const quantidade = Number(item.quantidade) || 0;
          const preco_unitario = Number(item.preco_unitario) || 0;
          return total + (quantidade * preco_unitario);
        }, 0),
        custo_total: pedidoItems.reduce((total, item) => {
          const quantidade = Number(item.quantidade) || 0;
          const custo_unitario = Number(item.custo_unitario) || 0;
          return total + (quantidade * custo_unitario);
        }, 0)
      };
      

      if (editingPedido) {
        await pedidoService.update(editingPedido.id, dadosCompletos as any);
      } else {
        await pedidoService.create(dadosCompletos as any);
      }
      
      setShowModal(false);
      setEditingPedido(null);
      
      // Recarregar apenas a lista de pedidos, não os dados do formulário
      carregarDados();
      
      // 🎯 NOVO: Mostrar mensagem de sucesso
      await confirm({
        title: 'Sucesso',
        message: 'Pedido atualizado com sucesso!',
        type: 'success',
        confirmText: 'OK'
      });
    } catch (error) {
      await confirm({
        title: 'Erro',
        message: `Erro ao salvar pedido: ${error}`,
        type: 'error',
        confirmText: 'OK'
      });
    }
  };


  const handleEdit = async (pedido: PedidoWithDetails) => {
    setEditingPedido(pedido);
    
    // 🎯 NOVO: Para edição, sempre buscar o contrato original do pedido
    try {
      console.log('🎯 Editando pedido ID:', pedido.id, 'Licitação ID:', pedido.licitacao_id);
      
      // 🎯 NOVO: Buscar contrato específico para esta licitação
      let contratoAtivo = null;
      
      try {
        // Primeiro, tentar buscar contrato específico da licitação
        contratoAtivo = await contratoService.getByLicitacao(pedido.licitacao_id);
        console.log('🎯 Contrato encontrado via getByLicitacao:', contratoAtivo ? 'SIM' : 'NÃO');
        
        if (contratoAtivo) {
          // Se encontrou, usar este contrato
          const contratoDataBasico = {
            contrato_existe: true,
            contrato: contratoAtivo,
            licitacao: {
              id: contratoAtivo.licitacao?.id,
              numero: contratoAtivo.licitacao?.numero,
              tipo_classificacao: contratoAtivo.licitacao?.tipo_classificacao
            },
            itens: [],
            itens_licitacao: [],
            grupos_licitacao: []
          };
          
          setContratoData(contratoDataBasico);
          console.log('🎯 Contrato carregado com sucesso');
        }
        
      } catch (error) {
        console.error('Erro ao buscar contrato específico:', error);
      }
      
      // Se não encontrou contrato específico, tentar buscar em todos os contratos
      if (!contratoAtivo) {
        try {
          // Buscar todos os contratos
          let todosContratos = await contratoService.listarContratos();
          
          if (todosContratos.length === 0) {
            todosContratos = await contratoService.list();
          }
          
          setContratos(todosContratos);
          
          // Procurar contrato que corresponde à licitação do pedido
          contratoAtivo = todosContratos.find((c: any) => {
            const contratoLicitacaoId = Number(c.licitacao?.id);
            const pedidoLicitacaoId = Number(pedido.licitacao_id);
            return contratoLicitacaoId === pedidoLicitacaoId;
          });
          
          console.log('🎯 Buscando em todos os contratos. Encontrados:', todosContratos.length);
          console.log('🎯 Contrato encontrado:', contratoAtivo ? 'SIM' : 'NÃO');
          
        } catch (error) {
          console.error('Erro ao buscar todos os contratos:', error);
        }
      }
      
      if (contratoAtivo) {
        
        try {
          // Usar o mesmo endpoint que a criação usa
          const contratoData = await contratoService.obterItensParaPedido(contratoAtivo.id);
          
          // 🎯 CORRIGIDO: Sempre mapear dados do contrato, mesmo se não houver itens disponíveis
          const contratoDataMapeado = {
            contrato_existe: true,
            contrato: contratoData.contrato,
            licitacao: {
              id: contratoData.licitacao_id,
              numero: contratoData.licitacao_numero,
              tipo_classificacao: contratoData.tipo_classificacao
            },
            itens: contratoData?.itens || [],
            itens_licitacao: contratoData.itens_licitacao || [],
            grupos_licitacao: contratoData.grupos_licitacao || []
          };
          
          setContratoData(contratoDataMapeado);
          
        } catch (error) {
          console.error('Erro ao carregar dados do contrato:', error);
          
          // 🎯 NOVO: Se não conseguir carregar dados do contrato, usar dados básicos
          const contratoDataBasico = {
            contrato_existe: true,
            contrato: contratoAtivo,
            licitacao: {
              id: contratoAtivo.licitacao?.id,
              numero: contratoAtivo.licitacao?.numero,
              tipo_classificacao: contratoAtivo.licitacao?.tipo_classificacao
            },
            itens: [],
            itens_licitacao: [],
            grupos_licitacao: []
          };
          
          setContratoData(contratoDataBasico);
        }
        
        // 🎯 CORRIGIDO: Para edição, carregar os itens que já existem no pedido
        if (pedido.itens_pedido && pedido.itens_pedido.length > 0) {
          const itensExistentes = pedido.itens_pedido.map((itemPedido: any) => {
            return {
              item_id: itemPedido.item_licitacao_id,
              quantidade: itemPedido.quantidade_solicitada || 0,
              max_quantidade: itemPedido.quantidade_solicitada || 0,
              preco_unitario: itemPedido.preco_unitario || 0,
              preco_total: itemPedido.preco_total || 0,
              custo_unitario: itemPedido.custo_unitario || 0,
              custo_total: itemPedido.custo_total || 0,
              item_licitacao: itemPedido.item_licitacao
            };
          });
          
          setPedidoItems(itensExistentes);
        } else {
          setPedidoItems([]);
        }
          
        // Atualizar itens disponíveis baseados no contrato
        if (contratoData && contratoData.itens) {
          setAvailableItems(contratoData.itens.map((item: any) => ({
            id: item.id,
            descricao: item.descricao || `Item ${item.id}`,
            quantidade_disponivel: item.quantidade || 0
          })));
        } else {
          setAvailableItems([]);
        }
      } else {
        setContratoData(null);
        setAvailableItems([]);
        
        // 🎯 NOVO: Mesmo sem contrato, carregar os itens existentes do pedido
        if (pedido.itens_pedido && pedido.itens_pedido.length > 0) {
          const itensExistentes = pedido.itens_pedido.map((itemPedido: any) => {
            return {
              item_id: itemPedido.item_licitacao_id,
              quantidade: itemPedido.quantidade_solicitada || 0,
              max_quantidade: itemPedido.quantidade_solicitada || 0,
              preco_unitario: itemPedido.preco_unitario || 0,
              preco_total: itemPedido.preco_total || 0,
              custo_unitario: itemPedido.custo_unitario || 0,
              custo_total: itemPedido.custo_total || 0,
              item_licitacao: itemPedido.item_licitacao
            };
          });
          
          setPedidoItems(itensExistentes);
        } else {
          setPedidoItems([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do contrato:', error);
      setContratoData(null);
      setAvailableItems([]);
      
      // 🎯 NOVO: Mesmo com erro, tentar carregar os itens existentes do pedido
      if (pedido.itens_pedido && pedido.itens_pedido.length > 0) {
        const itensExistentes = pedido.itens_pedido.map((itemPedido: any) => {
          return {
            item_id: itemPedido.item_licitacao_id,
            quantidade: itemPedido.quantidade_solicitada || 0,
            max_quantidade: itemPedido.quantidade_solicitada || 0,
            preco_unitario: itemPedido.preco_unitario || 0,
            preco_total: itemPedido.preco_total || 0,
            custo_unitario: itemPedido.custo_unitario || 0,
            custo_total: itemPedido.custo_total || 0,
            item_licitacao: itemPedido.item_licitacao
          };
        });
        
        setPedidoItems(itensExistentes);
      } else {
        setPedidoItems([]);
      }
    }
    
    // 🎯 NOVO: Calcular valor total do pedido baseado nos itens
    const valorTotalPedido = pedido.itens_pedido ? pedido.itens_pedido.reduce((total: number, item: any) => {
      return total + (item.preco_total || 0);
    }, 0) : 0;

    
    const formDataToSet = {
      licitacao_id: pedido.licitacao_id,
      data_criacao: pedido.created_at ? new Date(pedido.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
      entrega_confirmada: pedido.entrega_feita || false,
      data_entrega: pedido.entrega_data || '', // 🎯 CORRIGIDO: Mapear para o campo correto do formulário
      observacoes_entrega: pedido.entrega_observacoes || '',
      status_geral: pedido.status_geral,
      status_pagamento: pedido.status_pagamento,
      data_pagamento_previsto: pedido.data_pagamento_previsto || '',
      valor_pago: pedido.valor_pago,
      data_pagamento: pedido.data_pagamento,
      observacoes_pagamento: pedido.observacoes_pagamento,
      observacoes_gerais: pedido.observacoes_gerais,
      // 🎯 NOVO: Preencher automaticamente valor da nota fiscal com valor total do pedido
      valor_nota_fiscal: (pedido as any).valor_nota_fiscal || valorTotalPedido,
      numero_nota_fiscal: (pedido as any).numero_nota_fiscal || '',
      pagamento_confirmado: pedido.status_pagamento === 'PAGO'
    };
    
    
    setFormData(formDataToSet);
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Excluir Pedido',
      message: 'Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.',
      type: 'error'
    });
    
    if (confirmed) {
      try {
        setLoading(true);
        await pedidoService.delete(id);
        
        // 🎯 CORRIGIDO: Atualizar lista localmente em vez de recarregar tudo
        setPedidos(prevPedidos => prevPedidos.filter(pedido => pedido.id !== id));
        
        // 🎯 CORRIGIDO: Atualizar estatísticas localmente
        setStats(prevStats => ({
          ...prevStats,
          total_pedidos: prevStats.total_pedidos - 1,
          pedidos_em_andamento: prevStats.pedidos_em_andamento - 1
        }));
        
      } catch (error) {
        // Usar alerta customizado para erro
        await confirm({
          title: 'Erro',
          message: 'Erro ao deletar pedido. Tente novamente.',
          type: 'error',
          confirmText: 'OK'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // 🎯 NOVO: Função para obter descrição do item
  const getItemDescription = (itemId: number): string => {
    // 🎯 NOVO: Primeiro, verificar se o item atual tem dados de item_licitacao
    const currentItem = pedidoItems.find((item: any) => item.item_id === itemId);
    
    if (currentItem && currentItem.item_licitacao && currentItem.item_licitacao.descricao) {
      return currentItem.item_licitacao.descricao;
    }
    
    // 1. Tentar buscar em availableItems
    const availableItem = availableItems.find((avItem: any) => avItem.id === itemId);
    if (availableItem?.descricao) {
      return availableItem.descricao;
    }
    
    // 2. Tentar buscar em contratoData.itens
    if (contratoData?.itens) {
      const contratoItem = contratoData.itens.find((item: any) => item.id === itemId);
      if (contratoItem?.descricao) {
        return contratoItem.descricao;
      }
    }
    
    // 3. Fallback: retornar ID do item
    return `Item ${itemId}`;
  };

  // 🎯 NOVO: Funções para o modal baseado em contratos
  const handleContratoChange = async (contratoId: number) => {
    if (contratoId) {
      const contrato = contratos.find(c => c.id === contratoId);
      
      if (contrato) {
        // Preencher dados da licitação baseados no contrato
        setFormData(prev => ({
          ...prev,
          licitacao_id: contrato.licitacao.id
        }));
        
        
        // 🎯 NOVO: Usar endpoint específico para itens disponíveis
        try {
          const itensDisponiveis = await contratoService.obterItensParaPedido(contrato.id);
          
          if (itensDisponiveis && itensDisponiveis.total_itens_disponiveis > 0) {
            // 🎯 CORRIGIDO: Usar quantidades realmente disponíveis
            const itensContrato = itensDisponiveis.itens.map((item: any) => ({
              item_id: item.id,
              quantidade: '', // Iniciar vazio para novo pedido (não 0)
              max_quantidade: item.quantidade_disponivel, // Usar quantidade disponível como máximo
              preco_unitario: item.preco_unitario || 0,
              preco_total: 0, // Iniciar com 0
              custo_unitario: item.custo_unitario || 0,
              custo_total: 0 // Iniciar com 0
            }));
            
            setPedidoItems(itensContrato);
            
            // Atualizar itens disponíveis com quantidades reais
            setAvailableItems(itensDisponiveis.itens.map((item: any) => ({
              id: item.id,
              descricao: item.descricao || `Item ${item.id}`,
              quantidade_disponivel: item.quantidade_disponivel || 0
            })));
            
            // 🎯 CORRIGIDO: Mapear estrutura correta para grupos e ordenar
            const gruposMapeados = (itensDisponiveis.grupos_licitacao || [])
              .map((grupo: any) => ({
                id: grupo.id,
                nome: grupo.nome || `Grupo ${grupo.id}`,
                itens: grupo.itens || []
              }))
              .sort((a: any, b: any) => a.id - b.id); // Ordenar por ID
            
            const itensSemGrupo = (itensDisponiveis.itens_licitacao || []).map((item: any) => ({
              ...item,
              quantidade: item.quantidade_disponivel || '' // Iniciar vazio, não 0
            }));
            
            // 🎯 NOVO: Não mostrar itens por padrão - usuário adiciona manualmente
            setPedidoItems([]); // Iniciar sem itens
            
            // Atualizar dados do contrato para compatibilidade
            setContratoData({
              contrato_existe: true,
              contrato: itensDisponiveis.contrato,
              licitacao: {
                id: itensDisponiveis.licitacao_id,
                numero: itensDisponiveis.licitacao_numero,
                tipo_classificacao: itensDisponiveis.tipo_classificacao
              },
              itens: itensDisponiveis.itens || [],
              itens_licitacao: itensSemGrupo,
              grupos_licitacao: gruposMapeados
            });
          } else {
            setPedidoItems([]);
            setAvailableItems([]);
            setContratoData(null);
          }
        } catch (error) {
          setPedidoItems([]);
          setAvailableItems([]);
          setContratoData(null);
        }
      }
    } else {
      setAvailableItems([]);
      setPedidoItems([]);
      setContratoData(null);
    }
  };



  const removeItemFromPedido = (index: number) => {
    setPedidoItems(pedidoItems.filter((_, i) => i !== index));
  };

  // 🎯 NOVO: Função para adicionar item ao pedido
  const addItemToPedido = async (itemId: number, quantidade: number) => {
    const itemDisponivel = availableItems.find(avItem => avItem.id === itemId);
    if (!itemDisponivel) return;

    // 🎯 NOVO: Validar se a quantidade não excede o disponível
    if (quantidade > itemDisponivel.quantidade_disponivel) {
      await confirm({
        title: 'Quantidade Inválida',
        message: `Quantidade não pode exceder ${itemDisponivel.quantidade_disponivel} (máximo disponível)`,
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }

    // 🎯 NOVO: Validar se há quantidade disponível
    if (itemDisponivel.quantidade_disponivel <= 0) {
      await confirm({
        title: 'Item Indisponível',
        message: `Item não disponível (quantidade: ${itemDisponivel.quantidade_disponivel})`,
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }

    // 🎯 NOVO: Buscar valores do contrato para este item
    const itemContrato = contratoData?.itens.find((item: any) => item.id === itemId);
    const precoUnitario = itemContrato?.preco_unitario || 0;
    const custoUnitario = itemContrato?.custo_unitario || 0;
    

    // Verificar se o item já existe no pedido
    const itemExistente = pedidoItems.find(pi => pi.item_id === itemId);
    if (itemExistente) {
      // Atualizar quantidade existente
      const newItems = pedidoItems.map(pi => 
        pi.item_id === itemId 
          ? { 
              ...pi, 
              quantidade: (Number(pi.quantidade) || 0) + quantidade,
              preco_total: precoUnitario * ((Number(pi.quantidade) || 0) + quantidade),
              custo_total: custoUnitario * ((Number(pi.quantidade) || 0) + quantidade)
            }
          : pi
      );
      setPedidoItems(newItems);
    } else {
      // Adicionar novo item
      const newItem = {
        item_id: itemId,
        quantidade: quantidade,
        max_quantidade: itemDisponivel.quantidade_disponivel,
        preco_unitario: precoUnitario,
        preco_total: precoUnitario * quantidade,
        custo_unitario: custoUnitario,
        custo_total: custoUnitario * quantidade
      };
      setPedidoItems([...pedidoItems, newItem]);
    }
    
    // 🎯 NOVO: Atualizar quantidades disponíveis
    setAvailableItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantidade_disponivel: item.quantidade_disponivel - quantidade }
          : item
      )
    );
    
    // 🎯 NOVO: Atualizar também o contratoData para manter consistência
    setContratoData((prevData: any) => {
      if (!prevData) return prevData;
      
      return {
        ...prevData,
        itens: prevData.itens.map((item: any) => 
          item.id === itemId 
            ? { ...item, quantidade: item.quantidade - quantidade }
            : item
        )
      };
    });
    
    // 🎯 NOVO: Limpar campo de quantidade após adicionar
    const quantidadeInput = document.getElementById(`qtd-${itemId}`) as HTMLInputElement;
    if (quantidadeInput) {
      quantidadeInput.value = '';
    }
    
    // 🎯 NOVO: Não fechar modal automaticamente - permitir adicionar múltiplos itens
    // setShowAddItemModal(false);
  };

  const handleItemChange = async (itemId: number, field: string, value: any) => {
    // Se for quantidade, validar contra o máximo disponível
    if (field === 'quantidade') {
      if (contratoData && contratoData.contrato_existe) {
        // 🎯 NOVO: Buscar item na lista de itens disponíveis
        const itemDisponivel = availableItems.find(i => i.id === itemId);
        if (itemDisponivel) {
          const maxQuantidade = itemDisponivel.quantidade_disponivel;
          const novaQuantidade = Number(value);
          
          if (novaQuantidade > maxQuantidade) {
            await confirm({
              title: 'Quantidade Inválida',
              message: `Quantidade não pode exceder ${maxQuantidade} (máximo disponível)`,
              type: 'warning',
              confirmText: 'OK'
            });
            return; // Não atualizar se exceder o limite
          }
          
          if (novaQuantidade < 0) {
            await confirm({
              title: 'Quantidade Inválida',
              message: 'Quantidade não pode ser negativa',
              type: 'warning',
              confirmText: 'OK'
            });
            return; // Não atualizar se for negativa
          }
          
          // Se quantidade for 0, marcar item como removido
          if (novaQuantidade === 0) {
            const confirmed = await confirm({
              title: 'Remover Item',
              message: 'Quantidade zero. Deseja remover este item do pedido?',
              type: 'warning'
            });
            if (confirmed) {
              // Marcar item como removido (quantidade 0) em vez de deletar
              const itemIndex = pedidoItems.findIndex(pi => pi.item_id === itemId);
              if (itemIndex !== -1) {
                const newItems = [...pedidoItems];
                newItems[itemIndex] = { ...newItems[itemIndex], quantidade: 0 };
                setPedidoItems(newItems);
              }
              return;
            } else {
              // Manter quantidade anterior
              return;
            }
          }
        }
      }
    }
    
    // Buscar o item no pedidoItems pelo item_id
    const itemIndex = pedidoItems.findIndex(pi => pi.item_id === itemId);
    
    if (itemIndex === -1) {
      // Criar novo item se não existir
      const newItem = {
        item_id: itemId,
        quantidade: field === 'quantidade' ? Number(value) : 0,
        max_quantidade: availableItems.find((i: any) => i.id === itemId)?.quantidade_disponivel || 0,
        custo_unitario: contratoData?.itens.find((i: any) => i.id === itemId)?.custo_unitario || 0,
        preco_unitario: contratoData?.itens.find((i: any) => i.id === itemId)?.preco_unitario || 0,
        custo_total: 0,
        preco_total: 0
      };
      setPedidoItems([...pedidoItems, newItem]);
    } else {
      // Atualizar item existente
      const newItems = [...pedidoItems];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      
      // 🎯 NOVO: Recalcular totais automaticamente
      if (field === 'quantidade') {
        const quantidade = Number(value);
        newItems[itemIndex].custo_total = (newItems[itemIndex].custo_unitario || 0) * quantidade;
        newItems[itemIndex].preco_total = (newItems[itemIndex].preco_unitario || 0) * quantidade;
      } else if (field === 'custo_unitario') {
        const quantidade = Number(newItems[itemIndex].quantidade) || 0;
        newItems[itemIndex].custo_total = Number(value) * quantidade;
      } else if (field === 'preco_unitario') {
        const quantidade = Number(newItems[itemIndex].quantidade) || 0;
        newItems[itemIndex].preco_total = Number(value) * quantidade;
      }
      
      setPedidoItems(newItems);
    }
  };

  const handleView = (pedido: PedidoWithDetails) => {
    setViewingPedido(pedido);
  };

  // 🎯 NOVO: Função para fechar modal com confirmação
  const handleCloseModal = async () => {
    if (editingPedido) {
      const confirmed = await confirm({
        title: 'Sair da Edição',
        message: 'Tem certeza que deseja sair da edição? As alterações não salvas serão perdidas.',
        type: 'warning'
      });
      if (confirmed) {
        setShowModal(false);
        setEditingPedido(null);
        resetForm();
      }
    } else {
      const confirmed = await confirm({
        title: 'Sair da Criação',
        message: 'Tem certeza que deseja sair da criação do pedido? Os dados não salvos serão perdidos.',
        type: 'warning'
      });
      if (confirmed) {
        setShowModal(false);
        setEditingPedido(null);
        resetForm();
      }
    }
  };

  // 🎯 NOVO: Função para fechar modal de visualização
  const handleCloseViewModal = () => {
    setViewingPedido(null);
  };


  const resetForm = () => {
    setFormData({
      licitacao_id: 0,
      data_criacao: '', // Será preenchido automaticamente pelo backend
      empenho_feito: false,
      pedido_orgao_feito: false,
      contrato_feito: false,
      outros_documentos: false,
      entrega_feita: false,
      entrega_confirmada: false,
      data_entrega: '',
      numero_nota_fiscal: '',
      valor_nota_fiscal: 0.0,
      observacoes_entrega: '',
      status_geral: 'PENDENTE',
      status_pagamento: 'PENDENTE',
      pagamento_confirmado: false,
      data_pagamento_previsto: '',
      valor_pago: 0.0,
      data_pagamento: undefined,
      observacoes_pagamento: ''
    });
    
    
    // 🎯 NOVO: Limpar dados do contrato
    setContratoData(null);
    setPedidoItems([]);
    setAvailableItems([]);
    
    // 🎯 CORRIGIDO: Limpar estado de edição
    setEditingPedido(null);
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


  const calcularPrecoTotalContrato = (item: any, quantidade: number) => {
    if (!quantidade) return 0;
    
    // Se for item do contrato
    if (item.preco_unitario_contrato) {
      return item.preco_unitario_contrato * quantidade;
    }
    
    // Se for item da licitação
    if (item.preco_unitario) {
      return item.preco_unitario * quantidade;
    }
    
    return 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
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

      {/* Cards de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pedidos && pedidos.length > 0 ? pedidos.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header do Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <div className="flex justify-between items-start">
                <div className="text-white">
                  <h3 className="font-semibold text-sm truncate">
                    {pedido.licitacao.descricao}
                  </h3>
                  <p className="text-blue-100 text-xs">
                    {pedido.licitacao.numero} - UASG: {pedido.licitacao.uasg}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(pedido.status_geral)}
                </div>
              </div>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-4 space-y-3">
              {/* Informações do Cliente */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900 text-sm mb-2">Cliente</h4>
                <p className="text-gray-700 text-sm">
                  {clientes.find(c => c.id === pedido.licitacao.cliente_id)?.nome || 'N/A'}
                </p>
              </div>

              {/* Status e Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    pedido.status_geral === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' :
                    pedido.status_geral === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-800' :
                    pedido.status_geral === 'CONCLUIDO' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getStatusText(pedido.status_geral)}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Data</div>
                  <div className="text-sm text-gray-900">
                    {formatDate(pedido.created_at)}
                  </div>
                </div>
              </div>

              {/* Indicadores de Progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pedido/Empenho</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = pedido.status_geral;
                      switch (status) {
                        case 'CONCLUIDO':
                          return (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-600">Concluído</span>
                            </>
                          );
                        case 'EM_ANDAMENTO':
                          return (
                            <>
                              <Clock className="h-4 w-4 text-blue-500" />
                              <span className="text-blue-600">Em Andamento</span>
                            </>
                          );
                        case 'CANCELADO':
                          return (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-600">Cancelado</span>
                            </>
                          );
                        case 'PENDENTE':
                        default:
                          return (
                            <>
                              <XCircle className="h-4 w-4 text-yellow-500" />
                              <span className="text-yellow-600">Pendente</span>
                            </>
                          );
                      }
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Contrato</span>
                  <div className="flex items-center gap-2">
                    {pedido.contrato_feito ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={pedido.contrato_feito ? 'text-green-600' : 'text-red-600'}>
                      {pedido.contrato_feito ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Entrega</span>
                  <div className="flex items-center gap-2">
                    {pedido.entrega_feita ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={pedido.entrega_feita ? 'text-green-600' : 'text-red-600'}>
                      {pedido.entrega_feita ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pagamento</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const statusPagamento = pedido.status_pagamento;
                      
                      if (statusPagamento === 'PAGO') {
                        return (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Concluído</span>
                          </>
                        );
                      } else if (statusPagamento === 'PARCIAL') {
                        return (
                          <>
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600">Parcial</span>
                          </>
                        );
                      } else {
                        // PENDENTE ou qualquer outro status
                        return (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">Pendente</span>
                          </>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-center gap-2 pt-3 border-t">
                <button
                  onClick={() => handleView(pedido)}
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                  title="Ver detalhes"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleEdit(pedido)}
                  className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-50 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(pedido.id)}
                  className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-gray-600">Comece adicionando seu primeiro pedido.</p>
          </div>
        )}
      </div>


            {/* Modal de Criação/Edição Avançado */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={(e) => {
            // 🎯 NOVO: Fechar modal ao clicar fora
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 🎯 NOVO: Seleção de Contrato - apenas para criação */}
              {!editingPedido && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-medium text-blue-900 mb-3">Selecionar Contrato Ativo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        Contrato *
                      </label>
                      <select
                        value={contratoData?.contrato?.id || ''}
                        onChange={(e) => {
                          handleContratoChange(Number(e.target.value));
                        }}
                        required
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Selecione um contrato ativo</option>
                        {contratos && contratos.length > 0 ? (
                          contratos.map((contrato) => (
                            <option key={contrato.id} value={contrato.id}>
                              {contrato.numero_contrato} - {contrato.licitacao.numero} - {contrato.licitacao.descricao}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Nenhum contrato ativo disponível</option>
                        )}
                      </select>
                      
                      {/* 🎯 NOVO: Mensagem informativa sobre contratos ativos */}
                      {contratos && contratos.length === 0 && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Apenas contratos com status "ATIVO" são exibidos para criação de pedidos.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {contratoData && contratoData.contrato_existe && (
                      <div className="bg-white p-3 rounded border">
                        <h5 className="font-medium text-blue-800 mb-2">Detalhes do Contrato Ativo</h5>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Número:</span> {contratoData.contrato.numero_contrato}</p>
                          <p><span className="font-medium">Data:</span> {contratoData.contrato.data_contrato}</p>
                          <p><span className="font-medium">Valor:</span> R$ {contratoData.contrato.valor_contrato?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                          <p><span className="font-medium">Tipo Entrega:</span> {contratoData.contrato.tipo_entrega === 'ENTREGA_UNICA' ? 'Entrega Única' : 'Fornecimento Anual'}</p>
                          {contratoData.contrato.prazo_contrato && (
                            <p><span className="font-medium">Prazo:</span> {contratoData.contrato.prazo_contrato} dias</p>
                          )}
                          <p><span className="font-medium">Itens:</span> {contratoData?.itens?.length || 0} itens contratados</p>
                          <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
                            <p className="text-xs text-green-700 font-medium">✅ Contrato ativo - pronto para gerar pedidos</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🎯 NOVO: Informações do Contrato - apenas para edição */}
              {editingPedido && contratoData && contratoData.contrato && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-medium text-blue-900 mb-3">Contrato Vinculado ao Pedido</h4>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Número:</span> {contratoData.contrato.numero_contrato}</p>
                      <p><span className="font-medium">Data:</span> {contratoData.contrato.data_contrato}</p>
                      <p><span className="font-medium">Valor:</span> R$ {contratoData.contrato.valor_contrato?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      <p><span className="font-medium">Tipo Entrega:</span> {contratoData.contrato.tipo_entrega === 'ENTREGA_UNICA' ? 'Entrega Única' : 'Fornecimento Anual'}</p>
                      {contratoData.contrato.prazo_contrato && (
                        <p><span className="font-medium">Prazo:</span> {contratoData.contrato.prazo_contrato} dias</p>
                      )}
                      <p><span className="font-medium">Itens:</span> {contratoData?.itens?.length || 0} itens contratados</p>
                      <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium">📋 Contrato vinculado - informações para referência</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              {/* Data de Criação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Criação
                </label>
                <input
                  type="date"
                  value={formData.data_criacao || ''}
                  onChange={(e) => setFormData({...formData, data_criacao: e.target.value})}
                  disabled={!editingPedido} // Só permite editar se estiver editando um pedido existente
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {!editingPedido && (
                  <p className="text-xs text-gray-500 mt-1">
                    A data de criação será definida automaticamente pelo sistema
                  </p>
                )}
              </div>

              {/* 🎯 NOVO: Seção de Itens do Pedido baseados no Contrato */}
              {((contratoData && contratoData.contrato_existe) || (editingPedido && pedidoItems.length > 0)) && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-green-900">📋 Itens do Pedido</h4>
                    <div className="flex items-center space-x-2">
                      {contratoData && contratoData.contrato_existe && (
                        <>
                          <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                            {contratoData?.itens?.length || 0} itens disponíveis
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // 🎯 NOVO: Abrir modal para adicionar itens
                              setShowAddItemModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            + Adicionar Item
                          </button>
                        </>
                      )}
                      {editingPedido && (!contratoData || !contratoData.contrato_existe) && (
                        <div className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          Modo de edição - itens podem ser editados
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 🎯 NOVO: Área para itens adicionados manualmente */}
                  <div className="mb-4">
                    <h5 className="font-medium text-green-800 mb-2">📦 Itens do Pedido</h5>
                    {pedidoItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Nenhum item adicionado ao pedido ainda.</p>
                        {contratoData && contratoData.contrato_existe && (
                          <p className="text-sm mt-1">Clique em "Adicionar Item" para começar.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pedidoItems.map((item, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="flex flex-wrap items-start gap-8">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">Item:</span>
                                <div className="text-gray-700">
                                  {getItemDescription(item.item_id)}
                                </div>
                              </div>
                              <div className="w-24">
                                <span className="font-medium">Quantidade:</span>
                                <div>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.max_quantidade}
                                    value={item.quantidade}
                                    onChange={(e) => handleItemChange(
                                      item.item_id, 
                                      'quantidade', 
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )}
                                    disabled={false}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder={`Max: ${item.max_quantidade}`}
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    Máx: {item.max_quantidade}
                                  </div>
                                </div>
                              </div>
                              <div className="w-24">
                                <span className="font-medium">Custo Unit.:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.custo_unitario || ''}
                                  onChange={(e) => handleItemChange(item.item_id, 'custo_unitario', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  disabled={false}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  placeholder="0,00"
                                />
                              </div>
                              <div className="w-24">
                                <span className="font-medium">Preço Unit.:</span>
                                <div className="text-gray-700 text-sm">R$ {item.preco_unitario?.toFixed(2) || '0,00'}</div>
                              </div>
                              <div className="w-24">
                                <span className="font-medium">Total:</span>
                                <div className="text-gray-700 text-sm">
                                  R$ {calcularPrecoTotalContrato(
                                    { id: item.item_id, custo_unitario: item.custo_unitario, preco_unitario: item.preco_unitario }, 
                                    Number(item.quantidade) || 0
                                  ).toFixed(2)}
                                </div>
                              </div>
                              <div className="w-16 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => removeItemFromPedido(index)}
                                  disabled={false}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  title="Remover item do pedido"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  

                  

                  
                  {/* Resumo financeiro */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h5 className="font-medium text-blue-800 mb-2">💰 Resumo Financeiro do Pedido</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total de Itens:</span>
                        <div className="text-blue-700">
                          {pedidoItems.filter(item => item.quantidade && Number(item.quantidade) > 0).length}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Quantidade Total:</span>
                        <div className="text-blue-700">
                          {pedidoItems.reduce((total, item) => {
                            return total + (Number(item.quantidade) || 0);
                          }, 0)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Custo Total:</span>
                        <div className="text-blue-700">
                          R$ {pedidoItems.reduce((total, item) => {
                            if (item.quantidade && Number(item.quantidade) > 0) {
                              return total + (item.custo_unitario || 0) * Number(item.quantidade);
                            }
                            return total;
                          }, 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Preço Total:</span>
                        <div className="text-blue-700">
                          R$                           {pedidoItems.reduce((total, item) => {
                            if (item.quantidade && Number(item.quantidade) > 0) {
                              return total + (item.preco_unitario || 0) * Number(item.quantidade);
                            }
                            return total;
                          }, 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seção de Entrega */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-lg font-medium text-green-900 mb-3">Entrega</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Confirmação de Entrega */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entrega Confirmada
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="entrega_confirmada"
                        checked={formData.entrega_confirmada || false}
                        onChange={(e) => setFormData({...formData, entrega_confirmada: e.target.checked})}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="entrega_confirmada" className="text-sm text-gray-700">
                        Entrega realizada
                      </label>
                    </div>
                  </div>

                  {/* Data de Entrega */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Entrega (Estimativa)
                    </label>
                    <input
                      type="date"
                      value={formData.data_entrega || ''}
                      onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Data estimada para entrega (não depende da confirmação)
                    </p>
                  </div>


                </div>

                {/* Observações da Entrega */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações da Entrega
                  </label>
                  <textarea
                    value={formData.observacoes_entrega || ''}
                    onChange={(e) => setFormData({...formData, observacoes_entrega: e.target.value})}
                    rows={2}
                    placeholder="Observações sobre a entrega..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Seção de Pagamento */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="text-lg font-medium text-yellow-900 mb-3">Pagamento</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  {/* Confirmação de Pagamento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pagamento Confirmado
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pagamento_confirmado"
                        checked={formData.pagamento_confirmado || false}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          // 🎯 NOVO: Preencher automaticamente o valor pago quando marcar o checkbox
                          const valorTotalPedido = pedidoItems.reduce((total, item) => {
                            if (item.quantidade && Number(item.quantidade) > 0) {
                              return total + (item.preco_total || 0);
                            }
                            return total;
                          }, 0);
                          
                          setFormData({
                            ...formData, 
                            pagamento_confirmado: isChecked,
                            // 🎯 NOVO: Atualizar status_pagamento baseado no checkbox
                            status_pagamento: isChecked ? 'PAGO' : 'PENDENTE',
                            // 🎯 NOVO: Se marcar como confirmado, preencher valor pago; se desmarcar, limpar
                            valor_pago: isChecked ? (formData.valor_pago || valorTotalPedido) : 0,
                            // 🎯 NOVO: Se marcar como confirmado, preencher data atual; se desmarcar, limpar
                            data_pagamento: isChecked ? (formData.data_pagamento || new Date().toISOString().split('T')[0]) : undefined
                          });
                        }}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pagamento_confirmado" className="text-sm text-gray-700">
                        Pagamento realizado
                      </label>
                    </div>
                  </div>

                  {/* Data de Pagamento Previsto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Prevista de Pagamento
                    </label>
                    <input
                      type="date"
                      value={formData.data_pagamento_previsto || ''}
                      onChange={(e) => setFormData({...formData, data_pagamento_previsto: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  {/* Data de Pagamento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Pagamento
                    </label>
                    <input
                      type="date"
                      value={formData.data_pagamento || ''}
                      onChange={(e) => setFormData({...formData, data_pagamento: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  {/* Valor Pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Pago (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_pago || ''}
                      onChange={(e) => setFormData({...formData, valor_pago: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      placeholder="0,00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  {/* Número da Nota Fiscal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número da Nota Fiscal
                    </label>
                    <input
                      type="text"
                      value={formData.numero_nota_fiscal || ''}
                      onChange={(e) => setFormData({...formData, numero_nota_fiscal: e.target.value})}
                      placeholder="Número da NF"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  {/* Valor da Nota Fiscal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor da Nota Fiscal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_nota_fiscal || ''}
                      onChange={(e) => setFormData({...formData, valor_nota_fiscal: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      placeholder="0,00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                {/* Observações do Pagamento */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações do Pagamento
                  </label>
                  <textarea
                    value={formData.observacoes_pagamento || ''}
                    onChange={(e) => setFormData({...formData, observacoes_pagamento: e.target.value})}
                    rows={2}
                    placeholder="Observações sobre o pagamento..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              {/* Observações Gerais */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações Gerais
                </label>
                <textarea
                  value={formData.observacoes_gerais || ''}
                  onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
                  rows={3}
                  placeholder="Observações gerais sobre o pedido..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.licitacao_id || pedidoItems.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {editingPedido ? 'Atualizar' : 'Criar'} Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {viewingPedido && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={(e) => {
            // 🎯 NOVO: Fechar modal ao clicar fora
            if (e.target === e.currentTarget) {
              handleCloseViewModal();
            }
          }}
        >
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Pedido
                </h3>
                <button
                  onClick={handleCloseViewModal}
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
                      <p className="text-sm text-gray-900">{clientes.find(c => c.id === viewingPedido.licitacao.cliente_id)?.nome || 'N/A'}</p>
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

                {/* Itens do Pedido */}
                <div className="border-b pb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Itens do Pedido</h4>
                  {viewingPedido.itens_pedido && viewingPedido.itens_pedido.length > 0 ? (
                    <div className="space-y-3">
                      {viewingPedido.itens_pedido.map((itemPedido: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <span className="text-sm font-medium text-gray-500">Descrição:</span>
                              <p className="text-sm text-gray-900">
                                {itemPedido.item_licitacao?.descricao || `Item ${itemPedido.item_licitacao_id}`}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Quantidade:</span>
                              <p className="text-sm text-gray-900">{itemPedido.quantidade_solicitada}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Preço Total:</span>
                              <p className="text-sm text-gray-900 font-semibold">
                                {formatCurrency(itemPedido.preco_total || 0)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                              <span className="text-sm font-medium text-gray-500">Preço Unitário:</span>
                              <p className="text-sm text-gray-900">{formatCurrency(itemPedido.preco_unitario || 0)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Custo Unitário:</span>
                              <p className="text-sm text-gray-900">{formatCurrency(itemPedido.custo_unitario || 0)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Resumo Financeiro */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
                        <h5 className="font-medium text-blue-800 mb-2">💰 Resumo Financeiro</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-blue-700">Total de Itens:</span>
                            <div className="text-blue-900 font-semibold">
                              {viewingPedido.itens_pedido.length}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-blue-700">Quantidade Total:</span>
                            <div className="text-blue-900 font-semibold">
                              {viewingPedido.itens_pedido.reduce((total: number, item: any) => 
                                total + (item.quantidade_solicitada || 0), 0
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-blue-700">Valor Total:</span>
                            <div className="text-blue-900 font-semibold text-lg">
                              {formatCurrency(viewingPedido.itens_pedido.reduce((total: number, item: any) => 
                                total + (item.preco_total || 0), 0
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>Nenhum item adicionado ao pedido.</p>
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

      {/* 🎯 NOVO: Modal para adicionar itens */}
      {showAddItemModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // 🎯 NOVO: Fechar modal ao clicar fora
            if (e.target === e.currentTarget) {
              setShowAddItemModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Adicionar Itens ao Pedido</h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Grupos */}
              {contratoData?.grupos_licitacao && contratoData.grupos_licitacao.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">📦 Grupos da Licitação</h4>
                  <div className="space-y-3">
                    {contratoData.grupos_licitacao.map((grupo: any, grupoIndex: any) => (
                      <div key={grupoIndex} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-blue-800">Grupo: {grupo.nome || grupo.id}</h5>
                          <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {grupo.itens.length} itens
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {grupo.itens.map((item: any, itemIndex: any) => (
                            <div key={itemIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                              <div className="flex-1">
                                <div className="font-medium">{item.descricao}</div>
                                <div className="text-sm text-gray-600">
                                  Disponível: {availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0}
                                  placeholder="Qtd"
                                  disabled={(availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0}
                                  className={`w-20 px-2 py-1 border border-gray-300 rounded text-sm ${
                                    (availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0 
                                      ? 'bg-gray-100 cursor-not-allowed' 
                                      : ''
                                  }`}
                                  id={`qtd-${item.id}`}
                                />
                                <button
                                  onClick={() => {
                                    const quantidade = Number((document.getElementById(`qtd-${item.id}`) as HTMLInputElement)?.value);
                                    if (quantidade > 0) {
                                      addItemToPedido(item.id, quantidade);
                                    }
                                  }}
                                  disabled={(availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0}
                                  className={`px-3 py-1 text-white text-sm rounded transition-colors ${
                                    (availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-green-600 hover:bg-green-700'
                                  }`}
                                >
                                  + Adicionar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itens sem grupo */}
              {contratoData?.itens_licitacao && contratoData.itens_licitacao.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">📋 Itens da Licitação (Sem Grupo)</h4>
                  <div className="space-y-2">
                    {contratoData.itens_licitacao.map((item: any, index: any) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex-1">
                          <div className="font-medium">{item.descricao}</div>
                          <div className="text-sm text-gray-600">
                            Disponível: {availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            max={availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0}
                            placeholder="Qtd"
                            disabled={(availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0}
                            className={`w-20 px-2 py-1 border border-gray-300 rounded text-sm ${
                              (availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0 
                                ? 'bg-gray-100 cursor-not-allowed' 
                                : ''
                            }`}
                            id={`qtd-ungrouped-${item.id}`}
                          />
                          <button
                            onClick={() => {
                              const quantidade = Number((document.getElementById(`qtd-ungrouped-${item.id}`) as HTMLInputElement)?.value);
                              if (quantidade > 0) {
                                addItemToPedido(item.id, quantidade);
                              }
                            }}
                            disabled={(availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0}
                            className={`px-3 py-1 text-white text-sm rounded transition-colors ${
                              (availableItems.find(avItem => avItem.id === item.id)?.quantidade_disponivel || 0) <= 0
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
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

export default Pedidos;
