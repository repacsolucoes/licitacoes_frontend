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
  tipo_classificacao?: 'ITEM' | 'GRUPO';
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
  
  // Campos do órgão (API pública)
  nome_orgao?: string;
  cnpj_cpf_orgao?: string;
  cnpj_cpf_uasg?: string;
  sigla_uf?: string;
  codigo_municipio?: string;
  nome_municipio_ibge?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ItemLicitacao {
  id: number;
  codigo_item: string;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  posicao?: string; // Posição do item (1º, 2º, 3º item)
  custo_unitario: number;
  custo_total: number;
  marca_modelo?: string;
  especificacoes_tecnicas?: string;
  observacoes?: string;
  licitacao_id: number;
  created_at: string;
  updated_at?: string;
}

export interface Grupo {
  id: number;
  nome: string;
  descricao?: string; // Descrição do grupo
  posicao?: string; // Posição do grupo (1º, 2º, 3º grupo) - opcional
  itens: ItemLicitacao[];
}

export interface LicitacaoComItensCreate {
  cliente_id: number;
  descricao: string;
  uasg: string;
  tipo_licitacao: string;
  numero: string;
  tipo_classificacao: 'ITEM' | 'GRUPO';
  posicao?: string; // Posição geral da licitação
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
  
  // Campos do órgão (API pública)
  nome_orgao?: string;
  cnpj_cpf_orgao?: string;
  cnpj_cpf_uasg?: string;
  sigla_uf?: string;
  codigo_municipio?: string;
  nome_municipio_ibge?: string;
  
  itens: ItemLicitacao[];
  grupos?: Grupo[];
}

export interface LicitacaoComItens extends Licitacao {
  itens: ItemLicitacao[];
  grupos?: Grupo[];
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
  licitacao?: Licitacao;
  user_criador?: User;
}

// Novos tipos para o sistema de pedidos
export interface ItemPedido {
  id: number;
  pedido_id: number;
  item_licitacao_id: number;
  quantidade_solicitada: number;
  preco_unitario: number;
  preco_total: number;
  custo_unitario: number;
  custo_total: number;
  created_at: string;
  updated_at?: string;
  item_licitacao?: ItemLicitacao;
}

export interface Empenho {
  id: number;
  pedido_id: number;
  numero_empenho: string;
  data_empenho: string;
  valor_empenhado: number;
  observacoes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface Contrato {
  id: number;
  licitacao_id: number;
  numero_contrato: string;
  data_contrato: string;
  valor_contrato: number;
  tipo_entrega: string;  // ENTREGA_UNICA, FORNECIMENTO_ANUAL
  prazo_contrato?: number;  // Prazo em dias (apenas para FORNECIMENTO_ANUAL)
  observacoes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  licitacao?: Licitacao;
  itens_contrato?: ItemContrato[];
}

export interface ContratoCreate {
  licitacao_id: number;
  numero_contrato: string;
  data_contrato: string;
  valor_contrato: number;
  tipo_entrega: string;  // ENTREGA_UNICA, FORNECIMENTO_ANUAL
  prazo_contrato?: number;  // Prazo em dias (apenas para FORNECIMENTO_ANUAL)
  observacoes?: string;
  status: string;
  itens_contrato: Omit<ItemContrato, 'id' | 'contrato_id' | 'created_at' | 'updated_at'>[];
}

export interface ContratoUpdate {
  numero_contrato?: string;
  data_contrato?: string;
  valor_contrato?: number;
  tipo_entrega?: string;
  prazo_contrato?: number;
  observacoes?: string;
  status?: string;
}

export interface ContratoStats {
  total_contratos: number;
  contratos_ativos: number;
  contratos_suspensos: number;
  contratos_encerrados: number;
  valor_total_contratos: number;
}

export interface Pagamento {
  id: number;
  pedido_id: number;
  numero_pagamento: string;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento: string;
  observacoes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PedidoCreate {
  licitacao_id: number;
  data_criacao?: string;
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
  entrega_confirmada?: boolean;
  data_entrega?: string;
  numero_nota_fiscal?: string;
  valor_nota_fiscal?: number;
  observacoes_entrega?: string;
  status_geral?: string;
  status_pagamento?: string;
  pagamento_confirmado?: boolean;
  data_pagamento_previsto?: string;
  valor_pago?: number;
  data_pagamento?: string;
  observacoes_pagamento?: string;
  observacoes_gerais?: string;
}

export interface PedidoUpdate {
  data_criacao?: string;
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
  entrega_confirmada?: boolean;
  data_entrega?: string;
  numero_nota_fiscal?: string;
  valor_nota_fiscal?: number;
  observacoes_entrega?: string;
  status_geral?: string;
  status_pagamento?: string;
  pagamento_confirmado?: boolean;
  data_pagamento_previsto?: string;
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

export interface PedidoCompleto extends Pedido {
  itens_pedido: ItemPedido[];
  empenhos: Empenho[];
  pagamentos: Pagamento[];
}

export interface QuantidadesDisponiveis {
  licitacao_id: number;
  tipo_classificacao: string;
  valor_final: number;
  custo_total: number;
  itens_disponiveis: Array<{
    item_id: number;
    codigo_item: string;
    descricao: string;
    quantidade_licitacao: number;
    quantidade_pedida: number;
    quantidade_disponivel: number;
    preco_unitario: number;
    custo_unitario: number;
  }> | Array<{
    grupo_id: number;
    nome: string;
    posicao?: string;
    itens: Array<{
      item_id: number;
      codigo_item: string;
      descricao: string;
      quantidade_licitacao: number;
      quantidade_pedida: number;
      quantidade_disponivel: number;
      preco_unitario: number;
      custo_unitario: number;
    }>;
  }>;
}

// Tipos para Contratos
export interface ItemContrato {
  id: number;
  contrato_id: number;
  item_licitacao_id: number;
  quantidade_contratada: number;
  preco_unitario_contrato: number;
  preco_total_contrato: number;
  custo_unitario_contrato: number;
  custo_total_contrato: number;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
  item_licitacao?: ItemLicitacao;
}

export interface Contrato {
  id: number;
  licitacao_id: number;
  numero_contrato: string;
  data_contrato: string;
  valor_contrato: number;
  prazo_contrato?: number;
  observacoes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  licitacao?: Licitacao;
  itens_contrato?: ItemContrato[];
}

export interface ContratoCreate {
  licitacao_id: number;
  numero_contrato: string;
  data_contrato: string;
  valor_contrato: number;
  prazo_contrato?: number;
  observacoes?: string;
  status: string;
  itens_contrato: Omit<ItemContrato, 'id' | 'contrato_id' | 'created_at' | 'updated_at'>[];
}

export interface ContratoUpdate {
  numero_contrato?: string;
  data_contrato?: string;
  valor_contrato?: number;
  prazo_contrato?: number;
  observacoes?: string;
  status?: string;
}

export interface ContratoStats {
  total_contratos: number;
  contratos_ativos: number;
  contratos_suspensos: number;
  contratos_encerrados: number;
  valor_total_contratos: number;
}
