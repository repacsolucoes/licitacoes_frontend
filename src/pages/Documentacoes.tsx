import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  AlertTriangle,
  FileText,
  RefreshCw,
  Grid,
  List,
  Archive
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { documentacaoService } from '../services/api';
import { clienteService } from '../services/api';
import { RefreshButton } from '../components/RefreshButton';
import Pagination from '../components/Pagination';


const Documentacoes: React.FC = () => {
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auto-refresh quando a página é carregada
  // useAutoRefresh(['documentacoes']); // Comentado temporariamente para debug
  const [statusFilter, setStatusFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingDocumentacao, setEditingDocumentacao] = useState<any>(null);
  const [showDadosExtraidos, setShowDadosExtraidos] = useState(false);
  const [selectedDocumentacaoId, setSelectedDocumentacaoId] = useState<number | null>(null);
  
  // Estados para edição inline
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<string>('titulo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estado para alternar entre visualizações
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const isAdmin = user?.is_admin;
  const queryClient = useQueryClient();

  // Buscar clientes para filtro (apenas para admin)
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list(),
    { enabled: isAdmin }
  );

  // Buscar documentações com paginação
  const { data: documentacoesData, isLoading } = useQuery(
    ['documentacoes', selectedClienteId, statusFilter, tipoFilter, currentPage, itemsPerPage],
    () => documentacaoService.list({
      clienteId: selectedClienteId ? Number(selectedClienteId) : undefined,
      status: statusFilter || undefined,
      tipoDocumento: tipoFilter || undefined,
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined
    }),
    { enabled: !!user }
  );

  // Extrair dados da resposta paginada
  // Verificar se é uma resposta paginada ou array direto
  let documentacoes = [];
  let totalItems = 0;
  let totalPages = 1;
  
  if (documentacoesData) {
    if (Array.isArray(documentacoesData)) {
      // Resposta é um array direto
      documentacoes = documentacoesData;
      totalItems = documentacoesData.length;
      totalPages = 1;
    } else if (documentacoesData.data && Array.isArray(documentacoesData.data)) {
      // Resposta é paginada
      documentacoes = documentacoesData.data;
      totalItems = documentacoesData.total || documentacoesData.data.length;
      totalPages = documentacoesData.total_pages || 1;
    }
  }

  // Buscar documentos vencendo
  const { data: documentosVencendo = [] } = useQuery(
    'documentos-vencendo',
    () => documentacaoService.getVencendo(5)
  );

  // Buscar dados extraídos
  const { data: dadosExtraidos } = useQuery(
    ['dados-extraidos', selectedDocumentacaoId],
    () => documentacaoService.getDadosExtraidos(selectedDocumentacaoId!),
    { enabled: !!selectedDocumentacaoId && showDadosExtraidos }
  );

  // Mutations
  const deleteMutation = useMutation(
    (id: number) => documentacaoService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentacoes');
        toast.success('Documentação deletada com sucesso');
      },
      onError: () => {
        toast.error('Erro ao deletar documentação');
      }
    }
  );

  const atualizarDatasEmissaoMutation = useMutation(
    () => documentacaoService.atualizarDatasEmissao(),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('documentacoes');
        toast.success(`${data.message} (${data.atualizadas} atualizadas)`);
      },
      onError: () => {
        toast.error('Erro ao atualizar datas de emissão');
      }
    }
  );

  const updateInlineMutation = useMutation(
    ({ id, data }: { id: number, data: any }) => documentacaoService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentacoes');
        toast.success('Campo atualizado com sucesso');
        setEditingCell(null);
        setEditValue('');
      },
      onError: () => {
        toast.error('Erro ao atualizar campo');
        setEditingCell(null);
        setEditValue('');
      }
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar esta documentação?')) {
      deleteMutation.mutate(id);
    }
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
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedClienteId, statusFilter, tipoFilter, searchTerm]);

  // Funções para edição inline
  const handleDoubleClick = (id: number, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const handleInlineSave = () => {
    if (!editingCell) return;

    const updateData: any = {};
    
    if (editingCell.field === 'data_emissao' || editingCell.field === 'data_validade') {
      if (editValue) {
        updateData[editingCell.field] = new Date(editValue);
      } else {
        updateData[editingCell.field] = null;
      }
    } else {
      updateData[editingCell.field] = editValue;
    }

    updateInlineMutation.mutate({ id: editingCell.id, data: updateData });
  };

  const handleDownloadHabilitacao = async () => {
    try {
      // Se for admin e tiver cliente selecionado, usar esse cliente
      // Se não for admin, usar o cliente vinculado ao usuário
      const clienteId = isAdmin && selectedClienteId ? Number(selectedClienteId) : undefined;
      await documentacaoService.downloadHabilitacao(clienteId);
      toast.success('Download iniciado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer download da habilitação');
    }
  };

  const moverAtestadosCapacidadeMutation = useMutation(
    () => documentacaoService.moverAtestadosCapacidade(),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('documentacoes');
        toast.success(`${data.message} (${data.movidas} movidas)`);
      },
      onError: () => {
        toast.error('Erro ao mover atestados de capacidade');
      }
    }
  );

  const handleMoverAtestadosCapacidade = () => {
    if (window.confirm('Deseja mover todos os documentos do tipo "Atestado de Capacidade" para a pasta específica?')) {
      moverAtestadosCapacidadeMutation.mutate();
    }
  };

  const handleInlineCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInlineSave();
    } else if (e.key === 'Escape') {
      handleInlineCancel();
    }
  };

  const handleAtualizarDatasEmissao = () => {
    atualizarDatasEmissaoMutation.mutate();
  };

  const handleShowDadosExtraidos = (id: number) => {
    setSelectedDocumentacaoId(id);
    setShowDadosExtraidos(true);
  };

  // Funções de ordenação
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Função para ordenação inteligente
  const sortDocuments = (a: any, b: any, field: string, direction: 'asc' | 'desc') => {
    let aValue: any, bValue: any;

    switch (field) {
      case 'titulo':
        // Ordenação inteligente para títulos que começam com números
        const aMatch = a.titulo.match(/^(\d+)/);
        const bMatch = b.titulo.match(/^(\d+)/);
        
        if (aMatch && bMatch) {
          aValue = parseInt(aMatch[1]);
          bValue = parseInt(bMatch[1]);
        } else {
          aValue = a.titulo.toLowerCase();
          bValue = b.titulo.toLowerCase();
        }
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      case 'data_emissao':
        aValue = a.data_emissao ? new Date(a.data_emissao) : new Date(0);
        bValue = b.data_emissao ? new Date(b.data_emissao) : new Date(0);
        break;
      case 'data_validade':
        aValue = a.data_validade ? new Date(a.data_validade) : new Date(9999, 11, 31);
        bValue = b.data_validade ? new Date(b.data_validade) : new Date(9999, 11, 31);
        break;
      case 'data_upload':
        aValue = new Date(a.data_upload);
        bValue = new Date(b.data_upload);
        break;
      default:
        aValue = a[field];
        bValue = b[field];
    }

    if (direction === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  };

  // Filtros agora são aplicados no backend, não precisamos mais de filtro local
  const filteredAndSortedDocumentacoes = [...documentacoes].sort((a, b) =>
    sortDocuments(a, b, sortField, sortDirection)
  );

  // Funções auxiliares
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATIVO': return 'bg-green-100 text-green-800';
      case 'VENCENDO': return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ATIVO': return 'Ativo';
      case 'VENCENDO': return 'Vencendo';
      case 'EXPIRADO': return 'Expirado';
      default: return status;
    }
  };

  // Função para quebrar texto em chunks de 100 caracteres
  const quebrarTexto = (texto: string, maxCaracteres: number = 50): string => {
    if (!texto || texto.length <= maxCaracteres) return texto;
    
    const chunks: string[] = [];
    for (let i = 0; i < texto.length; i += maxCaracteres) {
      chunks.push(texto.slice(i, i + maxCaracteres));
    }
    return chunks.join('\n');
  };

  // Função para limitar texto com reticências
  const limitarTexto = (texto: string, maxCaracteres: number = 80): string => {
    if (!texto || texto.length <= maxCaracteres) return texto;
    return texto.substring(0, maxCaracteres) + '...';
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    
    // Se a data já está no formato YYYY-MM-DD, converter diretamente
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Para outros formatos, usar toLocaleDateString
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatValidade = (dateString: string | undefined | null) => {
    if (!dateString) return 'Sem validade';
    
    // Se a data já está no formato YYYY-MM-DD, converter diretamente
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Para outros formatos, usar toLocaleDateString
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentações</h1>
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="documentacoes" />
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Documentação
          </button>
        </div>
      </div>

      {/* Alert para documentos vencendo */}
      {documentosVencendo.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-800">
              {documentosVencendo.length} documento(s) vencendo em breve
            </h3>
          </div>
          <div className="mt-2 text-sm text-yellow-700">
            {documentosVencendo.slice(0, 3).map(doc => (
              <div key={doc.id} className="flex justify-between">
                <span>{doc.titulo}</span>
                <span>Vence em: {formatDate(doc.data_validade)}</span>
              </div>
            ))}
            {documentosVencendo.length > 3 && (
              <span>... e mais {documentosVencendo.length - 3} documento(s)</span>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          
          {/* Filtro por cliente (apenas admin) */}
          {isAdmin && (
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : '')}
              className="input-field w-48"
            >
              <option value="">Todos os clientes</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.cpf_cnpj} - {cliente.nome}
                </option>
              ))}
            </select>
          )}

          {/* Filtro por status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-40"
          >
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="EXPIRADO">Expirado</option>
          </select>

          {/* Filtro por tipo */}
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="input-field w-64"
          >
            <option value="">Todos os tipos</option>
            <option value="IDENTIDADE_SOCIOS">Identidade dos Sócios</option>
            <option value="CERTIDAO_CASAMENTO">Certidão de Casamento</option>
            <option value="CARTAO_CNPJ">Cartão CNPJ</option>
            <option value="CCMEI_CONTRATO_SOCIAL">CCMEI / Contrato Social</option>
            <option value="INSCRICAO_ESTADUAL">Inscrição Estadual</option>
            <option value="INSCRICAO_MUNICIPAL">Inscrição Municipal</option>
            <option value="CERTIDAO_NEGATIVA_DEBITOS_ESTADUAIS">Certidão de Negativa de Débitos Estaduais</option>
            <option value="CERTIDAO_NEGATIVA_DEBITOS_MUNICIPAIS">Certidão de Negativa de Débitos Municipais</option>
            <option value="CERTIDAO_IMPROBIDADE_INELEGIBILIDADE">Certidão de Improbidade e Inelegibilidade</option>
            <option value="CERTIDAO_NEGATIVA_DEBITOS_FEDERAL">Certidão de Negativa de Débitos Federal</option>
            <option value="CERTIDAO_NEGATIVA_DEBITOS_TRABALHISTAS">Certidão de Negativa de Débitos Trabalhistas</option>
            <option value="CERTIDAO_NEGATIVA_DEBITO_FGTS">Certidão de Negativa de Débito FGTS (CRF)</option>
            <option value="CERTIDAO_FALENCIA_CONCORDATA">Certidão de Falência e Concordata</option>
            <option value="BALANCO_ABERTURA">Balanço Abertura (Registro na Junta Comercial)</option>
            <option value="BALANCO_PATRIMONIAL">Balanço Patrimonial</option>
            <option value="ALVARA">Alvará</option>
            <option value="ATESTADO_CAPACIDADE">Atestado de Capacidade</option>
            <option value="SICAF">Sicaf</option>
            <option value="REGISTRO_CADASTRO_ORGAO">Registro de Cadastro no Órgão</option>
            <option value="DRE">DRE</option>
            <option value="TERMO_AUTENTICACAO">Termo de Autenticação ou Registro do Cadastro pelo Órgão</option>
            <option value="NAO_INSCRICAO_CONTRIBUINTE_ESTADUAL">Não Inscrição em Contribuinte Estadual</option>
            <option value="OUTRO">Outro</option>
          </select>

          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar documentações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Botão atualizar datas de emissão */}
          <button
            onClick={handleAtualizarDatasEmissao}
            className="btn-secondary flex items-center gap-2"
            disabled={atualizarDatasEmissaoMutation.isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${atualizarDatasEmissaoMutation.isLoading ? 'animate-spin' : ''}`} />
            Atualizar Datas de Emissão
          </button>

          {/* Botão download habilitação */}
          <button
            onClick={handleDownloadHabilitacao}
            className="btn-primary flex items-center gap-2"
            title="Download de todos os documentos ativos em ZIP"
          >
            <Archive className="w-4 h-4" />
            Download Habilitação
          </button>

          {/* Botão mover atestados de capacidade */}
          <button
            onClick={handleMoverAtestadosCapacidade}
            className="btn-secondary flex items-center gap-2"
            disabled={moverAtestadosCapacidadeMutation.isLoading}
            title="Mover documentos de Atestado de Capacidade para pasta específica"
          >
            <RefreshCw className={`w-4 h-4 ${moverAtestadosCapacidadeMutation.isLoading ? 'animate-spin' : ''}`} />
            Mover Atestados
          </button>
        </div>
      </div>

      {/* Controles de visualização */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Ordenado por: {sortField}({sortDirection === 'asc' ? 'crescente' : 'decrescente'})
        </div>
        
        {/* Botões de alternância de visualização */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Visualização:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualização em tabela"
            >
              <List className="w-4 h-4" />
              Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualização em cards"
            >
              <Grid className="w-4 h-4" />
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Lista de documentações */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      ) : filteredAndSortedDocumentacoes.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma documentação encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter || tipoFilter
              ? 'Tente ajustar os filtros ou comece adicionando uma nova documentação.'
              : 'Comece adicionando sua primeira documentação.'}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            Mostrando {totalItems} documentos
            {viewMode === 'table' && (
              <span className="ml-4 text-xs text-blue-600">
                💡 Dica: Clique duas vezes em qualquer campo para editar inline
              </span>
            )}
          </div>
          
          {/* Visualização em Tabela */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[300px]"
                      onClick={() => handleSort('titulo')}
                    >
                      <div className="flex items-center gap-1">
                        Documento {getSortIcon('titulo')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status {getSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('data_emissao')}
                    >
                      <div className="flex items-center gap-1">
                        Emissão {getSortIcon('data_emissao')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('data_validade')}
                    >
                      <div className="flex items-center gap-1">
                        Validade {getSortIcon('data_validade')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('data_upload')}
                    >
                      <div className="flex items-center gap-1">
                        Upload {getSortIcon('data_upload')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedDocumentacoes.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          {editingCell?.id === doc.id && editingCell?.field === 'titulo' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleInlineSave}
                              onKeyDown={handleKeyPress}
                              className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div 
                              className="text-sm font-medium text-gray-900 break-words whitespace-pre-line cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onDoubleClick={() => handleDoubleClick(doc.id, 'titulo', doc.titulo || '')}
                            >
                              {quebrarTexto(doc.titulo, 50)}
                            </div>
                          )}
                          {editingCell?.id === doc.id && editingCell?.field === 'descricao' ? (
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleInlineSave}
                              onKeyDown={handleKeyPress}
                              className="text-sm text-gray-500 border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              autoFocus
                            />
                          ) : (
                            <div 
                              className="text-sm text-gray-500 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onDoubleClick={() => handleDoubleClick(doc.id, 'descricao', doc.descricao || '')}
                            >
                              {doc.descricao || 'Clique duas vezes para adicionar descrição'}
                            </div>
                          )}
                          {/* Dados extraídos do PDF */}
                          {doc.cnpj_extraido && (
                            <div className="text-xs text-blue-600 mt-1">
                              CNPJ: {doc.cnpj_extraido}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.id === doc.id && editingCell?.field === 'data_emissao' ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleInlineSave}
                              onKeyDown={handleKeyPress}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                            onDoubleClick={() => handleDoubleClick(doc.id, 'data_emissao', doc.data_emissao || '')}
                          >
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{formatDate(doc.data_emissao)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.id === doc.id && editingCell?.field === 'data_validade' ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleInlineSave}
                              onKeyDown={handleKeyPress}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                            onDoubleClick={() => handleDoubleClick(doc.id, 'data_validade', doc.data_validade || '')}
                          >
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{formatValidade(doc.data_validade)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.data_upload)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleShowDadosExtraidos(doc.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Ver dados extraídos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`/api/v1/documentacoes/${doc.id}/download`}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => {
                              setEditingDocumentacao(doc);
                              setShowForm(true);
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
          
          {/* Visualização em Cards */}
          {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedDocumentacoes.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="p-4">
                  {/* Header do card */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1" title={doc.titulo}>
                        {limitarTexto(doc.titulo, 20)}
                      </h3>
                      {doc.cnpj_extraido && (
                        <p className="text-xs text-blue-600">
                          CNPJ: {doc.cnpj_extraido}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getStatusColor(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                  </div>
                  
                  {/* Informações do documento */}
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Emissão: {formatDate(doc.data_emissao)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Validade: {formatValidade(doc.data_validade)}</span>
                    </div>
                    {doc.descricao && (
                      <div className="text-gray-500 line-clamp-2">
                        {doc.descricao}
                      </div>
                    )}
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleShowDadosExtraidos(doc.id)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Ver dados extraídos"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <a
                        href={`/api/v1/documentacoes/${doc.id}/download`}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDocumentacao(doc);
                          setShowForm(true);
                        }}
                        className="text-purple-600 hover:text-purple-900 p-1"
                        title="Editar"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Deletar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))} eu le 
          </div>
          )}
        </div>
      )}


      {/* Modal de formulário */}
      {showForm && (
        <DocumentacaoForm
          documentacao={editingDocumentacao}
          isAdmin={isAdmin}
          selectedClienteId={selectedClienteId}
          onClose={() => {
            setShowForm(false);
            setEditingDocumentacao(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingDocumentacao(null);
            queryClient.invalidateQueries('documentacoes');
          }}
        />
      )}

      {/* Modal de dados extraídos */}
      {showDadosExtraidos && dadosExtraidos && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dados Extraídos - {dadosExtraidos.titulo}
                </h3>
                <button
                  onClick={() => {
                    setShowDadosExtraidos(false);
                    setSelectedDocumentacaoId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Dados principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dadosExtraidos.cnpj_extraido && (
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-900">CNPJ/CPF</h4>
                      <p className="text-blue-700">{dadosExtraidos.cnpj_extraido}</p>
                    </div>
                  )}
                  
                  {dadosExtraidos.razao_social_extraida && (
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-medium text-green-900">Razão Social</h4>
                      <p className="text-green-700">{dadosExtraidos.razao_social_extraida}</p>
                    </div>
                  )}
                  
                  {dadosExtraidos.data_emissao_extraida && (
                    <div className="bg-yellow-50 p-3 rounded">
                      <h4 className="font-medium text-yellow-900">Data de Emissão</h4>
                      <p className="text-yellow-700">{dadosExtraidos.data_emissao_extraida}</p>
                    </div>
                  )}
                  
                  {dadosExtraidos.numero_documento_extraido && (
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium text-purple-900">Número do Documento</h4>
                      <p className="text-purple-700">{dadosExtraidos.numero_documento_extraido}</p>
                    </div>
                  )}
                </div>
                
                {/* Dados estruturados */}
                {dadosExtraidos.dados_extraidos && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Dados Estruturados</h4>
                    <div className="text-sm text-gray-700">
                      <pre className="whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(dadosExtraidos.dados_extraidos, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  );
};

// Componente de formulário
interface DocumentacaoFormProps {
  documentacao?: any;
  isAdmin: boolean | undefined;
  selectedClienteId: number | '';
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentacaoForm: React.FC<DocumentacaoFormProps> = ({ documentacao, isAdmin, selectedClienteId, onClose, onSuccess }) => {
  // Documentos que não têm extração automática de validade
  const DOCUMENTOS_SEM_EXTRACAO_VALIDADE = [
    "CARTAO_CNPJ", 
    "CCMEI_CONTRATO_SOCIAL", 
    "IDENTIDADE_SOCIOS",
    "INSCRICAO_ESTADUAL",
    "INSCRICAO_MUNICIPAL", 
    "CERTIDAO_CASAMENTO",
    "REGISTRO_CADASTRO_ORGAO",
    "NAO_INSCRICAO_CONTRIBUINTE_ESTADUAL",
    "BALANCO",
    "BALANCO_ABERTURA",
    "BALANCO_PATRIMONIAL"
  ];
  
  // Documentos que realmente não têm validade (sempre ativos)
  const DOCUMENTOS_SEM_VALIDADE = [
    "CARTAO_CNPJ", 
    "CCMEI_CONTRATO_SOCIAL", 
    "INSCRICAO_ESTADUAL",
    "INSCRICAO_MUNICIPAL", 
    "REGISTRO_CADASTRO_ORGAO",
    "NAO_INSCRICAO_CONTRIBUINTE_ESTADUAL"
  ];

  const [formData, setFormData] = useState({
    titulo: documentacao?.titulo || '',
    descricao: documentacao?.descricao || '',
    data_validade: documentacao?.data_validade ? new Date(documentacao.data_validade).toISOString().split('T')[0] : '',
    data_emissao: documentacao?.data_emissao ? new Date(documentacao.data_emissao).toISOString().split('T')[0] : '',
    tipo_documento: documentacao?.tipo_documento || '',
  });

  // Função para calcular validade do Sicaf (45 dias após emissão)
  const calcularValidadeSicaf = (dataEmissao: string) => {
    if (!dataEmissao) return '';
    
    const data = new Date(dataEmissao);
    data.setDate(data.getDate() + 45); // Adiciona 45 dias
    return data.toISOString().split('T')[0];
  };

  // Função para calcular validade do Balanço (31 de dezembro do ano da emissão)
  const calcularValidadeBalanco = (dataEmissao: string) => {
    if (!dataEmissao) return '';
    
    const data = new Date(dataEmissao);
    const ano = data.getFullYear();
    return `${ano}-12-31`; // 31 de dezembro do ano da emissão
  };

  // Atualizar validade automaticamente quando emissão for alterada
  const handleDataEmissaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaDataEmissao = e.target.value;
    setFormData(prev => ({
      ...prev,
      data_emissao: novaDataEmissao,
      // Se for Sicaf e tiver data de emissão, calcular validade automaticamente
      data_validade: formData.tipo_documento === 'SICAF' && novaDataEmissao 
        ? calcularValidadeSicaf(novaDataEmissao) 
        : ['BALANCO', 'BALANCO_ABERTURA', 'BALANCO_PATRIMONIAL'].includes(formData.tipo_documento) && novaDataEmissao
        ? calcularValidadeBalanco(novaDataEmissao)
        : prev.data_validade
    }));
  };

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation(
    (data: any) => documentacaoService.create(data),
    {
      onSuccess: () => {
        toast.success('Documentação criada com sucesso');
        onSuccess();
      },
      onError: () => {
        toast.error('Erro ao criar documentação');
      }
    }
  );

  const updateMutation = useMutation(
    (data: any) => documentacaoService.update(documentacao.id, data),
    {
      onSuccess: () => {
        toast.success('Documentação atualizada com sucesso');
        onSuccess();
      },
      onError: () => {
        toast.error('Erro ao atualizar documentação');
      }
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (documentacao) {
        // Atualizar - converter strings de data para objetos Date
        const updateData = {
          ...formData,
          data_emissao: formData.data_emissao ? new Date(formData.data_emissao) : undefined,
          data_validade: formData.data_validade ? new Date(formData.data_validade) : undefined
        };
        await updateMutation.mutateAsync(updateData);
      } else {
        // Criar
        if (!arquivo) {
          toast.error('Selecione um arquivo PDF');
          setIsSubmitting(false);
          return;
        }
        
        // Verificar se um cliente foi selecionado (apenas para admin)
        if (isAdmin && !selectedClienteId) {
          toast.error('Selecione um cliente para associar a documentação');
          setIsSubmitting(false);
          return;
        }


        
        // Preparar dados para envio
        const dataToSend: any = {
          tipo_documento: formData.tipo_documento,
          arquivo: arquivo
        };
        
        // Só envia o título se foi preenchido
        if (formData.titulo && formData.titulo.trim() !== '') {
          dataToSend.titulo = formData.titulo;
        }
        if (formData.descricao) {
          dataToSend.descricao = formData.descricao;
        }
        
        // Adicionar data de emissão se fornecida
        if (formData.data_emissao) {
          dataToSend.data_emissao = formData.data_emissao;
        }
        
        // Enviar data de validade se fornecida (permitir para documentos de identidade)
        if (formData.data_validade) {
          dataToSend.data_validade = formData.data_validade;
        }
        
        // Adicionar cliente_id se for admin e tiver um cliente selecionado
        if (isAdmin && selectedClienteId) {
          dataToSend.cliente_id = selectedClienteId.toString();
        }



        await createMutation.mutateAsync(dataToSend);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {documentacao ? 'Editar' : 'Nova'} Documentação
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Título <span className="text-gray-500 text-xs">(será preenchido automaticamente com o nome do arquivo)</span>
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="input-field"
                placeholder="Será preenchido automaticamente quando selecionar o arquivo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="input-field"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Emissão</label>
              <input
                type="date"
                value={formData.data_emissao}
                onChange={handleDataEmissaoChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Validade</label>
              <input
                type="date"
                value={formData.data_validade}
                onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                className="input-field"
              />
            </div>

            {/* Mensagem informativa para documentos com extração automática */}
            {!DOCUMENTOS_SEM_EXTRACAO_VALIDADE.includes(formData.tipo_documento) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>🔍 Extração Automática:</strong> A data de emissão e validade serão extraídas automaticamente do PDF.
                </p>
              </div>
            )}

            {/* Mensagem informativa para documentos com extração manual */}
            {DOCUMENTOS_SEM_EXTRACAO_VALIDADE.includes(formData.tipo_documento) && !DOCUMENTOS_SEM_VALIDADE.includes(formData.tipo_documento) && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <p className="text-sm text-orange-800">
                  <strong>📝 Nota:</strong> Para este tipo de documento, você pode preencher a data de validade manualmente. 
                  A extração automática não está disponível.
                </p>
              </div>
            )}

            {/* Mensagem informativa específica para Sicaf */}
            {formData.tipo_documento === 'SICAF' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>🔍 Sicaf:</strong> A data de emissão será extraída automaticamente do PDF. 
                  A validade será calculada automaticamente como 45 dias após a emissão.
                </p>
              </div>
            )}

            {/* Mensagem informativa específica para Balanços */}
            {['BALANCO', 'BALANCO_ABERTURA', 'BALANCO_PATRIMONIAL'].includes(formData.tipo_documento) && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>📊 Balanço:</strong> A data de emissão será extraída automaticamente do PDF. 
                  A validade será calculada automaticamente como 31 de dezembro do ano da emissão.
                </p>
              </div>
            )}

            {/* Mensagem informativa para admin sobre seleção de cliente */}
            {isAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Importante:</strong> Certifique-se de que o cliente correto está selecionado no filtro acima. 
                  A documentação será associada ao cliente selecionado.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Documento</label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Selecione um tipo</option>
                <option value="IDENTIDADE_SOCIOS">Identidade dos Sócios</option>
                <option value="CERTIDAO_CASAMENTO">Certidão de Casamento</option>
                <option value="CARTAO_CNPJ">Cartão CNPJ</option>
                <option value="CCMEI_CONTRATO_SOCIAL">CCMEI / Contrato Social</option>
                <option value="INSCRICAO_ESTADUAL">Inscrição Estadual</option>
                <option value="INSCRICAO_MUNICIPAL">Inscrição Municipal</option>
                <option value="CERTIDAO_NEGATIVA_DEBITOS_ESTADUAIS">Certidão de Negativa de Débitos Estaduais</option>
                <option value="CERTIDAO_NEGATIVA_DEBITOS_MUNICIPAIS">Certidão de Negativa de Débitos Municipais</option>
                <option value="CERTIDAO_IMPROBIDADE_INELEGIBILIDADE">Certidão de Improbidade e Inelegibilidade</option>
                <option value="CERTIDAO_NEGATIVA_DEBITOS_FEDERAL">Certidão de Negativa de Débitos Federal</option>
                <option value="CERTIDAO_NEGATIVA_DEBITOS_TRABALHISTAS">Certidão de Negativa de Débitos Trabalhistas</option>
                <option value="CERTIDAO_NEGATIVA_DEBITO_FGTS">Certidão de Negativa de Débito FGTS (CRF)</option>
                <option value="CERTIDAO_FALENCIA_CONCORDATA">Certidão de Falência e Concordata</option>
                <option value="BALANCO_ABERTURA">Balanço Abertura (Registro na Junta Comercial)</option>
                <option value="BALANCO_PATRIMONIAL">Balanço Patrimonial</option>
                <option value="ALVARA">Alvará</option>
                <option value="ATESTADO_CAPACIDADE">Atestado de Capacidade</option>
                <option value="SICAF">Sicaf</option>
                <option value="REGISTRO_CADASTRO_ORGAO">Registro de Cadastro no Órgão</option>
                <option value="DRE">DRE</option>
                <option value="TERMO_AUTENTICACAO">Termo de Autenticação ou Registro do Cadastro pelo Órgão</option>
                <option value="NAO_INSCRICAO_CONTRIBUINTE_ESTADUAL">Não Inscrição em Contribuinte Estadual</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            {!documentacao && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Arquivo PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setArquivo(file);
                    
                    // Se um arquivo foi selecionado e o título está vazio, usar o nome do arquivo
                    if (file && !formData.titulo.trim()) {
                      const fileName = file.name.replace(/\.pdf$/i, ''); // Remove a extensão .pdf
                      setFormData(prev => ({
                        ...prev,
                        titulo: fileName
                      }));
                    }
                  }}
                  className="input-field"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : (documentacao ? 'Atualizar' : 'Criar')}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

export default Documentacoes;
