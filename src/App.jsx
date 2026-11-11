import { Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole.jsx';
import { PERFIS_EDICAO_DEMANDA } from './auth/perfis.js';
import AuthProvider from './auth/AuthProvider.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import AuthenticatedLayout from './layout/AuthenticatedLayout.jsx';
import HomePage from './pages/core/HomePage.jsx';
import LoginPage from './pages/core/LoginPage.jsx';
import NotFoundPage from './pages/core/NotFoundPage.jsx';
import IntelligenceDashboardPage from './pages/intelligence/IntelligenceDashboardPage.jsx';
import InteligenciaAmbientalPage from './pages/intelligence/InteligenciaAmbientalPage.jsx';
import DemandaDetailPage from './pages/flux/DemandaDetailPage.jsx';
import DemandaFormPage from './pages/flux/DemandaFormPage.jsx';
import DemandasListPage from './pages/flux/DemandasListPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Tudo abaixo exige login; telas restritas por perfil usam <RequireRole roles={[...]}>. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthenticatedLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/intelligence" element={<IntelligenceDashboardPage />} />
              <Route
                path="/intelligence/inteligencia-ambiental"
                element={<InteligenciaAmbientalPage />}
              />
              <Route path="/flux/demandas" element={<DemandasListPage />} />
              <Route path="/flux/demandas/:id" element={<DemandaDetailPage />} />
              <Route element={<RequireRole roles={PERFIS_EDICAO_DEMANDA} />}>
                <Route path="/flux/demandas/nova" element={<DemandaFormPage />} />
                <Route path="/flux/demandas/:id/editar" element={<DemandaFormPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
