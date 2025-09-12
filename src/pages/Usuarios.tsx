import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userService } from '../services/api';
import { RefreshButton } from '../components/RefreshButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Mail,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserForm from '../components/UserForm';
import { User as UserType } from '../types';
import Pagination from '../components/Pagination';

const Usuarios: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auto-refresh quando a página é carregada
  useAutoRefresh(['users']);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const queryClient = useQueryClient();
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { data: usersData, isLoading } = useQuery(
    ['users', searchTerm, currentPage, itemsPerPage],
    () => userService.list({
      search: searchTerm || undefined,
      page: currentPage,
      limit: itemsPerPage
    })
  );

  // Extrair dados da resposta paginada
  // Verificar se é uma resposta paginada ou array direto
  let users = [];
  let totalItems = 0;
  let totalPages = 1;
  
  if (usersData) {
    if (Array.isArray(usersData)) {
      // Resposta é um array direto
      users = usersData;
      totalItems = usersData.length;
      totalPages = 1;
    } else if (usersData.data && Array.isArray(usersData.data)) {
      // Resposta é paginada
      users = usersData.data;
      totalItems = usersData.total || usersData.data.length;
      totalPages = usersData.total_pages || 1;
    }
  }

  const deleteMutation = useMutation(
    (id: number) => userService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('Usuário deletado com sucesso!');
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Erro ao deletar usuário';
        toast.error(message);
      },
    }
  );

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
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
  }, [searchTerm]);

  // Filtros agora são aplicados no backend, não precisamos mais de filtro local

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
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <div className="flex items-center gap-4">
          <RefreshButton refreshType="users" />
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Lista de usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(user)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                {user.email}
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2" />
                <span className={user.is_admin ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                  {user.is_admin ? 'Administrador' : 'Usuário'}
                </span>
              </div>
              
              <div className="flex items-center text-sm">
                {user.is_active ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-green-600 font-medium">Ativo</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-red-600 font-medium">Inativo</span>
                  </>
                )}
              </div>
              
              {user.cliente_id && (
                <div className="text-xs text-gray-500">
                  Cliente ID: {user.cliente_id}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? 'Tente ajustar a busca ou comece adicionando um novo usuário.'
              : 'Comece adicionando seu primeiro usuário.'
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
        <UserForm
          user={editingUser || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default Usuarios;
