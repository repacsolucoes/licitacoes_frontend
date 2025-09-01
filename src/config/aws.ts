// Configurações AWS S3 para o frontend
export const AWS_CONFIG = {
  // Região padrão
  REGION: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  
  // Bucket S3
  S3_BUCKET: process.env.REACT_APP_AWS_S3_BUCKET || 'licitasis',
  
  // URLs base para diferentes ambientes
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8100',
  
  // Configurações de upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.pdf'],
  
  // Configurações de download
  DOWNLOAD_EXPIRY: 3600, // 1 hora em segundos
};

// Função para gerar URL de download S3
export const getS3DownloadUrl = (s3Key: string): string => {
  return `${AWS_CONFIG.API_BASE_URL}/api/v1/documentacoes/download/${encodeURIComponent(s3Key)}`;
};

// Função para validar tipo de arquivo
export const isValidFileType = (filename: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return AWS_CONFIG.ALLOWED_FILE_TYPES.includes(extension);
};

// Função para validar tamanho do arquivo
export const isValidFileSize = (size: number): boolean => {
  return size <= AWS_CONFIG.MAX_FILE_SIZE;
};

// Função para formatar tamanho do arquivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
