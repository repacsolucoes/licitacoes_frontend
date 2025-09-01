import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { licitacaoService, clienteService } from '../services/api';
import { Licitacao, Cliente } from '../types';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface LicitacaoFormProps {
  licitacao?: Licitacao;
  onClose: () => void;
  onSuccess: () => void;
}

const LicitacaoForm: React.FC<LicitacaoFormProps> = ({ licitacao, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    descricao: '',
    uasg: '',
    tipo_licitacao: 'Dispensa Eletrônica',
    numero: '',
    posicao: '',
    data_licitacao: '',
    custo: 0,
    preco_inicial: 0,
    preco_final: 0,
    margem_percentual: 0,
    imposto: 0,
    imposto_nota: 0,
    margem_dinheiro: 0,
    portal: 'COMPRAS NET',
    status: 'AGUARDANDO',
    observacoes: '',
    cliente_id: 0
  });

  const queryClient = useQueryClient();

  // Função para corrigir problema de fuso horário nas datas
  const corrigirDataFusoHorario = (dataString: string): string => {
    if (!dataString) return '';
    
    // Se a data já está no formato YYYY-MM-DD, retorna como está
    if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dataString;
    }
    
    // Se tem 'T' (formato ISO), extrai apenas a parte da data
    if (dataString.includes('T')) {
      return dataString.split('T')[0];
    }
    
    return dataString;
  };

  // Buscar clientes disponíveis
  const { data: clientes = [] } = useQuery(
    'clientes',
    () => clienteService.list()
  );

  // Preencher formulário se for edição
  useEffect(() => {
    if (licitacao) {
      const precoInicial = licitacao.preco_inicial;
      const precoFinal = licitacao.preco_final;
      
      setFormData({
        descricao: licitacao.descricao,
        uasg: licitacao.uasg,
        tipo_licitacao: licitacao.tipo_licitacao,
        numero: licitacao.numero,
        posicao: licitacao.posicao || '',
        data_licitacao: corrigirDataFusoHorario(licitacao.data_licitacao || ''),
        custo: licitacao.custo,
        preco_inicial: precoInicial,
        preco_final: precoFinal,
        margem_percentual: licitacao.custo > 0 && precoFinal > 0 ? Number(calcularMargemPercentual(licitacao.custo, precoFinal).toFixed(2)) : 0,
        imposto: precoFinal > 0 ? Number(calcularImposto(precoFinal).toFixed(2)) : 0,
        imposto_nota: precoFinal > 0 ? Number(calcularImpostoNota(precoFinal).toFixed(2)) : 0,
        margem_dinheiro: licitacao.custo > 0 && precoFinal > 0 ? Number(calcularMargemDinheiro(licitacao.custo, precoFinal).toFixed(2)) : 0,
        portal: licitacao.portal,
        status: licitacao.status,
        observacoes: licitacao.observacoes || '',
        cliente_id: licitacao.cliente_id
      });
    }
  }, [licitacao]);

  // Recalcular valores quando custo, preço final ou cliente mudarem
  useEffect(() => {
    const custo = Number(formData.custo);
    const precoFinal = Number(formData.preco_final);
    
    if (custo > 0 && precoFinal > 0) {
      setFormData(prev => ({
        ...prev,
        margem_percentual: Number(calcularMargemPercentual(custo, precoFinal).toFixed(2)),
        imposto: Number(calcularImposto(precoFinal).toFixed(2)),
        imposto_nota: Number(calcularImpostoNota(precoFinal).toFixed(2)),
        margem_dinheiro: Number(calcularMargemDinheiro(custo, precoFinal).toFixed(2))
      }));
    }
  }, [formData.custo, formData.preco_final, formData.cliente_id]);

  const createMutation = useMutation(
    (data: any) => licitacaoService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('licitacoes');
        toast.success('Licitação criada com sucesso!');
        onSuccess();
      },
      onError: () => {
        toast.error('Erro ao criar licitação');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => licitacaoService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('licitacoes');
        toast.success('Licitação atualizada com sucesso!');
        onSuccess();
      },
      onError: () => {
        toast.error('Erro ao atualizar licitação');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      custo: Number(formData.custo),
      preco_inicial: Number(formData.preco_inicial),
      preco_final: Number(formData.preco_final),
      margem_percentual: Number(formData.margem_percentual),
      imposto: Number(formData.imposto),
      imposto_nota: Number(formData.imposto_nota),
      margem_dinheiro: Number(formData.margem_dinheiro),
    };

    if (licitacao) {
      updateMutation.mutate({ id: licitacao.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Funções de cálculo automático
  const calcularMargemPercentual = (custo: number, precoFinal: number): number => {
    if (custo <= 0 || precoFinal <= 0) return 0;
    const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);
    const percentualImposto = clienteSelecionado?.imposto_cliente || 6.0;
    const imposto = precoFinal * (percentualImposto / 100);
    return (precoFinal / (custo + imposto)) * 100;
  };

  const calcularImposto = (precoFinal: number): number => {
    const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);
    const percentualImposto = clienteSelecionado?.imposto_cliente || 6.0;
    return precoFinal * (percentualImposto / 100);
  };

  const calcularMargemDinheiro = (custo: number, precoFinal: number): number => {
    if (custo <= 0 || precoFinal <= 0) return 0;
    const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);
    const percentualImposto = clienteSelecionado?.imposto_cliente || 6.0;
    const imposto = precoFinal * (percentualImposto / 100);
    return precoFinal - custo - imposto;
  };

  const calcularImpostoNota = (precoFinal: number): number => {
    const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);
    const percentualImposto = clienteSelecionado?.imposto_cliente || 6.0;
    return precoFinal * (percentualImposto / 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };

      // Calcular automaticamente quando custo, preço final ou cliente mudar
      if (name === 'custo' || name === 'preco_final' || name === 'cliente_id') {
        const custo = Number(name === 'custo' ? value : prev.custo);
        const precoFinal = Number(name === 'preco_final' ? value : prev.preco_final);
        
        if (custo > 0 && precoFinal > 0) {
          newData.margem_percentual = Number(calcularMargemPercentual(custo, precoFinal).toFixed(2));
          newData.imposto = Number(calcularImposto(precoFinal).toFixed(2));
          newData.imposto_nota = Number(calcularImpostoNota(precoFinal).toFixed(2));
          newData.margem_dinheiro = Number(calcularMargemDinheiro(custo, precoFinal).toFixed(2));
        } else {
          newData.margem_percentual = 0;
          newData.imposto = 0;
          newData.imposto_nota = 0;
          newData.margem_dinheiro = 0;
        }
      }

      return newData;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {licitacao ? 'Editar Licitação' : 'Nova Licitação'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              name="cliente_id"
              value={formData.cliente_id}
              onChange={handleInputChange}
              required
              className="input-field"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente: Cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              required
              className="input-field"
              placeholder="Descrição da licitação"
            />
          </div>

          {/* UASG e Número */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UASG *
              </label>
              <input
                type="text"
                name="uasg"
                value={formData.uasg}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Código UASG"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número *
              </label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Número da licitação"
              />
            </div>
          </div>

          {/* Tipo e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Licitação *
              </label>
              <select
                name="tipo_licitacao"
                value={formData.tipo_licitacao}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="Dispensa Eletrônica">Dispensa Eletrônica</option>
                <option value="Pregão Eletrônico">Pregão Eletrônico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Licitação *
              </label>
              <input
                type="date"
                name="data_licitacao"
                value={formData.data_licitacao}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Posição e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posição
              </label>
              <input
                type="text"
                name="posicao"
                value={formData.posicao}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Posição na classificação"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="AGUARDANDO">Aguardando</option>
                <option value="GANHO">Ganho</option>
                <option value="DESCLASSIFICADO">Desclassificado</option>
                <option value="AGUARDANDO PEDIDO">Aguardando Pedido</option>
              </select>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo
              </label>
              <div className="text-xs text-gray-500 mb-1">(valor do produto/serviço)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="custo"
                  value={formData.custo}
                  onChange={handleInputChange}
                  className="input-field pl-8"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço Inicial
              </label>
              <div className="text-xs text-gray-500 mb-1">(valor inicial da licitação)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="preco_inicial"
                  value={formData.preco_inicial}
                  onChange={handleInputChange}
                  className="input-field pl-8"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço Final
              </label>
              <div className="text-xs text-gray-500 mb-1">(valor final da licitação)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="preco_final"
                  value={formData.preco_final}
                  onChange={handleInputChange}
                  className="input-field pl-8"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              </div>
            </div>
          </div>

          {/* Margens */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem Percentual
              </label>
              <div className="text-xs text-gray-500 mb-1">(preço final / custo)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="margem_percentual"
                  value={formData.margem_percentual}
                  onChange={handleInputChange}
                  className="input-field bg-gray-50 pr-8"
                  placeholder="0.00"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imposto
              </label>
              <div className="text-xs text-gray-500 mb-1">({clientes.find(c => c.id === formData.cliente_id)?.imposto_cliente || 6.0}% do preço final)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="imposto"
                  value={formData.imposto}
                  onChange={handleInputChange}
                  className="input-field bg-gray-50 pl-8"
                  placeholder="0.00"
                  readOnly
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imposto da Nota
              </label>
              <div className="text-xs text-gray-500 mb-1">({clientes.find(c => c.id === formData.cliente_id)?.imposto_cliente || 6.0}% do preço final)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="imposto_nota"
                  value={formData.imposto_nota}
                  onChange={handleInputChange}
                  className="input-field bg-gray-50 pl-8"
                  placeholder="0.00"
                  readOnly
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem em Dinheiro
              </label>
              <div className="text-xs text-gray-500 mb-1">(cálculo automático)</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="margem_dinheiro"
                  value={formData.margem_dinheiro}
                  onChange={handleInputChange}
                  className="input-field bg-gray-50 pl-8"
                  placeholder="0.00"
                  readOnly
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              </div>
            </div>
          </div>

          {/* Portal e Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portal
              </label>
              <div className="text-xs text-gray-500 mb-1">(portal da licitação)</div>
              <input
                type="text"
                name="portal"
                value={formData.portal}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Portal da licitação"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <div className="text-xs text-gray-500 mb-1">(observações adicionais)</div>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={3}
              className="input-field"
              placeholder="Observações adicionais"
            />
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
                : licitacao
                ? 'Atualizar'
                : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LicitacaoForm;
