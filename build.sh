#!/bin/bash

# Script para build e deploy do frontend React + Vite

set -e

echo "🚀 Iniciando build do frontend..."

# Variáveis
IMAGE_NAME="licitacoes-frontend"
TAG="latest"
CONTAINER_NAME="licitacoes-frontend"

# Parar e remover container existente
echo "🔄 Parando container existente..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Remover imagem existente
echo "🗑️ Removendo imagem existente..."
docker rmi $IMAGE_NAME:$TAG 2>/dev/null || true

# Build da nova imagem
echo "🔨 Construindo nova imagem..."
docker build -t $IMAGE_NAME:$TAG .

# Executar container
echo "🚀 Iniciando container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 3100:80 \
  --restart unless-stopped \
  $IMAGE_NAME:$TAG

# Aguardar container estar pronto
echo "⏳ Aguardando container estar pronto..."
sleep 5

# Verificar status
echo "📊 Status do container:"
docker ps | grep $CONTAINER_NAME

echo "✅ Frontend rodando em http://localhost:3100"
echo "🔍 Logs: docker logs -f $CONTAINER_NAME"
echo "🛑 Parar: docker stop $CONTAINER_NAME"
