import { useEffect } from 'react';
import { useQueryClient } from 'react-query';

export const useAutoRefresh = (queryKeys: string[] = []) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalida apenas as queries específicas passadas como parâmetro
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries(queryKey);
    });
  }, []); // Executa apenas uma vez quando o componente é montado
};
