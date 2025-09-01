import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { userService, clienteService } from '../services/api';
import { User, Cliente } from '../types';
import { X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserFormProps {
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  email: string;
  username: string;
  full_name: string;
  password: string;
  is_active: boolean;
  is_admin: boolean;
  cliente_id: string;
  // Campos do cliente para criação automática
  cliente_cpf_cnpj: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  cliente_endereco: string;
}

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    full_name: '',
    password: '',
    is_active: true,
    is_admin: false,
    cliente_id: '',
    cliente_cpf_cnpj: '',
    cliente_nome: '',
    cliente_email: '',
    cliente_telefone: '',
    cliente_endereco: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  // Buscar clientes para seleção (apenas para edição ou admin)
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list(),
    {
      enabled: !!user || formData.is_admin // Só busca clientes se for edição ou se for admin
    }
  );

  // Preencher formulário se for edição
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        password: '', // Não preenche senha na edição
        is_active: user.is_active,
        is_admin: user.is_admin,
        cliente_id: user.cliente_id?.toString() || '',
        cliente_cpf_cnpj: '',
        cliente_nome: '',
        cliente_email: '',
        cliente_telefone: '',
        cliente_endereco: ''
      });
    }
  }, [user]);

  // Atualizar nome do cliente automaticamente baseado no nome do usuário
  useEffect(() => {
    if (!user && !formData.is_admin && formData.full_name) {
      setFormData(prev => ({
        ...prev,
        cliente_nome: formData.full_name
      }));
    }
  }, [formData.full_name, user]);

  // Atualizar email do cliente automaticamente baseado no email do usuário
  useEffect(() => {
    if (!user && !formData.is_admin && formData.email) {
      setFormData(prev => ({
        ...prev,
        cliente_email: formData.email
      }));
    }
  }, [formData.email, user]);

  const createMutation = useMutation(
    (data: any) => userService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('clientes'); // Invalida também clientes pois pode ter criado um novo
        toast.success('Usuário criado com sucesso!');
        onSuccess();
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Erro ao criar usuário';
        toast.error(message);
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => userService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries('clientes');
        toast.success('Usuário atualizado com sucesso!');
        onSuccess();
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Erro ao atualizar usuário';
        toast.error(message);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      ...formData,
      cliente_id: formData.cliente_id ? Number(formData.cliente_id) : null,
      password: formData.password || undefined // Só envia senha se foi preenchida
    };

    // Remove campos vazios para edição
    if (user) {
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === undefined) {
          delete submitData[key];
        }
      });
    } else {
      // Para criação, remove campos vazios do cliente se não for admin
      if (!formData.is_admin) {
        const clienteFields = ['cliente_cpf_cnpj', 'cliente_email', 'cliente_telefone', 'cliente_endereco'];
        clienteFields.forEach(field => {
          if (submitData[field] === '') {
            delete submitData[field];
          }
        });
      }
    }

    if (user) {
      updateMutation.mutate({ id: user.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Função para formatar CPF/CNPJ
  const formatCPFCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handleCPFCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPFCNPJ(e.target.value);
    setFormData(prev => ({
      ...prev,
      cliente_cpf_cnpj: formatted
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({
      ...prev,
      cliente_telefone: formatted
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção de Dados do Usuário */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Usuário</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="email@exemplo.com"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="nome_usuario"
                />
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Nome completo do usuário"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {user ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!user}
                    className="input-field pr-10"
                    placeholder={user ? 'Nova senha (opcional)' : 'Senha'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cliente (apenas se for admin ou edição) */}
          {(formData.is_admin || user) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cliente Existente</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleInputChange}
                  className="input-field"
                  disabled={formData.is_admin}
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clientes.map((cliente: Cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco se for administrador
                </p>
              </div>
            </div>
          )}

          {/* Seção de Dados do Cliente (apenas para criação de usuário não-admin) */}
          {!user && !formData.is_admin && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Cliente</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Um cliente será criado automaticamente para este usuário com os dados abaixo.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CPF/CNPJ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    name="cliente_cpf_cnpj"
                    value={formData.cliente_cpf_cnpj}
                    onChange={handleCPFCNPJChange}
                    className="input-field"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                {/* Nome/Razão Social */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome/Razão Social *
                  </label>
                  <input
                    type="text"
                    name="cliente_nome"
                    value={formData.cliente_nome}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Nome ou razão social"
                  />
                </div>

                {/* Email do Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email do Cliente
                  </label>
                  <input
                    type="email"
                    name="cliente_email"
                    value={formData.cliente_email}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="email@exemplo.com"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="cliente_telefone"
                    value={formData.cliente_telefone}
                    onChange={handlePhoneChange}
                    className="input-field"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <textarea
                  name="cliente_endereco"
                  value={formData.cliente_endereco}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Endereço completo"
                />
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Usuário Ativo
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_admin"
                checked={formData.is_admin}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Administrador
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="btn-primary"
            >
              {createMutation.isLoading || updateMutation.isLoading
                ? 'Salvando...'
                : user
                ? 'Atualizar'
                : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
