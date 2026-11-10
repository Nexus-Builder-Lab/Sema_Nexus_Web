import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toasts.jsx';
import AppLayout from './layout/AppLayout.jsx';
import HomePage from './pages/core/HomePage.jsx';
import NotFoundPage from './pages/core/NotFoundPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Rotas protegidas por login chegam na Issue #4; o layout já envolve todas. */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
