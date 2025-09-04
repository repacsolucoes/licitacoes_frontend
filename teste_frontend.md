# 🎯 Implementação de Quantidades Disponíveis no Frontend

## **✅ PROBLEMA RESOLVIDO:**

O frontend agora usa o novo endpoint `/pedidos/contratos/{contrato_id}/itens-para-pedido` que retorna apenas os itens com quantidades realmente disponíveis.

## **🔧 MUDANÇAS IMPLEMENTADAS:**

### **1. Novo Serviço de API:**
- Adicionado `obterItensParaPedido()` no `contratoService`
- Endpoint: `/pedidos/contratos/{contrato_id}/itens-para-pedido`

### **2. Componente Pedidos.tsx Atualizado:**
- **Seleção de contrato**: Agora usa o novo endpoint para buscar itens disponíveis
- **Quantidades**: Mostra apenas quantidades realmente disponíveis (não consumidas por pedidos anteriores)
- **Validação**: Impede solicitar mais do que está disponível
- **Interface**: Exibe "Máx" e "Disponível" com valores corretos

### **3. Lógica de Cálculo Corrigida:**
- **Custo total**: Usa custo unitário do item diretamente
- **Preço total**: Usa preço unitário do item diretamente
- **Quantidades máximas**: Baseadas em `quantidade_disponivel` em vez de `quantidade_original`

## **💡 COMO FUNCIONA AGORA:**

1. **Primeiro pedido**: Mostra todas as quantidades originais como disponíveis
2. **Segundo pedido**: Mostra apenas as quantidades restantes (não consumidas)
3. **Validação**: Impede criar pedidos que excedam o disponível
4. **Interface**: Atualiza em tempo real as quantidades disponíveis

## **🚀 TESTE:**

Para testar:
1. Abrir a página de Pedidos
2. Clicar em "+ Novo Pedido"
3. Selecionar um contrato
4. Verificar se as quantidades mostradas são as realmente disponíveis
5. Criar um pedido
6. Criar outro pedido e verificar se as quantidades foram reduzidas

## **📝 ARQUIVOS MODIFICADOS:**

- `src/services/api.ts` - Novo método de API
- `src/pages/Pedidos.tsx` - Lógica de quantidades disponíveis
- `src/pages/Pedidos.tsx` - Validação de quantidades
- `src/pages/Pedidos.tsx` - Interface de usuário
