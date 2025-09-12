import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { clienteService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import ClienteForm from '../components/ClienteForm';
import { Cliente } from '../types';
import Pagination from '../components/Pagination';

const Clientes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['clientes']);
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { data: clientesData, isLoading } = useQuery(
    ['clientes', searchTerm, currentPage, itemsPerPage],
    () => clienteService.list({
      search: searchTerm || undefined,
      page: currentPage,
      limit: itemsPerPage
    })
  );

  // Extrair dados da resposta paginada
  // Verificar se é uma resposta paginada ou array direto
  let clientes = [];
  let totalItems = 0;
  let totalPages = 1;
  
  if (clientesData) {
    if (Array.isArray(clientesData)) {
      // Resposta é um array direto
      clientes = clientesData;
      totalItems = clientesData.length;
      totalPages = 1;
    } else if (clientesData.data && Array.isArray(clientesData.data)) {
      // Resposta é paginada
      clientes = clientesData.data;
      totalItems = clientesData.total || clientesData.data.length;
      totalPages = clientesData.total_pages || 1;
    }
  }

  const deleteMutation = useMutation(
    (id: number) => clienteService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('clientes');
        toast.success('Cliente deletado com sucesso!');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Erro ao deletar cliente';
        toast.error(message);
      },
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar este cliente?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCliente(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCliente(null);
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
  }, [searchTerm]);

  const formatCPFCNPJ = (cpfCnpj: string) => {
    if (cpfCnpj.length === 11) {
      return cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cpfCnpj.length === 14) {
      return cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cpfCnpj;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? 'Clientes' : 'Dados da Empresa'}
        </h1>
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="clientes" />
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder={isAdmin ? "Buscar clientes..." : "Buscar dados da empresa..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientes.map((cliente) => (
          <div key={cliente.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                  <p className="text-sm text-gray-500">{formatCPFCNPJ(cliente.cpf_cnpj)}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(cliente)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(cliente.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Deletar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              {cliente.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {cliente.email}
                </div>
              )}
              {cliente.telefone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {cliente.telefone}
                </div>
              )}
              {cliente.endereco && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {cliente.endereco}
                </div>
              )}
              {cliente.imposto_cliente && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-600 font-medium mr-2">💰</span>
                  Imposto: {cliente.imposto_cliente}%
                </div>
              )}
              
              {/* Botão de edição mais visível */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(cliente)}
                  className="w-full btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar Dados da Empresa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clientes.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isAdmin ? 'Nenhum cliente encontrado' : 'Dados da empresa não encontrados'}
          </h3>
          <p className="text-gray-500">
            {searchTerm 
              ? (isAdmin 
                  ? 'Tente ajustar a busca ou comece adicionando um novo cliente.'
                  : 'Tente ajustar a busca.'
                )
              : (isAdmin 
                  ? 'Comece adicionando seu primeiro cliente.'
                  : 'Entre em contato com o administrador para configurar os dados da empresa.'
                )
            }
          </p>
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

      {/* Modal de formulário */}
      {showForm && (
        <ClienteForm
          cliente={editingCliente || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default Clientes;
