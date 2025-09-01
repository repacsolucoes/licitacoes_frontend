import { useQueryClient } from 'react-query';

export const useRefreshData = () => {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    // Invalida todas as queries principais do sistema
    queryClient.invalidateQueries('licitacoes');
    queryClient.invalidateQueries('clientes');
    queryClient.invalidateQueries('users');
    queryClient.invalidateQueries('documentacoes');
    queryClient.invalidateQueries('pedidos');
    queryClient.invalidateQueries('dashboard-stats');
    queryClient.invalidateQueries('pedidos-stats');
    queryClient.invalidateQueries('estatisticas-gerais');
    queryClient.invalidateQueries('relatorio-modalidade');
  };

  const refreshLicitacoes = () => {
    queryClient.invalidateQueries('licitacoes');
    queryClient.invalidateQueries('dashboard-stats');
    queryClient.invalidateQueries('estatisticas-gerais');
  };

  const refreshPedidos = () => {
    queryClient.invalidateQueries('pedidos');
    queryClient.invalidateQueries('pedidos-stats');
    queryClient.invalidateQueries('dashboard-stats');
    queryClient.invalidateQueries('estatisticas-gerais');
  };

  const refreshClientes = () => {
    queryClient.invalidateQueries('clientes');
    queryClient.invalidateQueries('dashboard-stats');
  };

  const refreshUsers = () => {
    queryClient.invalidateQueries('users');
    queryClient.invalidateQueries('clientes');
  };

  const refreshDocumentacoes = () => {
    queryClient.invalidateQueries('documentacoes');
  };

  const refreshRelatorios = () => {
    queryClient.invalidateQueries('estatisticas-gerais');
    queryClient.invalidateQueries('relatorio-modalidade');
    queryClient.invalidateQueries('dashboard-stats');
    queryClient.invalidateQueries('pedidos-stats');
  };

  return {
    refreshAll,
    refreshLicitacoes,
    refreshPedidos,
    refreshClientes,
    refreshUsers,
    refreshDocumentacoes,
    refreshRelatorios,
  };
};
