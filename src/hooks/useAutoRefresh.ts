import { useEffect } from 'react';
import { useQueryClient } from 'react-query';

export const useAutoRefresh = (queryKeys: string[] = []) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Força refresh de todas as queries principais quando a página é carregada
    const allQueries = [
      'licitacoes',
      'clientes', 
      'users',
      'documentacoes',
      'pedidos',
      'dashboard-stats',
      'pedidos-stats',
      'estatisticas-gerais',
      'relatorio-modalidade',
      ...queryKeys
    ];

    // Invalida todas as queries para forçar refresh
    allQueries.forEach(queryKey => {
      queryClient.invalidateQueries(queryKey);
    });


  }, [queryClient, queryKeys]);
};
