import axios from 'axios';
import { LoginCredentials, AuthResponse, User, Cliente, Licitacao, DashboardStats, Documentacao, Pedido, PedidoCreate, PedidoUpdate, PedidoStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Verificar se é um erro de autenticação real ou temporário
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
      }
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
};

// Serviços de usuários
export const userService = {
  list: async (): Promise<User[]> => {
    const response = await api.get('/usuarios/');
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
  list: async (search?: string): Promise<Cliente[]> => {
    const params = search ? { search } : {};
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

  moverArquivos: async (): Promise<{ message: string; movidas: number; total_processadas: number }> => {
    const response = await api.post('/clientes/mover-arquivos');
    return response.data;
  },
};

// Serviços de licitações
export const licitacaoService = {
  list: async (params?: {
    search?: string;
    status_filter?: string;
    cliente_id?: number;
    data_inicio?: string;
    data_fim?: string;
    sem_pedidos?: boolean;
  }): Promise<Licitacao[]> => {

    
    try {
      const response = await api.get('/licitacoes/', { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  create: async (licitacao: Omit<Licitacao, 'id' | 'indice' | 'user_criador_id' | 'created_at' | 'updated_at' | 'cliente' | 'user_criador'>): Promise<Licitacao> => {
    const response = await api.post('/licitacoes/', licitacao);
    return response.data;
  },

  get: async (id: number): Promise<Licitacao> => {
    const response = await api.get(`/licitacoes/${id}`);
    return response.data;
  },

  update: async (id: number, licitacao: Partial<Licitacao>): Promise<Licitacao> => {
    const response = await api.put(`/licitacoes/${id}`, licitacao);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/licitacoes/${id}`);
  },

  atualizarApi: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/licitacoes/${id}/atualizar-api`);
    return response.data;
  },

  atualizarTodasApi: async (): Promise<{ atualizadas: number; erros: number; total: number }> => {
    const response = await api.post('/licitacoes/atualizar-todas-api');
    return response.data;
  },

  getDashboardStats: async (clienteId?: number): Promise<DashboardStats> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/dashboard/stats', { params });
    return response.data;
  },

  // Novos métodos para relatórios
  getRelatorioPorCliente: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/relatorios/por-cliente', { params });
    return response.data;
  },

  getRelatorioPorStatus: async (clienteId?: number): Promise<any[]> => {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get('/licitacoes/relatorios/por-status', { params });
    return response.data;
  },

  getEstatisticasGerais: async (clienteId?: number, pedidoId?: number): Promise<any> => {
    const params: any = {};
    if (clienteId) params.cliente_id = clienteId;
    if (pedidoId) params.pedido_id = pedidoId;
    const response = await api.get('/licitacoes/relatorios/estatisticas-gerais', { params });
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
};

export const pedidoService = {
  list: async (statusGeral?: string, clienteId?: number): Promise<Pedido[]> => {
    const params: any = {};
    if (statusGeral) params.status_geral = statusGeral;
    if (clienteId) params.cliente_id = clienteId;
    
    const response = await api.get('/pedidos/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Pedido> => {
    const response = await api.get(`/pedidos/${id}`);
    return response.data;
  },

  create: async (pedido: PedidoCreate): Promise<Pedido> => {
    const response = await api.post('/pedidos/', pedido);
    return response.data;
  },

  update: async (id: number, pedido: PedidoUpdate): Promise<Pedido> => {
    const response = await api.put(`/pedidos/${id}`, pedido);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/pedidos/${id}`);
  },

  getByLicitacao: async (licitacaoId: number): Promise<Pedido | null> => {
    const response = await api.get(`/pedidos/licitacao/${licitacaoId}`);
    return response.data;
  },

  getStats: async (): Promise<PedidoStats> => {
    const response = await api.get('/pedidos/dashboard/stats');
    return response.data;
  },
};

export const documentacaoService = {
  list: async (clienteId?: number, status?: string, tipoDocumento?: string): Promise<Documentacao[]> => {
    const params: any = {};
    if (clienteId) params.cliente_id = clienteId;
    if (status) params.status = status;
    if (tipoDocumento) params.tipo_documento = tipoDocumento;
    
    const response = await api.get('/documentacoes/listar', { params });
    return response.data;
  },

  get: async (id: number): Promise<Documentacao> => {
    const response = await api.get(`/documentacoes/${id}`);
    return response.data;
  },

  create: async (formData: FormData): Promise<Documentacao> => {
    const response = await api.post('/documentacoes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

  downloadHabilitacao: async (): Promise<void> => {
    const response = await api.get('/documentacoes/download-habilitacao', {
      responseType: 'blob',
    });
    
    // Criar link para download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Habilitação.zip');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  moverAtestadosCapacidade: async (): Promise<{ message: string; movidas: number; total_processadas: number }> => {
    const response = await api.post('/documentacoes/mover-atestados-capacidade');
    return response.data;
  },
};

export default api;
