import React, { useState, useEffect } from 'react';
import { ItemLicitacao } from '../types';
import { X, Plus, Save, FolderOpen } from 'lucide-react';
import ItemForm from './ItemForm';
import ItemsTable from './ItemsTable';
import ItemDetailModal from './ItemDetailModal';

interface GrupoFormProps {
  grupo?: {id: number, nome: string, posicao?: string, itens: ItemLicitacao[]} | null;
  onSave: (grupo: {id: number, nome: string, posicao?: string, itens: ItemLicitacao[]}) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const GrupoForm: React.FC<GrupoFormProps> = ({ grupo, onSave, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    nome: grupo?.nome || '',
    posicao: grupo?.posicao || '',
    itens: grupo?.itens || []
  });
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemLicitacao | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemLicitacao | null>(null);
  const [errors, setFormErrors] = useState<Record<string, string>>({});

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onCancel]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome do grupo é obrigatório';
    }

    if (formData.itens.length === 0) {
      newErrors.itens = 'Pelo menos um item é obrigatório no grupo';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = (item: Omit<ItemLicitacao, 'id' | 'licitacao_id' | 'created_at' | 'updated_at'>) => {
    const newItem: ItemLicitacao = {
      ...item,
      id: Date.now(),
      licitacao_id: 0,
      created_at: new Date().toISOString()
    };

    if (editingItem) {
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.map(i => i.id === editingItem.id ? newItem : i)
      }));
      setEditingItem(null);
    } else {
      setFormData(prev => ({
        ...prev,
        itens: [...prev.itens, newItem]
      }));
    }

    setShowItemForm(false);
  };

  const handleEditItem = (item: ItemLicitacao) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = (itemId: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }));
  };

  const handleViewItem = (item: ItemLicitacao) => {
    setViewingItem(item);
  };

  const handleCancelItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const grupoData = {
      id: grupo?.id || Date.now(),
      nome: formData.nome,
      itens: formData.itens
    };

    onSave(grupoData);
    
    // Limpar o formulário após salvar, mas não fechar o modal
    if (!isEditing) {
      setFormData({
        nome: '',
        posicao: '',
        itens: []
      });
      // Manter o modal aberto para criar mais grupos se necessário
    } else {
      // Se estiver editando, fechar o modal após salvar
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FolderOpen size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <p className="text-gray-600 text-sm">
                {isEditing ? 'Edite as informações do grupo' : 'Crie um novo grupo de itens'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Nome do Grupo */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Grupo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.nome ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Grupo A - Equipamentos de TI"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posição do Grupo
                </label>
                <input
                  type="text"
                  value={formData.posicao}
                  onChange={(e) => setFormData(prev => ({ ...prev, posicao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 1º, 2º, 3º grupo"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Posição na ordem de avaliação da licitação
                </p>
              </div>
            </div>
          </div>

          {/* Itens do Grupo */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Itens do Grupo ({formData.itens.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowItemForm(true)}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Adicionar Item
              </button>
            </div>

            {errors.itens && (
              <p className="text-sm text-red-600 mb-4">{errors.itens}</p>
            )}

            {/* Formulário de Item */}
            {showItemForm && (
              <ItemForm
                item={editingItem || undefined}
                onSave={handleAddItem}
                onCancel={handleCancelItemForm}
                isEditing={!!editingItem}
                nextCodigo={formData.itens.length + 1}
              />
            )}

            {/* Tabela de Itens */}
            {formData.itens.length > 0 ? (
              <ItemsTable
                items={formData.itens}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onView={handleViewItem}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhum item adicionado ao grupo ainda.</p>
                <p className="text-sm">Clique em "Adicionar Item" para começar.</p>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {isEditing ? 'Atualizar Grupo' : 'Criar Grupo'}
            </button>
          </div>
        </div>
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

export default GrupoForm;
