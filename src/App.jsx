import { Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole.jsx';
import { PERFIS_ADMIN, PERFIS_EDICAO_DEMANDA, PERFIS_ESCRITA_DOCUMENTO } from './auth/perfis.js';
import AuthProvider from './auth/AuthProvider.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import AuthenticatedLayout from './layout/AuthenticatedLayout.jsx';
import HomePage from './pages/core/HomePage.jsx';
import LoginPage from './pages/core/LoginPage.jsx';
import UsuariosPage from './pages/core/admin/UsuariosPage.jsx';
import EstruturaPage from './pages/core/admin/EstruturaPage.jsx';
import NotFoundPage from './pages/core/NotFoundPage.jsx';
import IntelligenceDashboardPage from './pages/intelligence/IntelligenceDashboardPage.jsx';
import InteligenciaAmbientalPage from './pages/intelligence/InteligenciaAmbientalPage.jsx';
import IndicadoresPage from './pages/intelligence/IndicadoresPage.jsx';
import PainelFiscalizacaoPage from './pages/flux/PainelFiscalizacaoPage.jsx';
import DocumentoDetailPage from './pages/docia/DocumentoDetailPage.jsx';
import DocumentoFormPage from './pages/docia/DocumentoFormPage.jsx';
import DocumentosPage from './pages/docia/DocumentosPage.jsx';
import AssistentePage from './pages/docia/AssistentePage.jsx';
import ComparacaoPage from './pages/docia/ComparacaoPage.jsx';
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
              <Route path="/intelligence/indicadores" element={<IndicadoresPage />} />
              <Route path="/flux/painel" element={<PainelFiscalizacaoPage />} />
              <Route path="/flux/demandas" element={<DemandasListPage />} />
              <Route path="/flux/demandas/:id" element={<DemandaDetailPage />} />
              <Route element={<RequireRole roles={PERFIS_EDICAO_DEMANDA} />}>
                <Route path="/flux/demandas/nova" element={<DemandaFormPage />} />
                <Route path="/flux/demandas/:id/editar" element={<DemandaFormPage />} />
              </Route>
              <Route path="/docia/documentos" element={<DocumentosPage />} />
              <Route element={<RequireRole roles={PERFIS_ESCRITA_DOCUMENTO} />}>
                <Route path="/docia/documentos/novo" element={<DocumentoFormPage />} />
              </Route>
              <Route path="/docia/documentos/:id" element={<DocumentoDetailPage />} />
              <Route path="/docia/assistente" element={<AssistentePage />} />
              <Route path="/docia/comparacao" element={<ComparacaoPage />} />
              <Route element={<RequireRole roles={PERFIS_ADMIN} />}>
                <Route path="/admin/usuarios" element={<UsuariosPage />} />
                <Route path="/admin/estrutura" element={<EstruturaPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
