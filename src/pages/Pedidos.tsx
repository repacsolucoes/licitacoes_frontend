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
import { pedidoService, licitacaoService, clienteService, contratoService } from '../services/api';
import { Pedido, PedidoCreate, PedidoUpdate, Licitacao, LicitacaoComItens, Cliente, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

interface PedidoWithDetails extends Pedido {
  licitacao: Licitacao;
  user_criador: User;
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

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<number | ''>('');

  // Formulário
  const [formData, setFormData] = useState<PedidoCreate>({
    licitacao_id: 0,
    data_criacao: new Date().toISOString().split('T')[0],
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

  // Estado para controlar menus desplegáveis
  const [expandedSections, setExpandedSections] = useState({
    empenho: false,
    pedido_orgao: false,
    contrato: false,
    outros_documentos: false,
    entrega: false,
    pagamento: false
  });

  // Estado para o novo modal avançado
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [pedidoItems, setPedidoItems] = useState<Array<{
    item_id: number;
    quantidade: number | string;
    max_quantidade: number;
    preco_unitario?: number;
    preco_total?: number;
    custo_unitario?: number;
    custo_total?: number;
  }>>([]);
  const [availableItems, setAvailableItems] = useState<Array<{
    id: number;
    descricao: string;
    quantidade_disponivel: number;
  }>>([]);
  
  // 🎯 NOVO: Estado para dados do contrato
  const [contratoData, setContratoData] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, [filtroStatus, filtroCliente]);

  // Listener para tecla Esc para fechar modais
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showModal) {
          setShowModal(false);
          setEditingPedido(null);
          resetForm();
        }
        if (viewingPedido) {
          setViewingPedido(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showModal, viewingPedido]);





  const carregarDados = async () => {
    try {
      setLoading(true);
      

      
      // Carregar pedidos
      try {
        const pedidosData = await pedidoService.list();
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

      // 🎯 NOVO: Carregar contratos (para criar novos pedidos)
      
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
        console.log('🔍 Buscando contratos ativos...');
        const contratosData = await contratoService.listarContratos();
        console.log('📋 Contratos recebidos:', contratosData);
        setContratos(contratosData);
      } catch (error: any) {
        console.error('❌ Erro ao buscar contratos:', error);
        setContratos([]);
      }

      // Carregar clientes (sempre necessário para exibir informações)
      try {
        const clientesData = await clienteService.list();
        setClientes(clientesData);
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
    
    console.log('🔄 handleSubmit chamado');
    console.log('📝 FormData:', formData);
    console.log('📦 PedidoItems:', pedidoItems);
    
    try {
      // 🎯 NOVO: Preparar dados completos incluindo itens
      const dadosCompletos = {
        ...formData,
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
      
      console.log('📊 Dados completos para salvar:', dadosCompletos);
      
      if (editingPedido) {
        console.log('🔄 Atualizando pedido existente ID:', editingPedido.id);
        await pedidoService.update(editingPedido.id, dadosCompletos as PedidoUpdate);
        console.log('✅ Pedido atualizado com sucesso');
      } else {
        console.log('🆕 Criando novo pedido');
        await pedidoService.create(dadosCompletos);
        console.log('✅ Pedido criado com sucesso');
      }
      
      setShowModal(false);
      setEditingPedido(null);
      
      // 🎯 NOVO: Não resetar o formulário imediatamente para preservar edições
      // resetForm();
      
      // Recarregar apenas a lista de pedidos, não os dados do formulário
      carregarDados();
      
      // 🎯 NOVO: Mostrar mensagem de sucesso
      alert('✅ Pedido atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar pedido:', error);
      alert(`❌ Erro ao salvar pedido: ${error}`);
    }
  };

  const handleEdit = async (pedido: PedidoWithDetails) => {
    console.log('🔄 Editando pedido:', pedido);
    setEditingPedido(pedido);
    
    // Carregar dados da licitação
    try {
      console.log('📋 Buscando licitação ID:', pedido.licitacao_id);
      const licitacaoComItens = await licitacaoService.get(pedido.licitacao_id);
      console.log('✅ Licitação carregada:', licitacaoComItens);
      setSelectedLicitacao(licitacaoComItens);
      
      // 🎯 NOVO: Buscar dados do contrato para esta licitação
      try {
        console.log('🔍 Buscando dados do contrato para licitação:', pedido.licitacao_id);
        const contratoData = await contratoService.buscarContratoLicitacao(pedido.licitacao_id);
        console.log('📊 Dados do contrato recebidos:', contratoData);
        
              if (contratoData.contrato_existe) {
        console.log('✅ Contrato existe, processando itens...');
        setContratoData(contratoData);
        
        // 🎯 NOVO: Preservar quantidades editadas se existirem
        const itensExistentes = pedidoItems.length > 0 ? pedidoItems : [];
        console.log('🔄 Itens existentes no pedido:', itensExistentes);
        
        // Preencher itens do pedido baseados no contrato, mas preservar quantidades editadas
        const itensContrato = contratoData.itens.map((item: any) => {
          // Buscar se já existe um item editado para este item_id
          const itemExistente = itensExistentes.find(ie => ie.item_id === item.id);
          
          return {
            item_id: item.id,
            quantidade: itemExistente ? itemExistente.quantidade : (item.quantidade || 0),
            max_quantidade: item.quantidade || 0,
            preco_unitario: item.preco_unitario || 0,
            preco_total: itemExistente ? 
              (Number(itemExistente.quantidade) * (item.preco_unitario || 0)) : 
              (item.preco_total || 0),
            custo_unitario: item.custo_unitario || 0,
            custo_total: itemExistente ? 
              (Number(itemExistente.quantidade) * (item.custo_unitario || 0)) : 
              (item.custo_total || 0)
          };
        });
        
        console.log('🔄 Itens processados para o pedido (preservando edições):', itensContrato);
        setPedidoItems(itensContrato);
          
          // Atualizar itens disponíveis baseados no contrato
          setAvailableItems(contratoData.itens.map((item: any) => ({
            id: item.id,
            descricao: item.descricao || `Item ${item.id}`,
            quantidade_disponivel: item.quantidade || 0
          })));
          
          console.log('✅ Itens do contrato carregados para edição');
        } else {
          console.log('⚠️ Contrato não existe para esta licitação');
          // Carregar itens disponíveis da licitação como fallback
          const items = await licitacaoService.listItens(pedido.licitacao_id);
          console.log('📦 Itens da licitação (fallback):', items);
          setAvailableItems(items.map(item => ({
            id: item.id,
            descricao: item.descricao,
            quantidade_disponivel: item.quantidade
          })));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados do contrato:', error);
        // Fallback para itens da licitação
        const items = await licitacaoService.listItens(pedido.licitacao_id);
        setAvailableItems(items.map(item => ({
          id: item.id,
          descricao: item.descricao,
          quantidade_disponivel: item.quantidade
        })));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados da licitação:', error);
    }
    
    // 🎯 NOVO: Carregar itens do pedido existente (se existirem)
    // TODO: Implementar busca dos itens do pedido quando tivermos essa API
    
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
      observacoes_entrega: pedido.entrega_observacoes || '',
      status_geral: pedido.status_geral,
      status_pagamento: pedido.status_pagamento,
      data_pagamento_previsto: '',
      valor_pago: pedido.valor_pago,
      data_pagamento: pedido.data_pagamento,
      observacoes_pagamento: pedido.observacoes_pagamento,
      observacoes_gerais: pedido.observacoes_gerais
    };
    
    console.log('📝 FormData a ser definido:', formDataToSet);
    setFormData(formDataToSet);
    
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

  // 🎯 NOVO: Funções para o modal baseado em contratos
  const handleContratoChange = async (contratoId: number) => {
    console.log('🔄 handleContratoChange chamado com ID:', contratoId);
    
    if (contratoId) {
      const contrato = contratos.find(c => c.id === contratoId);
      console.log('📋 Contrato encontrado:', contrato);
      
      if (contrato) {
        // Preencher dados da licitação baseados no contrato
        setFormData(prev => ({
          ...prev,
          licitacao_id: contrato.licitacao.id
        }));
        
        // Definir licitação selecionada baseada no contrato
        setSelectedLicitacao(contrato.licitacao);
        
        // 🎯 Buscar dados completos do contrato
        try {
          console.log('🔍 Buscando dados completos do contrato para licitação:', contrato.licitacao.id);
          // Passar ID do pedido sendo editado para não contar no estoque
          const pedidoId = editingPedido?.id || null;
          const contratoData = await contratoService.buscarContratoLicitacao(contrato.licitacao.id, pedidoId);
          console.log('📊 Dados completos do contrato recebidos:', contratoData);
          
          setContratoData(contratoData);
          
          if (contratoData.contrato_existe) {
            console.log('✅ Contrato existe, processando itens...');
            console.log('📦 Itens do contrato:', contratoData.itens);
            console.log('📋 Itens da licitação:', contratoData.itens_licitacao);
            console.log('📦 Grupos da licitação:', contratoData.grupos_licitacao);
            
            // 🎯 CORRIGIDO: Usar itens_licitacao para itens sem grupo
            if (contratoData.itens_licitacao && contratoData.itens_licitacao.length > 0) {
              console.log('✅ Itens da licitação encontrados, processando...');
              
              // Preencher itens do pedido baseados nos itens da licitação
              const itensContrato = contratoData.itens_licitacao.map((item: any) => ({
                item_id: item.id,
                quantidade: item.quantidade || 0,
                max_quantidade: item.quantidade_original || item.quantidade || 0,
                preco_unitario: item.preco_unitario || 0,
                preco_total: item.preco_total || 0,
                custo_unitario: item.custo_unitario || 0,
                custo_total: item.custo_total || 0
              }));
              
              console.log('🔄 Itens processados para o pedido:', itensContrato);
              setPedidoItems(itensContrato);
              
              // Atualizar itens disponíveis baseados nos itens da licitação
              setAvailableItems(contratoData.itens_licitacao.map((item: any) => ({
                id: item.id,
                descricao: item.descricao || `Item ${item.id}`,
                quantidade_disponivel: item.quantidade || 0
              })));
              
              console.log('✅ Itens da licitação carregados:', itensContrato);
            } else {
              console.log('⚠️ Nenhum item da licitação encontrado');
              setPedidoItems([]);
              setAvailableItems([]);
            }
          } else {
            console.log('⚠️ Contrato não existe ou não foi encontrado');
          }
        } catch (error) {
          console.error('❌ Erro ao buscar dados do contrato:', error);
          setPedidoItems([]);
          setAvailableItems([]);
        }
      }
    } else {
      console.log('🔄 Limpando dados do contrato');
      setSelectedLicitacao(null);
      setAvailableItems([]);
      setPedidoItems([]);
      setContratoData(null);
    }
  };

  const addItemToPedido = () => {
    setPedidoItems([...pedidoItems, {
      item_id: 0,
      quantidade: '',
      max_quantidade: 0,
      preco_unitario: 0,
      preco_total: 0,
      custo_unitario: 0,
      custo_total: 0
    }]);
  };

  const removeItemFromPedido = (index: number) => {
    setPedidoItems(pedidoItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (itemId: number, field: string, value: any) => {
    console.log(`🔍 DEBUG: handleItemChange chamado - itemId: ${itemId}, field: ${field}, value: ${value}`);
    console.log(`🔍 DEBUG: pedidoItems atual:`, pedidoItems);
    
    // Se for quantidade, validar contra o máximo do contrato
    if (field === 'quantidade') {
      if (contratoData && contratoData.contrato_existe) {
        const itemContrato = contratoData.itens.find(i => i.id === itemId);
        if (itemContrato) {
          const maxQuantidade = itemContrato.quantidade;
          const novaQuantidade = Number(value);
          
          console.log(`🔍 DEBUG: Validando quantidade - Max: ${maxQuantidade}, Nova: ${novaQuantidade}`);
          
          if (novaQuantidade > maxQuantidade) {
            console.log(`⚠️ Quantidade ${novaQuantidade} excede o máximo da licitação ${maxQuantidade}`);
            alert(`⚠️ Quantidade não pode exceder ${maxQuantidade} (máximo do contrato)`);
            return; // Não atualizar se exceder o limite
          }
          
          if (novaQuantidade < 0) {
            console.log(`⚠️ Quantidade ${novaQuantidade} não pode ser negativa`);
            alert(`⚠️ Quantidade não pode ser negativa`);
            return; // Não atualizar se for negativa
          }
          
          // Se quantidade for 0, marcar item como removido
          if (novaQuantidade === 0) {
            if (confirm('Quantidade zero. Deseja remover este item do pedido?')) {
              // Marcar item como removido (quantidade 0) em vez de deletar
              const itemIndex = pedidoItems.findIndex(pi => pi.item_id === itemId);
              if (itemIndex !== -1) {
                const newItems = [...pedidoItems];
                newItems[itemIndex] = { ...newItems[itemIndex], quantidade: 0 };
                setPedidoItems(newItems);
                console.log('🗑️ Item marcado como removido (quantidade 0)');
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
      console.log(`⚠️ Item não encontrado no pedidoItems, criando novo item`);
      // Criar novo item se não existir
      const newItem = {
        item_id: itemId,
        quantidade: field === 'quantidade' ? Number(value) : 0,
        max_quantidade: contratoData?.itens.find(i => i.id === itemId)?.quantidade || 0,
        custo_unitario: contratoData?.itens.find(i => i.id === itemId)?.custo_unitario || 0,
        preco_unitario: contratoData?.itens.find(i => i.id === itemId)?.preco_unitario || 0,
        custo_total: 0,
        preco_total: 0
      };
      setPedidoItems([...pedidoItems, newItem]);
      console.log('✅ Novo item criado:', newItem);
    } else {
      console.log(`✅ Item encontrado no índice ${itemIndex}, atualizando`);
      // Atualizar item existente
      const newItems = [...pedidoItems];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      
      // 🎯 NOVO: Recalcular totais automaticamente
      if (field === 'quantidade') {
        const quantidade = Number(value);
        newItems[itemIndex].custo_total = (newItems[itemIndex].custo_unitario || 0) * quantidade;
        newItems[itemIndex].preco_total = (newItems[itemIndex].preco_unitario || 0) * quantidade;
        console.log(`🔢 Totais recalculados - Custo: ${newItems[itemIndex].custo_total}, Preço: ${newItems[itemIndex].preco_total}`);
      }
      
      setPedidoItems(newItems);
      console.log('🔄 Item atualizado:', newItems[itemIndex]);
      console.log(`🔍 DEBUG: pedidoItems após atualização:`, newItems);
    }
  };

  const handleView = (pedido: PedidoWithDetails) => {
    setViewingPedido(pedido);
  };

  // Funções para calcular custo e preço total dos itens
  const calcularCustoTotal = (item: any) => {
    if (!item.item_id || typeof item.quantidade !== 'number' || !selectedLicitacao) return 0;
    
    // Calcular custo unitário baseado no custo total da licitação e quantidade total dos itens
    const custoTotalLicitacao = selectedLicitacao.custo || 0;
    const quantidadeTotalLicitacao = availableItems.reduce((total, avItem) => total + avItem.quantidade_disponivel, 0);
    
    if (quantidadeTotalLicitacao === 0) return 0;
    
    const custoUnitario = custoTotalLicitacao / quantidadeTotalLicitacao;
    return custoUnitario * item.quantidade;
  };

  const calcularPrecoTotal = (item: any) => {
    if (!item.item_id || typeof item.quantidade !== 'number' || !selectedLicitacao) return 0;
    
    // Calcular preço unitário baseado no preço final da licitação e quantidade total dos itens
    const precoFinalLicitacao = selectedLicitacao.preco_final || 0;
    const quantidadeTotalLicitacao = availableItems.reduce((total, avItem) => total + avItem.quantidade_disponivel, 0);
    
    if (quantidadeTotalLicitacao === 0) return 0;
    
    const precoUnitario = precoFinalLicitacao / quantidadeTotalLicitacao;
    return precoUnitario * item.quantidade;
  };

  const resetForm = () => {
    setFormData({
      licitacao_id: 0,
      data_criacao: new Date().toISOString().split('T')[0],
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
    
    // Resetar menus desplegáveis
    setExpandedSections({
      empenho: false,
      pedido_orgao: false,
      contrato: false,
      outros_documentos: false,
      entrega: false,
      pagamento: false
    });
    
    // 🎯 NOVO: Limpar dados do contrato
    setSelectedLicitacao(null);
    setContratoData(null);
    setPedidoItems([]);
    setAvailableItems([]);
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

  // 🎯 NOVO: Função para preencher o valor pago com o valor do contrato
  const preencherValorPago = () => {
    if (contratoData && contratoData.contrato_existe) {
      // Usar o valor do contrato
      const novoValor = Number(contratoData.contrato.valor_contrato) || 0;
      setFormData(prev => ({
        ...prev,
        valor_pago: novoValor
      }));
    } else if (formData.licitacao_id) {
      // Fallback para licitação se não tiver contrato
      if (editingPedido) {
        const novoValor = Number(editingPedido.licitacao.preco_final) || 0;
        setFormData(prev => ({
          ...prev,
          valor_pago: novoValor
        }));
      }
    }
  };

  // 🎯 NOVO: Funções para calcular custo e preço total dos itens (contrato ou licitação)
  const calcularCustoTotalContrato = (item: any, quantidade: number) => {
    if (!quantidade) return 0;
    
    // Se for item do contrato
    if (item.custo_unitario_contrato) {
      return item.custo_unitario_contrato * quantidade;
    }
    
    // Se for item da licitação
    if (item.custo_unitario) {
      return item.custo_unitario * quantidade;
    }
    
    return 0;
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

      {/* Cards de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pedidos.map((pedido) => (
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
                  <span className="text-gray-600">Empenho</span>
                  <div className="flex items-center gap-2">
                    {pedido.empenho_feito ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={pedido.empenho_feito ? 'text-green-600' : 'text-red-600'}>
                      {pedido.empenho_feito ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Pedido</span>
                  <div className="flex items-center gap-2">
                    {pedido.pedido_orgao_feito ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={pedido.pedido_orgao_feito ? 'text-green-600' : 'text-red-600'}>
                      {pedido.pedido_orgao_feito ? 'Concluído' : 'Pendente'}
                    </span>
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
        ))}
      </div>

            {/* Modal de Criação/Edição Avançado */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 🎯 NOVO: Seleção de Contrato */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-lg font-medium text-blue-900 mb-3">Selecionar Contrato Ativo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Contrato *
                    </label>
                    <select
                      value={contratoData?.contrato?.id || ''}
                      onChange={(e) => handleContratoChange(Number(e.target.value))}
                      required
                      disabled={!!editingPedido}
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
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-700">
                          ℹ️ Apenas contratos com status "ATIVO" são exibidos para criação de pedidos.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              const debug = await contratoService.debugContratos();
                              console.log('🔍 DEBUG Contratos:', debug);
                              alert(`Debug: ${JSON.stringify(debug, null, 2)}`);
                            } catch (error) {
                              console.error('Erro no debug:', error);
                            }
                          }}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          🔍 Debug Contratos
                        </button>
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
                        <p><span className="font-medium">Itens:</span> {contratoData.itens.length} itens contratados</p>
                        <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
                          <p className="text-xs text-green-700 font-medium">✅ Contrato ativo - pronto para gerar pedidos</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const debug = await contratoService.debugItensContrato(contratoData.contrato.id);
                              console.log('🔍 DEBUG Itens do Contrato:', debug);
                              alert(`Debug Itens: ${JSON.stringify(debug, null, 2)}`);
                            } catch (error) {
                              console.error('Erro no debug de itens:', error);
                            }
                          }}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          🔍 Debug Itens
                        </button>
                      </div>
                    </div>
                  )}
                  

                </div>
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

              {/* Data de Criação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Criação
                </label>
                <input
                  type="date"
                  value={formData.data_criacao || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, data_criacao: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 🎯 NOVO: Seção de Itens do Pedido baseados no Contrato */}
              {contratoData && contratoData.contrato_existe && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-green-900">📋 Itens para o Pedido</h4>
                    <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                      {contratoData.itens.length} itens disponíveis
                    </div>
                  </div>
                  
                  {/* 🎯 NOVO: Mostrar grupos da licitação */}
                  {contratoData.grupos_licitacao && contratoData.grupos_licitacao.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-green-800 mb-2">📦 Grupos da Licitação</h5>
                      <div className="space-y-3">
                        {contratoData.grupos_licitacao.map((grupo, grupoIndex) => (
                          <div key={grupoIndex} className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="flex justify-between items-center mb-2">
                              <h6 className="font-medium text-blue-800">
                                {grupo.posicao}º Grupo: {grupo.nome}
                              </h6>
                              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                {grupo.itens.length} itens
                              </span>
                            </div>
                            
                            {/* Itens do grupo */}
                            {grupo.itens
                              .filter(item => {
                                // 🎯 CORRIGIDO: Mostrar todos os itens, mesmo com quantidade 0
                                // Só filtrar se o usuário explicitamente removeu (quantidade === 0 E existe no pedidoItems)
                                const pedidoItem = pedidoItems.find(pi => pi.item_id === item.id);
                                if (pedidoItem && pedidoItem.quantidade === 0) {
                                  console.log(`🔍 Item ${item.descricao} foi removido pelo usuário`);
                                  return false; // Não mostrar itens explicitamente removidos
                                }
                                return true; // Mostrar todos os outros itens
                              })
                              .map((item, itemIndex) => (
                              <div key={itemIndex} className="bg-white p-2 rounded border ml-4 mb-2">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">Item:</span>
                                    <div className="text-gray-700">{item.descricao}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Quantidade:</span>
                                                                        <div>
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.quantidade}
                                        value={pedidoItems.find(pi => pi.item_id === item.id)?.quantidade || item.quantidade}
                                        onChange={(e) => handleItemChange(
                                          item.id, 
                                          'quantidade', 
                                          e.target.value === '' ? '' : Number(e.target.value)
                                        )}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder={`Max: ${item.quantidade}`}
                                      />
                                      <div className="text-xs text-gray-500 mt-1">
                                        Máx: {item.quantidade} | Disponível: {item.quantidade} | Digite 0 para remover
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Custo Unit.:</span>
                                    <div className="text-gray-700">R$ {item.custo_unitario?.toFixed(2) || '0,00'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Preço Unit.:</span>
                                    <div className="text-gray-700">R$ {item.preco_unitario?.toFixed(2) || '0,00'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Total:</span>
                                    <div className="text-gray-700">
                                      R$ {calcularPrecoTotalContrato(item, pedidoItems.find(pi => pi.item_id === item.id)?.quantidade || item.quantidade).toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="flex justify-center items-center">
                                    <button
                                      type="button"
                                                                        onClick={() => {
                                    if (confirm('Tem certeza que deseja remover este item do pedido?')) {
                                      // Marcar item como removido (quantidade 0) em vez de deletar
                                      const itemIndex = pedidoItems.findIndex(pi => pi.item_id === item.id);
                                      if (itemIndex !== -1) {
                                        const newItems = [...pedidoItems];
                                        newItems[itemIndex] = { ...newItems[itemIndex], quantidade: 0 };
                                        setPedidoItems(newItems);
                                        console.log('🗑️ Item marcado como removido (quantidade 0):', item.descricao);
                                      } else {
                                        // Se não existir no pedido, criar com quantidade 0
                                        const newItem = {
                                          item_id: item.id,
                                          quantidade: 0,
                                          max_quantidade: item.quantidade,
                                          custo_unitario: item.custo_unitario || 0,
                                          preco_unitario: item.preco_unitario || 0,
                                          custo_total: 0,
                                          preco_total: 0
                                        };
                                        setPedidoItems([...pedidoItems, newItem]);
                                        console.log('🗑️ Item criado e marcado como removido:', item.descricao);
                                      }
                                    }
                                  }}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                      title="Remover item do pedido"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 🎯 NOVO: Mostrar itens sem grupo */}
                  {contratoData.itens_licitacao && contratoData.itens_licitacao.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-green-800 mb-2">📋 Itens da Licitação (Sem Grupo)</h5>
                      <div className="space-y-2">
                        {contratoData.itens_licitacao
                          .filter(item => {
                            // 🎯 CORRIGIDO: Mostrar todos os itens, mesmo com quantidade 0
                            // Só filtrar se o usuário explicitamente removeu (quantidade === 0 E existe no pedidoItems)
                            const pedidoItem = pedidoItems.find(pi => pi.item_id === item.id);
                            if (pedidoItem && pedidoItem.quantidade === 0) {
                              console.log(`🔍 Item ${item.descricao} foi removido pelo usuário`);
                              return false; // Não mostrar itens explicitamente removidos
                            }
                            return true; // Mostrar todos os outros itens
                          })
                          .map((item, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                              <div>
                                <span className="font-medium">Item:</span>
                                <div className="text-gray-700">{item.descricao}</div>
                              </div>
                              <div>
                                <span className="font-medium">Quantidade:</span>
                                <div>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.quantidade}
                                    value={pedidoItems.find(pi => pi.item_id === item.id)?.quantidade || item.quantidade}
                                    onChange={(e) => handleItemChange(
                                      item.id, 
                                      'quantidade', 
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder={`Max: ${item.quantidade}`}
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    Máx: {item.quantidade} | Disponível: {item.quantidade} | Digite 0 para remover
                                  </div>
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Custo Unit.:</span>
                                <div className="text-gray-700">R$ {item.custo_unitario?.toFixed(2) || '0,00'}</div>
                              </div>
                              <div>
                                <span className="font-medium">Preço Unit.:</span>
                                <div className="text-gray-700">R$ {item.preco_unitario?.toFixed(2) || '0,00'}</div>
                              </div>
                              <div>
                                <span className="font-medium">Total:</span>
                                <div className="text-gray-700">
                                  R$ {calcularPrecoTotalContrato(item, pedidoItems.find(pi => pi.item_id === item.id)?.quantidade || item.quantidade).toFixed(2)}
                                </div>
                              </div>
                              <div className="flex justify-center items-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Tem certeza que deseja remover este item do pedido?')) {
                                      // Marcar item como removido (quantidade 0) em vez de deletar
                                      const itemIndex = pedidoItems.findIndex(pi => pi.item_id === item.id);
                                      if (itemIndex !== -1) {
                                        const newItems = [...pedidoItems];
                                        newItems[itemIndex] = { ...newItems[itemIndex], quantidade: 0 };
                                        setPedidoItems(newItems);
                                        console.log('🗑️ Item marcado como removido (quantidade 0):', item.descricao);
                                      } else {
                                        // Se não existir no pedido, criar com quantidade 0
                                        const newItem = {
                                          item_id: item.id,
                                          quantidade: 0,
                                          max_quantidade: item.quantidade,
                                          custo_unitario: item.custo_unitario || 0,
                                          preco_unitario: item.preco_unitario || 0,
                                          custo_total: 0,
                                          preco_total: 0
                                        };
                                        setPedidoItems([...pedidoItems, newItem]);
                                        console.log('🗑️ Item criado e marcado como removido:', item.descricao);
                                      }
                                    }
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                  title="Remover item do pedido"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mensagem se não houver itens */}
                  {(!contratoData.grupos_licitacao || contratoData.grupos_licitacao.length === 0) && 
                   (!contratoData.itens_licitacao || contratoData.itens_licitacao.length === 0) && (
                    <p className="text-gray-500 text-sm">Nenhum item encontrado na licitação.</p>
                  )}
                  
                  {/* Resumo financeiro */}
                  {contratoData.itens.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 className="font-medium text-blue-800 mb-2">💰 Resumo Financeiro do Pedido</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total de Itens:</span>
                          <div className="text-blue-700">{contratoData.itens.length}</div>
                        </div>
                        <div>
                          <span className="font-medium">Quantidade Total:</span>
                          <div className="text-blue-700">
                            {contratoData.itens.reduce((total, item) => {
                              const pedidoItem = pedidoItems.find(pi => pi.item_id === item.id);
                              return total + (pedidoItem?.quantidade || item.quantidade || 0);
                            }, 0)}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Custo Total:</span>
                          <div className="text-blue-700">
                            R$ {contratoData.itens.reduce((total, item) => {
                              const pedidoItem = pedidoItems.find(pi => pi.item_id === item.id);
                              return total + calcularCustoTotalContrato(item, pedidoItem?.quantidade || item.quantidade || 0);
                            }, 0).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Preço Total:</span>
                          <div className="text-blue-700">
                            R$ {contratoData.itens.reduce((total, item) => {
                              const pedidoItem = pedidoItems.find(pi => pi.item_id === item.id);
                              return total + calcularPrecoTotalContrato(item, pedidoItem?.quantidade || item.quantidade || 0);
                            }, 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                      Data de Entrega
                    </label>
                    <input
                      type="date"
                      value={formData.data_entrega || ''}
                      onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
                      disabled={!formData.entrega_confirmada}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
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
                        onChange={(e) => setFormData({...formData, pagamento_confirmado: e.target.checked})}
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
                      disabled={!formData.pagamento_confirmado}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      disabled={!formData.pagamento_confirmado}
                      placeholder="0,00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      disabled={!formData.pagamento_confirmado}
                      placeholder="Número da NF"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      disabled={!formData.pagamento_confirmado}
                      placeholder="0,00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  onClick={() => setShowModal(false)}
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
