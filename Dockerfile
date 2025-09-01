# Dockerfile para o frontend React/TypeScript
FROM node:18-alpine as build

# Definir variáveis de ambiente
ENV NODE_ENV=production \
    NODE_PATH=/app/node_modules

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código da aplicação
COPY . .

# Build da aplicação
RUN npm run build

# Stage de produção
FROM docker.io/library/nginx:alpine

# Copiar arquivos buildados
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta
EXPOSE 80

# Comando para executar o nginx
CMD ["nginx", "-g", "daemon off;"]
