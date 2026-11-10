import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('exibe a página inicial com a faixa de ambiente demonstrativo', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'SEMA NEXUS' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS',
    );
  });

  it('exibe página não encontrada para rota inexistente', () => {
    renderAt('/rota-inexistente');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
  });
});
