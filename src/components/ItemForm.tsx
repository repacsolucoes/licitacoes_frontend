import React, { useState, useEffect } from 'react';
import { ItemLicitacao } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface ItemFormProps {
  item?: ItemLicitacao;
  onSave: (item: Omit<ItemLicitacao, 'id' | 'licitacao_id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
  nextCodigo?: number;
}

const ItemForm: React.FC<ItemFormProps> = ({ 
  item, 
  onSave, 
  onCancel, 
  onDelete, 
  isEditing = false,
  nextCodigo = 1
}) => {
  const [formData, setFormData] = useState({
    codigo_item: '',
    descricao: '',
    unidade_medida: 'UN',
    quantidade: '',
    preco_unitario: '',
    preco_total: '',
    custo_unitario: '',
    custo_total: '',
    marca_modelo: '',
    especificacoes_tecnicas: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preencher formulário se for edição
  useEffect(() => {
    if (item) {
      setFormData({
        codigo_item: item.codigo_item,
        descricao: item.descricao,
        unidade_medida: item.unidade_medida,
        quantidade: item.quantidade.toString(),
        preco_unitario: item.preco_unitario.toString(),
        preco_total: item.preco_total.toString(),
        custo_unitario: (item as any).custo_unitario?.toString() || '',
        custo_total: (item as any).custo_total?.toString() || '',
        marca_modelo: item.marca_modelo || '',
        especificacoes_tecnicas: item.especificacoes_tecnicas || '',
        observacoes: item.observacoes || ''
      });
    } else {
      // Gerar código automático para novo item
      const codigo = nextCodigo.toString().padStart(3, '0');
      setFormData(prev => ({ ...prev, codigo_item: codigo }));
    }
  }, [item, nextCodigo]);

  // Calcular preço total e custo total automaticamente
  useEffect(() => {
    const quantidade = parseFloat(formData.quantidade) || 0;
    const precoUnitario = parseFloat(formData.preco_unitario) || 0;
    const custoUnitario = parseFloat(formData.custo_unitario) || 0;
    
    // Calcular preço total
    if (quantidade > 0 && precoUnitario > 0) {
      const precoTotal = quantidade * precoUnitario;
      setFormData(prev => ({ ...prev, preco_total: precoTotal.toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, preco_total: '' }));
    }
    
    // Calcular custo total
    if (quantidade > 0 && custoUnitario > 0) {
      const custoTotal = quantidade * custoUnitario;
      setFormData(prev => ({ ...prev, custo_total: custoTotal.toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, custo_total: '' }));
    }
  }, [formData.quantidade, formData.preco_unitario, formData.custo_unitario]);

  // Fechar formulário com tecla ESC
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

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.quantidade.trim()) {
      newErrors.quantidade = 'Quantidade é obrigatória';
    } else if (parseFloat(formData.quantidade) <= 0) {
      newErrors.quantidade = 'Quantidade deve ser maior que zero';
    }

    if (!formData.preco_unitario.trim()) {
      newErrors.preco_unitario = 'Preço unitário é obrigatório';
    } else if (parseFloat(formData.preco_unitario) <= 0) {
      newErrors.preco_unitario = 'Preço unitário deve ser maior que zero';
    }

    // Custo unitário é opcional, mas se preenchido deve ser >= 0
    if (formData.custo_unitario.trim() && parseFloat(formData.custo_unitario) < 0) {
      newErrors.custo_unitario = 'Custo unitário não pode ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const itemData = {
        ...formData,
        quantidade: parseFloat(formData.quantidade),
        preco_unitario: parseFloat(formData.preco_unitario),
        preco_total: parseFloat(formData.preco_total),
        custo_unitario: parseFloat(formData.custo_unitario),
        custo_total: parseFloat(formData.custo_total)
      };
      
      onSave(itemData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Editar Item' : 'Novo Item'}
        </h3>
        <div className="flex gap-2">
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir item"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
            title="Cancelar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código do Item - AUTOMÁTICO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código do Item
            </label>
            <input
              type="text"
              value={formData.codigo_item}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium"
            />
            <p className="mt-1 text-xs text-gray-500">Gerado automaticamente</p>
          </div>

          {/* Unidade de Medida - FIXA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade de Medida
            </label>
            <input
              type="text"
              value="UN (Unidade)"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">Sempre UN (Unidade)</p>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição *
          </label>
          <textarea
            value={formData.descricao}
            onChange={(e) => handleInputChange('descricao', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.descricao ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Descrição detalhada do produto ou serviço"
          />
          {errors.descricao && (
            <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantidade}
              onChange={(e) => handleInputChange('quantidade', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.quantidade ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Digite a quantidade"
            />
            {errors.quantidade && (
              <p className="mt-1 text-sm text-red-600">{errors.quantidade}</p>
            )}
          </div>

          {/* Preço Unitário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço Unitário *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">R$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.preco_unitario}
                onChange={(e) => handleInputChange('preco_unitario', e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.preco_unitario ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
            </div>
            {errors.preco_unitario && (
              <p className="mt-1 text-sm text-red-600">{errors.preco_unitario}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Custo Unitário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custo Unitário *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">R$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.custo_unitario}
                onChange={(e) => handleInputChange('custo_unitario', e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.custo_unitario ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
            </div>
            {errors.custo_unitario && (
              <p className="mt-1 text-sm text-red-600">{errors.custo_unitario}</p>
            )}
          </div>

          {/* Preço Total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço Total
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">R$</span>
              <input
                type="text"
                value={formData.preco_total}
                disabled
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                placeholder="0,00"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Calculado automaticamente</p>
          </div>
        </div>

        {/* Custo Total */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custo Total
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">R$</span>
            <input
              type="text"
              value={formData.custo_total}
              disabled
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              placeholder="0,00"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Calculado automaticamente</p>
        </div>

        {/* Marca/Modelo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca/Modelo
          </label>
          <input
            type="text"
            value={formData.marca_modelo}
            onChange={(e) => handleInputChange('marca_modelo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Samsung, HP, etc."
          />
        </div>

        {/* Especificações Técnicas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Especificações Técnicas
          </label>
          <textarea
            value={formData.especificacoes_tecnicas}
            onChange={(e) => handleInputChange('especificacoes_tecnicas', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Especificações técnicas detalhadas"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Observações adicionais sobre o item"
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            {isEditing ? 'Atualizar' : 'Adicionar'} Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
