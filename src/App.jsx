import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole.jsx';
import {
  PERFIS_ADMIN,
  PERFIS_EDICAO_DEMANDA,
  PERFIS_ESCRITA_DOCUMENTO,
  PERFIS_RELATORIOS,
} from './auth/perfis.js';
import AuthProvider from './auth/AuthProvider.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import AuthenticatedLayout from './layout/AuthenticatedLayout.jsx';
import HomePage from './pages/core/HomePage.jsx';
import LoginPage from './pages/core/LoginPage.jsx';
import AdminPage from './pages/core/admin/AdminPage.jsx';
import PainelSistemaPage from './pages/core/painel/PainelSistemaPage.jsx';
import NotFoundPage from './pages/core/NotFoundPage.jsx';
import IntelligenceDashboardPage from './pages/intelligence/IntelligenceDashboardPage.jsx';
import InteligenciaAmbientalPage from './pages/intelligence/InteligenciaAmbientalPage.jsx';
import RelatoriosPage from './pages/intelligence/RelatoriosPage.jsx';
import IndicadoresPage from './pages/intelligence/IndicadoresPage.jsx';
import PainelFiscalizacaoPage from './pages/flux/PainelFiscalizacaoPage.jsx';
import DocumentoDetailPage from './pages/docia/DocumentoDetailPage.jsx';
import DocumentoFormPage from './pages/docia/DocumentoFormPage.jsx';
import DocumentosPage from './pages/docia/DocumentosPage.jsx';
import AssistentePage from './pages/docia/AssistentePage.jsx';
import ComparacaoPage from './pages/docia/ComparacaoPage.jsx';
import AnaliseDocumentalPage from './pages/docia/AnaliseDocumentalPage.jsx';
import PrazosPage from './pages/flux/PrazosPage.jsx';
import ProdutividadePage from './pages/flux/ProdutividadePage.jsx';
import KanbanPage from './pages/flux/KanbanPage.jsx';
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
              <Route element={<RequireRole roles={PERFIS_RELATORIOS} />}>
                <Route path="/intelligence/relatorios" element={<RelatoriosPage />} />
              </Route>
              <Route path="/flux/painel" element={<PainelFiscalizacaoPage />} />
              <Route path="/flux/kanban" element={<KanbanPage />} />
              <Route path="/flux/prazos" element={<PrazosPage />} />
              <Route path="/flux/produtividade" element={<ProdutividadePage />} />
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
              <Route path="/docia/analise" element={<AnaliseDocumentalPage />} />
              <Route path="/docia/comparacao" element={<ComparacaoPage />} />
              <Route element={<RequireRole roles={PERFIS_ADMIN} />}>
                <Route path="/admin" element={<AdminPage aba="usuarios" />} />
                <Route path="/admin/usuarios" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/estrutura" element={<AdminPage aba="estrutura" />} />
                <Route path="/admin/perfis" element={<AdminPage aba="perfis" />} />
                <Route path="/admin/auditoria" element={<AdminPage aba="auditoria" />} />
                <Route path="/sistema/painel" element={<PainelSistemaPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
