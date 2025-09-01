// Configurações de ambiente para o frontend
export const ENV_CONFIG = {
  // Ambiente atual
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // URLs da API
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8100',
  
  // Configurações AWS
  AWS_REGION: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.REACT_APP_AWS_S3_BUCKET || 'licitasis',
  
  // Configurações do servidor
  PORT: process.env.PORT || '3100',
  
  // Configurações de desenvolvimento
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
};

// Função para obter URL completa da API
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = ENV_CONFIG.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return `${baseUrl}/api/v1/${cleanEndpoint}`;
};

// Função para verificar se está rodando localmente
export const isLocalhost = (): boolean => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
};

// Função para obter configuração baseada no ambiente
export const getConfig = () => {
  if (ENV_CONFIG.IS_DEV) {
    return {
      apiUrl: 'http://localhost:8100',
      enableLogs: true,
      enableDebug: true,
    };
  }
  
  if (ENV_CONFIG.IS_PROD) {
    return {
      apiUrl: ENV_CONFIG.API_BASE_URL,
      enableLogs: false,
      enableDebug: false,
    };
  }
  
  // Test environment
  return {
    apiUrl: 'http://localhost:8100',
    enableLogs: false,
    enableDebug: false,
  };
};
