import { Route, Routes } from 'react-router-dom';
import AuthProvider from './auth/AuthProvider.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import AuthenticatedLayout from './layout/AuthenticatedLayout.jsx';
import HomePage from './pages/core/HomePage.jsx';
import LoginPage from './pages/core/LoginPage.jsx';
import NotFoundPage from './pages/core/NotFoundPage.jsx';

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
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
