import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useRefreshData } from '../hooks/useRefreshData';

interface RefreshButtonProps {
  onRefresh?: () => void;
  refreshType?: 'all' | 'licitacoes' | 'pedidos' | 'clientes' | 'users' | 'documentacoes' | 'relatorios';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  refreshType = 'all',
  className = '',
  size = 'md',
  showText = true
}) => {
  const { refreshAll, refreshLicitacoes, refreshPedidos, refreshClientes, refreshUsers, refreshDocumentacoes, refreshRelatorios } = useRefreshData();

  const handleRefresh = () => {
    // Executa refresh personalizado se fornecido
    if (onRefresh) {
      onRefresh();
      return;
    }

    // Executa refresh baseado no tipo
    switch (refreshType) {
      case 'licitacoes':
        refreshLicitacoes();
        break;
      case 'pedidos':
        refreshPedidos();
        break;
      case 'clientes':
        refreshClientes();
        break;
      case 'users':
        refreshUsers();
        break;
      case 'documentacoes':
        refreshDocumentacoes();
        break;
      case 'relatorios':
        refreshRelatorios();
        break;
      default:
        refreshAll();
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <button
      onClick={handleRefresh}
      className={`flex items-center gap-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${sizeClasses[size]} ${className}`}
      title="Atualizar dados"
    >
      <RefreshCw className={iconSizes[size]} />
      {showText && 'Atualizar'}
    </button>
  );
};
