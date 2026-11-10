import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/theme.scss';
import App from './App.jsx';

async function iniciarMocks() {
  // VITE_USE_MOCKS=true: a API é simulada no navegador (MSW) a partir do contrato OpenAPI.
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const { worker } = await import('./mocks/browser.js');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

iniciarMocks().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
