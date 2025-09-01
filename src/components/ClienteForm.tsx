import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { clienteService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Cliente } from '../types';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClienteFormProps {
  cliente?: Cliente;
  onClose: () => void;
  onSuccess: () => void;
}

const ClienteForm: React.FC<ClienteFormProps> = ({ cliente, onClose, onSuccess }) => {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    cpf_cnpj: '',
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
    imposto_cliente: 6.0
  });

  const queryClient = useQueryClient();

  // Preencher formulário se for edição
  useEffect(() => {
    if (cliente) {
      setFormData({
        cpf_cnpj: cliente.cpf_cnpj,
        nome: cliente.nome,
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        endereco: cliente.endereco || '',
        imposto_cliente: cliente.imposto_cliente || 6.0
      });
    }
  }, [cliente]);

  const createMutation = useMutation(
    (data: any) => clienteService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('clientes');
        toast.success(isAdmin ? 'Cliente criado com sucesso!' : 'Dados da empresa criados com sucesso!');
        onSuccess();
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Erro ao criar cliente';
        toast.error(message);
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => clienteService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('clientes');
        toast.success('Cliente atualizado com sucesso!');
        onSuccess();
      },
      onError: (error: any) => {
        const message = error.response?.data?.detail || 'Erro ao atualizar cliente';
        toast.error(message);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      email: formData.email || undefined,
      telefone: formData.telefone || undefined,
      endereco: formData.endereco || undefined
    };

    if (cliente) {
      updateMutation.mutate({ id: cliente.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'imposto_cliente' ? parseFloat(value) || 0 : value
    }));
  };

  const formatCPFCNPJ = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      // Formata CPF
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // Formata CNPJ
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleCPFCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formatted = formatCPFCNPJ(value);
    setFormData(prev => ({
      ...prev,
      cpf_cnpj: formatted
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Formata telefone: (11) 99999-9999
    const numbers = value.replace(/\D/g, '');
    let formatted = numbers;
    
    if (numbers.length >= 2) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    if (numbers.length >= 7) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
    
    setFormData(prev => ({
      ...prev,
      telefone: formatted
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold">
                  {cliente 
                    ? (isAdmin ? 'Editar Cliente' : 'Editar Dados da Empresa')
                    : (isAdmin ? 'Novo Cliente' : 'Nova Empresa')
                  }
                </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CPF/CNPJ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF/CNPJ *
            </label>
            <input
              type="text"
              name="cpf_cnpj"
              value={formData.cpf_cnpj}
              onChange={handleCPFCNPJChange}
              required
              className="input-field"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
            />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome/Razão Social *
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              required
              className="input-field"
              placeholder="Nome completo ou razão social"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
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
              name="telefone"
              value={formData.telefone}
              onChange={handlePhoneChange}
              className="input-field"
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <textarea
              name="endereco"
              value={formData.endereco}
              onChange={handleInputChange}
              rows={3}
              className="input-field"
              placeholder="Endereço completo"
            />
          </div>

          {/* Imposto do Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imposto do Cliente (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                name="imposto_cliente"
                value={formData.imposto_cliente}
                onChange={handleInputChange}
                className="input-field pr-8"
                placeholder="6.00"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Percentual de imposto específico deste cliente para cálculos de licitações
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
                : cliente
                ? 'Atualizar'
                : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClienteForm;
