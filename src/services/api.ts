import axios from 'axios';
import { LoginCredentials, AuthResponse, User, Cliente, Licitacao, DashboardStats, Documentacao, Pedido, PedidoCreate, PedidoUpdate, PedidoStats, ItemLicitacao, LicitacaoComItensCreate, LicitacaoComItens, Contrato, ContratoCreate, ContratoUpdate, ContratoStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8100/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos de timeout
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Adicionar Content-Type apenas se não for FormData
  if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido - redirecionar para login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Criar URLSearchParams para enviar dados como form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Função para verificar se o token ainda é válido
  checkTokenValidity: async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return false;
      }
      
      const response = await api.get('/auth/me');
      return response.status === 200;
    } catch (error) {

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  },
};

// Serviços de usuários
export const userService = {
  list: async (filters?: { 
    page?: number,
    limit?: number,
    search?: string
  }): Promise<{ data: User[], total: number, page: number, limit: number, total_pages: number }> => {
    const params: any = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    
    const response = await api.get('/usuarios/', { params });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  create: async (user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }): Promise<User> => {
    const response = await api.post('/usuarios/', user);
    return response.data;
  },

  update: async (id: number, user: Partial<User>): Promise<User> => {
    const response = await api.put(`/usuarios/${id}`, user);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/${id}`);
  },
};

// Serviços de clientes
export const clienteService = {
  list: async (filters?: { 
    search?: string,
    page?: number,
    limit?: number
  }): Promise<{ data: Cliente[], total: number, page: number, limit: number, total_pages: number }> => {
    const params: any = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    
    const response = await api.get('/clientes/', { params });
    return response.data;
  },

  create: async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> => {
    const response = await api.post('/clientes/', cliente);
    return response.data;
  },

  get: async (id: number): Promise<Cliente> => {
    const response = await api.get(`/clientes/${id}`);
    return response.data;
  },

  update: async (id: number, cliente: Partial<Cliente>): Promise<Cliente> => {
    const response = await api.put(`/clientes/${id}`, cliente);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/clientes/${id}`);
  },

  corrigirPastas: async (): Promise<{ message: string; corrigidos: number; total_processados: number }> => {
    const response = await api.post('/clientes/corrigir-pastas');
    return response.data;
  },

  criarEstruturaPastasTodosClientes: async (): Promise<{ message: string; criados: number; total_processados: number }> => {
    const response = await api.post('/clientes/criar-estrutura-pastas-todos-clientes');
    return response.data;
  },
};

// Serviços de licitações
export const licitacaoService = {
  list: async (filters?: { 
    status_filter?: string, 
    cliente_id?: number, 
    sem_pedidos?: boolean, 
    search?: string,
    page?: number,
    limit?: number
  }): Promise<{ data: Licitacao[], total: number, page: number, limit: number, total_pages: number }> => {
    const params: any = {};
    if (filters?.status_filter) params.status_filter = filters.status_filter;
    if (filters?.cliente_id) params.cliente_id = filters.cliente_id;
    if (filters?.sem_pedidos) params.sem_pedidos = filters.sem_pedidos;
    if (filters?.search) params.search = filters.search;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    
    const response = await api.get('/licitacoes/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Licitacao> => {
    const response = await api.get(`/licitacoes/${id}`);
    return response.data;
  },

  getCompleta: async (id: number): Promise<LicitacaoComItens> => {
    const response = await api.get(`/licitacoes/${id}/completa`);
    return response.data;
  },

  create: async (licitacao: Omit<Licitacao, 'id' | 'created_at' | 'updated_at'>): Promise<Licitacao> => {
    const response = await api.post('/licitacoes/', licitacao);
    return response.data;
  },

  update: async (id: number, licitacao: Partial<Licitacao>): Promise<Licitacao> => {
    const response = await api.put(`/licitacoes/${id}`, licitacao);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/licitacoes/${id}`);
  },

  getDashboardStats: async (clienteId?: number): Promise<DashboardStats> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/dashboard/stats', { params });
    return response.data;
  },

  getRelatorioFinanceiro: async (clienteId?: number, pedidoId?: number): Promise<any> => {
    const params: any = {};
    if (clienteId) params.cliente_id = clienteId;
    if (pedidoId) params.pedido_id = pedidoId;
    
    const response = await api.get('/licitacoes/relatorios/financeiro', { params });
    return response.data;
  },

  getTendenciaPerformance: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/relatorios/tendencia-performance', { params });
    return response.data;
  },

  getDistribuicaoPortal: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/relatorios/distribuicao-portal', { params });
    return response.data;
  },

  getRelatorioPorModalidade: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/relatorios/por-modalidade', { params });
    return response.data;
  },

  getEstatisticasGerais: async (clienteId?: number, pedidoId?: number): Promise<any> => {
    const params: any = {};
    if (clienteId) params.cliente_id = clienteId;
    if (pedidoId) params.pedido_id = pedidoId;
    
    const response = await api.get('/licitacoes/relatorios/estatisticas-gerais', { params });
    return response.data;
  },

  getRelatorioPorCliente: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/relatorios/por-cliente', { params });
    return response.data;
  },

  getRelatorioPorStatus: async (clienteId?: number): Promise<any[]> => {
    const params: any = {};
    if (clienteId) params.cliente_id = clienteId;
    
    const response = await api.get('/licitacoes/relatorios/por-status', { params });
    return response.data;
  },

  // Novos métodos para itens de licitação
    createComItens: async (licitacao: LicitacaoComItensCreate): Promise<LicitacaoComItens> => {
    const response = await api.post('/licitacoes/com-itens-fixed', licitacao);
    return response.data;
  },

  updateComItens: async (licitacaoId: number, licitacao: LicitacaoComItensCreate): Promise<LicitacaoComItens> => {
    const response = await api.put(`/licitacoes/${licitacaoId}/com-itens-fixed`, licitacao);
    return response.data;
  },

  listItens: async (licitacaoId: number): Promise<ItemLicitacao[]> => {
    const response = await api.get(`/licitacoes/${licitacaoId}/itens`);
    return response.data;
  },

  addItem: async (licitacaoId: number, item: Omit<ItemLicitacao, 'id' | 'licitacao_id' | 'created_at' | 'updated_at'>): Promise<ItemLicitacao> => {
    const response = await api.post(`/licitacoes/${licitacaoId}/itens`, item);
    return response.data;
  },

  updateItem: async (licitacaoId: number, itemId: number, item: Partial<ItemLicitacao>): Promise<ItemLicitacao> => {
    const response = await api.put(`/licitacoes/${licitacaoId}/itens/${itemId}`, item);
    return response.data;
  },

  deleteItem: async (licitacaoId: number, itemId: number): Promise<void> => {
    await api.delete(`/licitacoes/${licitacaoId}/itens/${itemId}`);
  },

  // Método para buscar dados do órgão a partir do UASG
  buscarDadosOrgao: async (uasg: string): Promise<any> => {
    const response = await api.get(`/licitacoes/buscar-dados-orgao/${uasg}`);
    return response.data;
  },

  // Métodos para grupos de licitação
  listGrupos: async (licitacaoId: number): Promise<any[]> => {
    const response = await api.get(`/licitacoes/${licitacaoId}/grupos`);
    return response.data;
  },
  
  updateGrupo: async (grupoId: number, grupoData: { nome: string; descricao?: string; posicao?: string }): Promise<any> => {
    const response = await api.put(`/licitacoes/grupos/${grupoId}`, grupoData);
    return response.data;
  },
};


export const documentacaoService = {
  list: async (filters?: { 
    clienteId?: number, 
    status?: string, 
    tipoDocumento?: string,
    page?: number,
    limit?: number,
    search?: string
  }): Promise<{ data: Documentacao[], total: number, page: number, limit: number, total_pages: number }> => {
    const params: any = {};
    if (filters?.clienteId) params.cliente_id = filters.clienteId;
    if (filters?.status) params.status = filters.status;
    if (filters?.tipoDocumento) params.tipo_documento = filters.tipoDocumento;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    
    const response = await api.get('/documentacoes/listar', { params });
    return response.data;
  },

  get: async (id: number): Promise<Documentacao> => {
    const response = await api.get(`/documentacoes/${id}`);
    return response.data;
  },

  create: async (data: {
    titulo?: string;
    descricao?: string;
    data_validade?: string;
    data_emissao?: string;
    tipo_documento: string;
    arquivo: File;
    cliente_id?: string;
  }): Promise<Documentacao> => {
    // Criar FormData diretamente no serviço
    const formData = new FormData();
    
    if (data.titulo) {
      formData.append('titulo', data.titulo);
    }
    if (data.descricao) {
      formData.append('descricao', data.descricao);
    }
    if (data.data_validade) {
      formData.append('data_validade', data.data_validade);
    }
    if (data.data_emissao) {
      formData.append('data_emissao', data.data_emissao);
    }
    formData.append('tipo_documento', data.tipo_documento);
    formData.append('arquivo', data.arquivo);
    if (data.cliente_id) {
      formData.append('cliente_id', data.cliente_id);
    }
    
    const token = localStorage.getItem('token');
    

    
    // Criar uma instância específica do Axios para esta requisição
    const uploadApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Adicionar token
    if (token) {
      uploadApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await uploadApi.post('/documentacoes/', formData);
    
    return response.data;
  },

  update: async (id: number, documentacao: Partial<Documentacao>): Promise<Documentacao> => {
    const response = await api.put(`/documentacoes/${id}`, documentacao);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/documentacoes/${id}`);
  },

  getVencendo: async (dias: number = 5): Promise<Documentacao[]> => {
    const response = await api.get('/documentacoes/relatorios/vencendo', { params: { dias } });
    return response.data;
  },

  getNotificacoes: async (): Promise<Documentacao[]> => {
    const response = await api.get('/documentacoes/relatorios/notificacoes');
    return response.data;
  },

  getRelatorioPorStatus: async (): Promise<any[]> => {
    const response = await api.get('/documentacoes/relatorios/por-status');
    return response.data;
  },

  getDadosExtraidos: async (id: number): Promise<any> => {
    const response = await api.get(`/documentacoes/${id}/dados-extraidos`);
    return response.data;
  },

  atualizarDatasEmissao: async (): Promise<{ message: string; atualizadas: number; total_processadas: number }> => {
    const response = await api.post('/documentacoes/atualizar-datas-emissao');
    return response.data;
  },

  downloadHabilitacao: async (clienteId?: number): Promise<void> => {
    const params: any = {};
    if (clienteId) params.cliente_id = clienteId;
    
    try {
      
      // Usar timeout maior para downloads de arquivos grandes
      const response = await api.get('/documentacoes/download-habilitacao', {
        params,
        responseType: 'blob',
        timeout: 30000, // 30 segundos para downloads
      });
      
      
      // Verificar se a resposta é válida
      if (!response.data || response.data.size === 0) {
        throw new Error('Resposta vazia ou inválida do servidor');
      }
      
      // Criar Blob com o tipo correto
      const blob = new Blob([response.data], { 
        type: 'application/zip' 
      });
      
      
      // Criar URL para o Blob
      const url = window.URL.createObjectURL(blob);
      
      // Criar elemento de link para download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Habilitação.zip');
      link.style.display = 'none';
      
      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      
      // Aguardar um pouco antes de limpar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error: any) {
      console.error('Erro no download:', error);
      
      // Tratamento específico para timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('Download cancelado por timeout. O arquivo é muito grande. Tente novamente.');
      }
      
      // Tratamento para outros erros
      if (error.response?.status === 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      }
      
      throw new Error(`Erro no download: ${error.message || 'Erro desconhecido'}`);
    }
  },

  moverAtestadosCapacidade: async (): Promise<{ message: string; movidas: number; total_processadas: number }> => {
    const response = await api.post('/documentacoes/mover-atestados-capacidade');
    return response.data;
  },
};

// Serviço de Relatórios Financeiros
export const relatorioService = {
  financeiro: async (): Promise<any> => {
    const response = await api.get('/pedidos/relatorio-financeiro');
    return response.data;
  },
};

// Serviço de Pedidos
// FORÇAR ATUALIZAÇÃO - getRelatorioPorStatusPedidos
export const pedidoService = {
  list: async (filters?: { 
    page?: number, 
    limit?: number,
    search?: string,
    status?: string,
    cliente_id?: number
  }): Promise<{ data: Pedido[], total: number, page: number, limit: number, total_pages: number }> => {
    const params: any = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    if (filters?.status) params.status = filters.status;
    if (filters?.cliente_id) params.cliente_id = filters.cliente_id;
    
    // Forçar requisição sem cache
    const response = await api.get('/pedidos/', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    // Verificar se data_pagamento_previsto está presente
    const pedido43 = response.data.data?.find((p: any) => p.id === 43);
    if (pedido43) {
    }
    
    return response.data;
  },

  get: async (id: number): Promise<Pedido> => {
    const response = await api.get(`/pedidos/${id}/`);
    return response.data;
  },

  create: async (pedido: PedidoCreate): Promise<Pedido> => {
    const response = await api.post('/pedidos/', pedido);
    return response.data;
  },

  update: async (id: number, pedido: PedidoUpdate): Promise<Pedido> => {
    const response = await api.put(`/pedidos/${id}/`, pedido);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/pedidos/${id}/`);
  },

  getByLicitacao: async (licitacaoId: number): Promise<Pedido[]> => {
    const response = await api.get(`/pedidos/licitacao/${licitacaoId}/`);
    return response.data;
  },

  getStats: async (): Promise<PedidoStats> => {
    const response = await api.get('/pedidos/dashboard/stats');
    return response.data;
  },

  // 🎯 NOVO: Buscar itens de um pedido específico
  getItens: async (pedidoId: number): Promise<any[]> => {
    const response = await api.get(`/pedidos/${pedidoId}/itens/`);
    return response.data;
  },

  getRelatorioPorStatusPedidos: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/pedidos/relatorios/por-status', { params });
    return response.data;
  },
};

// Serviço de Contratos
export const contratoService = {
  list: async (filters?: { 
    page?: number, 
    limit?: number,
    search?: string,
    status?: string,
    cliente_id?: number
  }): Promise<{ data: Contrato[], total: number, page: number, limit: number, total_pages: number }> => {
    const params: any = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search) params.search = filters.search;
    if (filters?.status) params.status = filters.status;
    if (filters?.cliente_id) params.cliente_id = filters.cliente_id;
    
    const response = await api.get('/contratos/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Contrato> => {
    const response = await api.get(`/contratos/${id}/`);
    return response.data;
  },

  create: async (contrato: ContratoCreate): Promise<Contrato> => {
    const response = await api.post('/contratos/', contrato);
    return response.data;
  },

  update: async (id: number, contrato: ContratoUpdate): Promise<Contrato> => {
    const response = await api.put(`/contratos/${id}/`, contrato);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/contratos/${id}/`);
  },

  getByLicitacao: async (licitacaoId: number): Promise<Contrato | null> => {
    const response = await api.get(`/contratos/licitacao/${licitacaoId}/`);
    return response.data;
  },

  getStats: async (): Promise<ContratoStats> => {
    const response = await api.get('/contratos/dashboard/stats');
    return response.data;
  },

  // Novo método para buscar dados do órgão
  buscarDadosOrgao: async (uasg: string): Promise<any> => {
    const response = await api.get(`/contratos/dados-orgao/${uasg}`);
    return response.data;
  },

  // Buscar grupos e itens de uma licitação
  buscarGruposItensLicitacao: async (licitacaoId: number): Promise<any> => {
    const response = await api.get(`/contratos/licitacao/${licitacaoId}/grupos-itens`);
    return response.data;
  },

  // Associar item a um grupo
  associarItemGrupo: async (itemId: number, grupoId: number | null): Promise<any> => {
    const response = await api.put(`/licitacoes/itens/${itemId}/grupo`, { grupo_id: grupoId });
    return response.data;
  },

  // Criar grupo
  criarGrupo: async (licitacaoId: number, grupo: any): Promise<any> => {
    const response = await api.post(`/licitacoes/${licitacaoId}/grupos`, grupo);
    return response.data;
  },

  // Deletar grupo
  deletarGrupo: async (grupoId: number): Promise<any> => {
    const response = await api.delete(`/licitacoes/grupos/${grupoId}`);
    return response.data;
  },

  // Buscar contrato de uma licitação
      buscarContratoLicitacao: async (licitacaoId: number, pedidoId?: number): Promise<any> => {
      const params = pedidoId ? { pedido_id: pedidoId } : {};
      const response = await api.get(`/pedidos/licitacao/${licitacaoId}/contrato`, { params });
      return response.data;
    },

  // Listar todos os contratos
  listarContratos: async (): Promise<any> => {
    const response = await api.get('/pedidos/contratos');
    return response.data;
  },

  // Debug de contratos
  debugContratos: async (): Promise<any> => {
    const response = await api.get('/pedidos/contratos/debug');
    return response.data;
  },

  // Debug de itens de contrato
  debugItensContrato: async (contratoId: number): Promise<any> => {
    const response = await api.get(`/pedidos/contratos/${contratoId}/itens`);
    return response.data;
  },

  // 🎯 NOVO: Obter itens disponíveis para criar novos pedidos
  obterItensParaPedido: async (contratoId: number): Promise<any> => {
    const response = await api.get(`/pedidos/contratos/${contratoId}/itens-para-pedido`);
    return response.data;
  },
};

export default api;
