import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Atualiza quando volta à aba
      staleTime: 30 * 1000, // 30 segundos - dados ficam frescos por menos tempo
      cacheTime: 2 * 60 * 1000, // 2 minutos - cache expira mais rápido
      refetchOnMount: true, // Atualiza quando o componente monta
      refetchOnReconnect: true, // Atualiza quando reconecta
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </QueryClientProvider>,
)
