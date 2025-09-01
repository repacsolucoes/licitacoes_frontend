export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  cliente_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: number;
  cpf_cnpj: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  imposto_cliente?: number;
  created_at: string;
  updated_at: string;
}

export interface Licitacao {
  id: number;
  indice?: number;
  cliente_id: number;
  user_criador_id: number;
  descricao: string;
  uasg: string;
  tipo_licitacao: string;
  numero: string;
  posicao?: string;
  data_licitacao: string;
  custo: number;
  preco_inicial: number;
  preco_final: number;
  margem_percentual: number;
  imposto: number;
  imposto_nota: number;
  margem_dinheiro: number;
  portal: string;
  status: string;
  observacoes?: string;
  api_id?: string;
  resultado_api?: string;
  ultima_atualizacao_api?: string;
  created_at: string;
  updated_at: string;
}

export interface Documentacao {
  id: number;
  titulo: string;
  descricao?: string;
  arquivo_pdf: string;
  data_upload: string;
  data_validade?: string;
  data_emissao?: string;
  status: string;
  tipo_documento: string;
  cliente_id: number;
  user_upload_id: number;
  dados_extraidos?: string;
  cnpj_extraido?: string;
  razao_social_extraida?: string;
  data_emissao_extraida?: string;
  numero_documento_extraido?: string;
}

export interface DashboardStats {
  total_licitacoes: number;
  licitacoes_ganhas: number;
  licitacoes_pendentes: number;
  licitacoes_desclassificadas: number;
  valor_total_ganho: number;
  margem_media: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface Pedido {
  id: number;
  licitacao_id: number;
  user_criador_id: number;
  empenho_feito: boolean;
  empenho_data?: string;
  empenho_observacoes?: string;
  pedido_orgao_feito: boolean;
  pedido_orgao_data?: string;
  pedido_orgao_observacoes?: string;
  contrato_feito: boolean;
  contrato_data?: string;
  contrato_observacoes?: string;
  outros_documentos: boolean;
  outros_documentos_descricao?: string;
  outros_documentos_data?: string;
  entrega_feita: boolean;
  entrega_data?: string;
  entrega_observacoes?: string;
  status_geral: string;
  status_pagamento: string;
  valor_pago: number;
  data_pagamento?: string;
  observacoes_pagamento?: string;
  observacoes_gerais?: string;
  created_at: string;
  updated_at?: string;
  licitacao: Licitacao;
  user_criador: User;
}

export interface PedidoCreate {
  licitacao_id: number;
  empenho_feito?: boolean;
  empenho_data?: string;
  empenho_observacoes?: string;
  pedido_orgao_feito?: boolean;
  pedido_orgao_data?: string;
  pedido_orgao_observacoes?: string;
  contrato_feito?: boolean;
  contrato_data?: string;
  contrato_observacoes?: string;
  outros_documentos?: boolean;
  outros_documentos_descricao?: string;
  outros_documentos_data?: string;
  entrega_feita?: boolean;
  entrega_data?: string;
  entrega_observacoes?: string;
  status_geral?: string;
  status_pagamento?: string;
  valor_pago?: number;
  data_pagamento?: string;
  observacoes_pagamento?: string;
  observacoes_gerais?: string;
}

export interface PedidoUpdate {
  empenho_feito?: boolean;
  empenho_data?: string;
  empenho_observacoes?: string;
  pedido_orgao_feito?: boolean;
  pedido_orgao_data?: string;
  pedido_orgao_observacoes?: string;
  contrato_feito?: boolean;
  contrato_data?: string;
  contrato_observacoes?: string;
  outros_documentos?: boolean;
  outros_documentos_descricao?: string;
  outros_documentos_data?: string;
  entrega_feita?: boolean;
  entrega_data?: string;
  entrega_observacoes?: string;
  status_geral?: string;
  status_pagamento?: string;
  valor_pago?: number;
  data_pagamento?: string;
  observacoes_pagamento?: string;
  observacoes_gerais?: string;
}

export interface PedidoStats {
  total_pedidos: number;
  pedidos_pendentes: number;
  pedidos_em_andamento: number;
  pedidos_concluidos: number;
  pedidos_cancelados: number;
}
