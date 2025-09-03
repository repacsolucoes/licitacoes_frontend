import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Licitacoes from './pages/Licitacoes';
import Usuarios from './pages/Usuarios';
import Relatorios from './pages/Relatorios';
import Documentacoes from './pages/Documentacoes';
import Pedidos from './pages/Pedidos';
import Contratos from './pages/Contratos';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  
  
  if (loading) return <div>Carregando...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!user.is_admin) return <Navigate to="/" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <PrivateRoute>
                <Layout>
                  <Clientes />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/licitacoes"
            element={
              <PrivateRoute>
                <Layout>
                  <Licitacoes />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/documentacoes"
            element={
              <PrivateRoute>
                <Layout>
                  <Documentacoes />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/pedidos"
            element={
              <PrivateRoute>
                <Layout>
                  <Pedidos />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/contratos"
            element={
              <PrivateRoute>
                <Layout>
                  <Contratos />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <AdminRoute>
                <Layout>
                  <Usuarios />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <PrivateRoute>
                <Layout>
                  <Relatorios />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;
