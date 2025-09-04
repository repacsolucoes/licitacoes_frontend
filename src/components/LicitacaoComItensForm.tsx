import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { licitacaoService, clienteService } from '../services/api';
import { LicitacaoComItensCreate, LicitacaoComItens, Licitacao, ItemLicitacao, Cliente } from '../types';
import { X, Plus, Save, Calculator, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import ItemForm from './ItemForm';
import ItemsTable from './ItemsTable';
import ItemDetailModal from './ItemDetailModal';
import GrupoForm from './GrupoForm';
import GruposTable from './GruposTable';

interface LicitacaoComItensFormProps {
  onClose: () => void; // 🎯 Para botão Cancelar (sem alerta)
  onCloseWithConfirm: () => void; // 🎯 NOVO: Para botão X e click outside (com alerta)
  onSuccess: () => void;
  editingLicitacao?: Licitacao | null;
}

interface Grupo {
  id: number;
  nome: string;
  itens: ItemLicitacao[];
}

const LicitacaoComItensForm: React.FC<LicitacaoComItensFormProps> = ({ onClose, onCloseWithConfirm, onSuccess, editingLicitacao }) => {
  const [formData, setFormData] = useState({
    descricao: '',
    uasg: '',
    tipo_licitacao: 'Dispensa Eletrônica',
    numero: '',
    tipo_classificacao: 'ITEM' as 'ITEM' | 'GRUPO', // ITEM ou GRUPO
    posicao: '',
    data_licitacao: '',
    custo: 0,
    preco_inicial: 0,
    preco_final: 0,
    margem_percentual: 0,
    imposto: 0,
    imposto_nota: 0,
    margem_dinheiro: 0,
    portal: 'COMPRAS NET',
    status: 'AGUARDANDO',
    observacoes: '',
    cliente_id: 0,
    // Campos do órgão
    nome_orgao: '',
    cnpj_cpf_orgao: '',
    cnpj_cpf_uasg: '',
    sigla_uf: '',
    codigo_municipio: '',
    nome_municipio_ibge: ''
  });

  // Dados da API pública de UASG
  const [orgaoData, setOrgaoData] = useState<{
    nomeUasg: string;
    cnpj_cpf_orgao: string;
    sigla_uf: string;
    codigo_municipio: number;
    nome_municipio_ibge: string;
    cnpj_cpf_uasg: string;
  } | null>(null);



  const [items, setItems] = useState<ItemLicitacao[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemLicitacao | null>(null);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  
  // Monitorar mudanças de estado
  useEffect(() => {
    // Estado mudou - showItemForm
  }, [showItemForm]);
  
  useEffect(() => {
    // Estado mudou - editingItem
  }, [editingItem]);
  const [viewingItem, setViewingItem] = useState<ItemLicitacao | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Buscar clientes disponíveis
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list()
  );

  // Função para buscar dados do órgão pela API pública
  const buscarDadosOrgao = async (uasg: string) => {
    if (!uasg || uasg.length < 3) {
      alert('Digite um UASG válido (mínimo 3 caracteres)');
      return;
    }

          try {
        const loadingToast = toast.loading('Buscando dados do órgão...');
        
        const response = await licitacaoService.buscarDadosOrgao(uasg);
        
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        if (response && response.success && response.data) {
          const dados = response.data;
          
          // Preencher os campos do formulário
          const novosDados = {
            ...formData,
            nome_orgao: dados.nome_orgao || '',
            cnpj_cpf_orgao: dados.cnpj_cpf_orgao || '',
            cnpj_cpf_uasg: dados.cnpj_cpf_uasg || '',
            sigla_uf: dados.sigla_uf || '',
            codigo_municipio: dados.codigo_municipio || '',
            nome_municipio_ibge: dados.nome_municipio_ibge || ''
          };
          
          // Auto-preenchimento da descrição se estiver vazia
          if (!novosDados.descricao && dados.nome_orgao) {
            novosDados.descricao = dados.nome_orgao;
          }
          
          // Atualizar o formData com todos os dados
          setFormData(novosDados);
          
          // Debug: verificar se os dados foram atualizados
    
          
          // NÃO salvar automaticamente no banco - apenas atualizar o formData
          // Os dados serão salvos quando o usuário clicar em "Salvar Alterações"
    
          toast.success('Dados do órgão carregados no formulário!');
        } else {
          toast.error('Nenhum órgão encontrado para este UASG');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do órgão:', error);
        toast.error('Erro ao buscar dados do órgão. Verifique o console para mais detalhes.');
      }
  };

  // Carregar dados existentes quando estiver editando OU limpar quando for nova licitação
  useEffect(() => {

    
    // Se não estiver editando, limpar o formulário
    if (!editingLicitacao || !editingLicitacao.id) {

      // Limpar formulário para nova licitação
              setFormData({
          descricao: '',
          uasg: '',
          tipo_licitacao: 'Dispensa Eletrônica',
          numero: '',
          tipo_classificacao: 'ITEM',
          posicao: '',
          data_licitacao: '',
          custo: 0,
          preco_inicial: 0,
          preco_final: 0,
          margem_percentual: 0,
          imposto: 0,
          imposto_nota: 0,
          margem_dinheiro: 0,
          portal: 'COMPRAS NET',
          status: 'AGUARDANDO',
          observacoes: '',
          cliente_id: 0,
          // Campos do órgão
          nome_orgao: '',
          cnpj_cpf_orgao: '',
          cnpj_cpf_uasg: '',
          sigla_uf: '',
          codigo_municipio: '',
          nome_municipio_ibge: ''
        });
      
      // Limpar itens e grupos
      setItems([]);
      setGrupos([]);
      
      // Limpar dados do órgão
      setOrgaoData(null);
      
      // Limpar estados de edição
      setEditingItem(null);
      setEditingGrupo(null);
      setViewingItem(null);
      
      // Limpar erros
      setErrors({});
      
      // Fechar formulários abertos
      setShowItemForm(false);
      setShowGrupoForm(false);
      
      return;
    }
    
    
    
    // Carregando dados existentes para licitação
    
    const loadExistingData = async () => {
      try {
  
        
        // Carregar dados do formulário
        setFormData({
          descricao: editingLicitacao.descricao,
          uasg: editingLicitacao.uasg,
          tipo_licitacao: editingLicitacao.tipo_licitacao,
          numero: editingLicitacao.numero,
          tipo_classificacao: editingLicitacao.tipo_classificacao || 'ITEM',
          posicao: editingLicitacao.posicao || '',
          data_licitacao: editingLicitacao.data_licitacao,
          custo: editingLicitacao.custo,
          preco_inicial: editingLicitacao.preco_inicial,
          preco_final: editingLicitacao.preco_final,
          margem_percentual: editingLicitacao.margem_percentual,
          imposto: editingLicitacao.imposto,
          imposto_nota: editingLicitacao.imposto_nota,
          margem_dinheiro: editingLicitacao.margem_dinheiro,
          portal: editingLicitacao.portal,
          status: editingLicitacao.status,
          observacoes: editingLicitacao.observacoes || '',
          cliente_id: editingLicitacao.cliente_id,
          // Campos do órgão (carregar do banco)
          nome_orgao: editingLicitacao.nome_orgao || '',
          cnpj_cpf_orgao: editingLicitacao.cnpj_cpf_orgao || '',
          cnpj_cpf_uasg: editingLicitacao.cnpj_cpf_uasg || '',
          sigla_uf: editingLicitacao.sigla_uf || '',
          codigo_municipio: editingLicitacao.codigo_municipio || '',
          nome_municipio_ibge: editingLicitacao.nome_municipio_ibge || ''
        });
        
        // Debug: verificar campos do órgão carregados

        

        
        // Buscar itens e grupos em paralelo para melhor performance
        const [itensData, gruposData] = await Promise.allSettled([
          licitacaoService.listItens(editingLicitacao.id),
          editingLicitacao.tipo_classificacao === 'GRUPO' 
            ? licitacaoService.listGrupos(editingLicitacao.id) 
            : Promise.resolve([])
        ]);
        
        if (itensData.status === 'fulfilled') {
  
          setItems(itensData.value);
        }
        
        if (gruposData.status === 'fulfilled' && editingLicitacao.tipo_classificacao === 'GRUPO') {
  
          setGrupos(gruposData.value);
        }
        
              } catch (error) {
          console.error('❌ Erro ao carregar dados:', error);
        }
    };
    
    loadExistingData();
  }, [editingLicitacao?.id]); // Só executar quando o ID da licitação mudar

  // Busca automática de dados do órgão quando UASG for preenchido
  useEffect(() => {

    
    // Só buscar se não estiver editando uma licitação existente
    if (!editingLicitacao?.id && formData.uasg && formData.uasg.length >= 3) {
      // Aguardar um pouco para evitar muitas chamadas enquanto o usuário digita
      const timeoutId = setTimeout(() => {

        buscarDadosOrgao(formData.uasg);
      }, 1000); // 1 segundo de delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.uasg, editingLicitacao?.id]);

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);
  

  
  // Log para monitorar quando onClose é chamado (removido para evitar efeitos colaterais)
  // useEffect(() => {
  
  // }, [onClose]);

  // Calcular valores automaticamente quando itens ou grupos mudarem
  useEffect(() => {
    // Não recalcular se estiver editando um item
    if (editingItem) {
      return;
    }
    
    // Usar useMemo para evitar cálculos desnecessários
    const calcularValores = () => {
      let valorTotal = 0;
      let custoTotal = 0;

      if (formData.tipo_classificacao === 'ITEM') {
        valorTotal = items.reduce((sum, item) => sum + item.preco_total, 0);
        custoTotal = items.reduce((sum, item) => sum + (item.custo_total || 0), 0);
      } else {
        // Calcular total dos grupos
        grupos.forEach(grupo => {
          grupo.itens.forEach(item => {
            valorTotal += item.preco_total;
            custoTotal += item.custo_total || 0;
          });
        });
      }
      
      return { valorTotal, custoTotal };
    };
    
    const { valorTotal, custoTotal } = calcularValores();
    
    // Só atualizar se os valores realmente mudaram
    setFormData(prev => {
      if (prev.preco_inicial === valorTotal && prev.custo === custoTotal) {
        return prev; // Não atualizar se os valores são os mesmos
      }
      
      return {
        ...prev,
        preco_inicial: valorTotal,
        preco_final: valorTotal,
        custo: custoTotal,
        margem_percentual: custoTotal > 0 ? ((valorTotal - custoTotal) / custoTotal) * 100 : 0,
        imposto: valorTotal * 0.06,
        imposto_nota: valorTotal * 0.06,
        margem_dinheiro: valorTotal - custoTotal - (valorTotal * 0.06)
      };
    });
  }, [items, grupos, formData.tipo_classificacao, editingItem]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Cliente é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.uasg.trim()) {
      newErrors.uasg = 'UASG é obrigatório';
    }

    if (!formData.numero.trim()) {
      newErrors.numero = 'Número é obrigatório';
    }

    if (!formData.data_licitacao) {
      newErrors.data_licitacao = 'Data da licitação é obrigatória';
    }

    // Validação mais flexível - permitir salvar sem itens/grupos inicialmente
    if (formData.tipo_classificacao === 'ITEM' && items.length === 0) {
      // Aviso: Nenhum item cadastrado, mas permitindo salvar
    }

    if (formData.tipo_classificacao === 'GRUPO' && grupos.length === 0) {
      // Aviso: Nenhum grupo cadastrado, mas permitindo salvar
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Funções para itens individuais
  const handleAddItem = (item: Omit<ItemLicitacao, 'id' | 'licitacao_id' | 'created_at' | 'updated_at'>) => {
    const newItem: ItemLicitacao = {
      ...item,
      id: Date.now(),
      licitacao_id: 0,
      created_at: new Date().toISOString(),
      updated_at: undefined
    };

    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? newItem : i));
      setEditingItem(null);
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setShowItemForm(false);
    toast.success(editingItem ? 'Item atualizado com sucesso!' : 'Item adicionado com sucesso!');
  };

  const handleEditItem = (item: ItemLicitacao) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = (itemId: number) => {
    setItems(prev => {
      const newItems = prev.filter(item => item.id !== itemId);
      return newItems;
    });
    toast.success('Item removido com sucesso!');
  };

  // Funções para grupos
  const handleAddGrupo = (grupo: Grupo) => {
    if (editingGrupo) {
      setGrupos(prev => prev.map(g => g.id === editingGrupo.id ? grupo : g));
      setEditingGrupo(null);
      toast.success('Grupo atualizado com sucesso!');
    } else {
      setGrupos(prev => [...prev, grupo]);
      toast.success('Grupo criado com sucesso!');
    }
    setShowGrupoForm(false);
  };

  const handleEditGrupo = (grupo: Grupo) => {
    setEditingGrupo(grupo);
    setShowGrupoForm(true);
  };

  const handleDeleteGrupo = (grupoId: number) => {
    setGrupos(prev => prev.filter(grupo => grupo.id !== grupoId));
    toast.success('Grupo removido com sucesso!');
  };

  const handleUpdateGrupoPosicao = async (grupoId: number, novaPosicao: string) => {
    try {
      // Buscar o grupo atual para obter o nome
      const grupoAtual = grupos.find(g => g.id === grupoId);
      if (!grupoAtual) {
        throw new Error('Grupo não encontrado');
      }
      
      // Atualizar no backend
      await licitacaoService.updateGrupo(grupoId, { 
        nome: grupoAtual.nome,
        posicao: novaPosicao 
      });
      
      // Atualizar estado local
      setGrupos(prev => prev.map(grupo => 
        grupo.id === grupoId 
          ? { ...grupo, posicao: novaPosicao }
          : grupo
      ));
      
      toast.success('Posição do grupo atualizada com sucesso!');
      
    } catch (error) {
      toast.error('Erro ao atualizar posição do grupo');
    }
  };

  const handleUpdateItemPosicao = (itemId: number, novaPosicao: string) => {
    setItems(prev => {
      const newItems = prev.map(item => 
        item.id === itemId 
          ? { ...item, posicao: novaPosicao }
          : item
      );
      return newItems;
    });
    
    toast.success('Posição do item atualizada!');
  };

  const handleViewItem = (item: ItemLicitacao) => {
    setViewingItem(item);
  };

  const handleCancelItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleCancelGrupoForm = () => {
    setShowGrupoForm(false);
    setEditingGrupo(null);
  };

  // Mutation para criar/atualizar licitação com itens
  const createLicitacaoMutation = useMutation(
    (data: LicitacaoComItensCreate) => {
      if (editingLicitacao) {
        return licitacaoService.updateComItens(editingLicitacao.id, data);
      } else {
        return licitacaoService.createComItens(data);
      }
    },
    {
      onSuccess: () => {
        const message = editingLicitacao ? 'Licitação atualizada com sucesso!' : 'Licitação criada com sucesso!';
        toast.success(message);
        queryClient.invalidateQueries('licitacoes');
        onSuccess();
        onClose();
      },
      onError: (error: any) => {
        const action = editingLicitacao ? 'atualizar' : 'criar';
        toast.error(error.response?.data?.detail || `Erro ao ${action} licitação`);
      }
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    // Preparar itens baseado no tipo de classificação
    let itensParaEnviar: ItemLicitacao[] = [];
    
    if (formData.tipo_classificacao === 'ITEM') {
      itensParaEnviar = items;
    } else {
      // Flatten todos os itens dos grupos
      grupos.forEach(grupo => {
        itensParaEnviar.push(...grupo.itens);
      });
    }


    
    const licitacaoData: LicitacaoComItensCreate = {
      ...formData,
      itens: itensParaEnviar,
      grupos: formData.tipo_classificacao === 'GRUPO' ? grupos : undefined
    };



    createLicitacaoMutation.mutate(licitacaoData);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0"
      onClick={(e) => {
        // 🎯 CORRIGIDO: Clique fora do modal fecha com confirmação
        if (e.target === e.currentTarget) {
          onCloseWithConfirm(); // 🎯 Usar onCloseWithConfirm (com alerta)
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto mx-12">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingLicitacao ? 'Editar Licitação' : 'Nova Licitação com Itens'}
            </h2>
            <p className="text-gray-600 mt-1">
              {editingLicitacao 
                ? 'Edite os dados da licitação e seus itens'
                : 'Cadastre uma nova licitação com todos os seus itens, quantidades e preços'
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseWithConfirm} // 🎯 CORRIGIDO: Usar onCloseWithConfirm (com alerta)
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informações da Licitação
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cliente_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value={0}>Selecione um cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
                {errors.cliente_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliente_id}</p>
                )}
              </div>

              {/* UASG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UASG *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.uasg}
                    onChange={(e) => {
                      handleInputChange('uasg', e.target.value);
                    }}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.uasg ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Código UASG"
                  />
                  <button
                    type="button"
                    onClick={() => buscarDadosOrgao(formData.uasg)}
                    disabled={!formData.uasg || formData.uasg.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Buscar
                  </button>
                </div>
                {errors.uasg && (
                  <p className="mt-1 text-sm text-red-600">{errors.uasg}</p>
                )}
              </div>



              {/* Número */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número *
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.numero ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Número da licitação"
                />
                {errors.numero && (
                  <p className="mt-1 text-sm text-red-600">{errors.numero}</p>
                )}
              </div>

              {/* Tipo de Licitação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Licitação
                </label>
                <select
                  value={formData.tipo_licitacao}
                  onChange={(e) => handleInputChange('tipo_licitacao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Dispensa Eletrônica">Dispensa Eletrônica</option>
                  <option value="Pregão Eletrônico">Pregão Eletrônico</option>
                  <option value="Concorrência">Concorrência</option>
                  <option value="Convite">Convite</option>
                  <option value="Leilão">Leilão</option>
                </select>
              </div>

              {/* Tipo de Classificação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classificação
                </label>
                <select
                  value={formData.tipo_classificacao}
                  onChange={(e) => handleInputChange('tipo_classificacao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ITEM">Por Item</option>
                  <option value="GRUPO">Por Grupo</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tipo_classificacao === 'ITEM' 
                    ? 'Cada item é avaliado separadamente' 
                    : 'Itens são agrupados para avaliação'
                  }
                </p>
              </div>

              {/* Data da Licitação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Licitação *
                </label>
                <input
                  type="date"
                  value={formData.data_licitacao}
                  onChange={(e) => handleInputChange('data_licitacao', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.data_licitacao ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.data_licitacao && (
                  <p className="mt-1 text-sm text-red-600">{errors.data_licitacao}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="AGUARDANDO">Aguardando</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="GANHO">Ganho</option>
                  <option value="PERDIDO">Perdido</option>
                  <option value="DESCLASSIFICADO">Desclassificado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.descricao ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descrição detalhada da licitação"
              />
              {errors.descricao && (
                <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
              )}
            </div>

            {/* Portal */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portal
              </label>
              <input
                type="text"
                value={formData.portal}
                onChange={(e) => handleInputChange('portal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Portal da licitação"
              />
            </div>

            {/* Observações */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observações adicionais"
              />
            </div>
          </div>

          {/* Dados do Órgão */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Dados do Órgão</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Órgão</label>
                <input
                  type="text"
                  value={formData.nome_orgao || ''}
                  onChange={(e) => handleInputChange('nome_orgao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome do órgão"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF do Órgão</label>
                <input
                  type="text"
                  value={formData.cnpj_cpf_orgao || ''}
                  onChange={(e) => handleInputChange('cnpj_cpf_orgao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CNPJ/CPF do órgão"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF da UASG</label>
                <input
                  type="text"
                  value={formData.cnpj_cpf_uasg || ''}
                  onChange={(e) => handleInputChange('cnpj_cpf_uasg', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CNPJ/CPF da UASG"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                <input
                  type="text"
                  value={formData.sigla_uf || ''}
                  onChange={(e) => handleInputChange('sigla_uf', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="UF"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código do Município</label>
                <input
                  type="text"
                  value={formData.codigo_municipio || ''}
                  onChange={(e) => handleInputChange('codigo_municipio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Código do município"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Município</label>
                <input
                  type="text"
                  value={formData.nome_municipio_ibge || ''}
                  onChange={(e) => handleInputChange('nome_municipio_ibge', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome do município"
                />
              </div>
            </div>
          </div>

          {/* Seção de Itens ou Grupos */}
          <div className={`rounded-lg p-6 ${formData.tipo_classificacao === 'ITEM' ? 'bg-blue-50' : 'bg-purple-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {formData.tipo_classificacao === 'ITEM' ? 'Itens da Licitação' : 'Grupos da Licitação'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (formData.tipo_classificacao === 'ITEM') {
                    setShowItemForm(true);
                  } else {
                    setShowGrupoForm(true);
                  }
                }}
                className={`px-4 py-2 text-white hover:opacity-90 rounded-lg transition-colors flex items-center gap-2 ${
                  formData.tipo_classificacao === 'ITEM' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <Plus size={16} />
                {formData.tipo_classificacao === 'ITEM' ? 'Adicionar Item' : 'Adicionar Grupo'}
              </button>
            </div>

            {/* Mensagens de erro */}
            {errors.items && (
              <p className="text-sm text-red-600 mb-4">{errors.items}</p>
            )}
            {errors.grupos && (
              <p className="text-sm text-red-600 mb-4">{errors.grupos}</p>
            )}

            {/* Formulário de Item */}
            {showItemForm && (
              <div>
                <ItemForm
                  item={editingItem || undefined}
                  onSave={handleAddItem}
                  onCancel={handleCancelItemForm}
                  isEditing={!!editingItem}
                  nextCodigo={items.length + 1}
                />
              </div>
            )}

            {/* Formulário de Grupo */}
            {showGrupoForm && (
              <GrupoForm
                grupo={editingGrupo}
                onSave={handleAddGrupo}
                onCancel={handleCancelGrupoForm}
                isEditing={!!editingGrupo}
              />
            )}

            {/* Tabela de Itens ou Grupos */}
            {formData.tipo_classificacao === 'ITEM' ? (
              <ItemsTable
                items={items}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onView={handleViewItem}
                onUpdatePosicao={handleUpdateItemPosicao}
              />
            ) : (
              <GruposTable
                grupos={grupos}
                onEdit={handleEditGrupo}
                onDelete={handleDeleteGrupo}
                onViewItem={handleViewItem}
                onUpdatePosicao={handleUpdateGrupoPosicao}
              />
            )}
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={20} className="text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Resumo Financeiro
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Preço Inicial</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(formData.preco_inicial)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Preço Final</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(formData.preco_final)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Custo Real</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(formData.custo)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Margem</p>
                <p className="text-lg font-bold text-green-600">
                  {formData.margem_percentual.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLicitacaoMutation.isLoading}
              className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {createLicitacaoMutation.isLoading ? 'Salvando...' : (editingLicitacao ? 'Salvar Alterações' : 'Criar Licitação')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de detalhes do item */}
      {viewingItem && (
        <ItemDetailModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
        />
      )}
    </div>
  );
};

export default LicitacaoComItensForm;
