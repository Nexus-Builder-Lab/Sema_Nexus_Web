import { render, screen } from '@testing-library/react';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it.each([
    ['PENDENTE', 'Pendente', 'nx-badge-gray'],
    ['EM_TRIAGEM', 'Em triagem', 'nx-badge-violet'],
    ['AGUARDANDO_DISTRIBUICAO', 'Aguardando distribuição', 'nx-badge-amber'],
    ['DISTRIBUIDA', 'Distribuída', 'nx-badge-blue'],
    ['EM_ANDAMENTO', 'Em andamento', 'nx-badge-orange'],
    ['AGUARDANDO_CONCLUSAO', 'Aguardando conclusão', 'nx-badge-teal'],
    ['FINALIZADA', 'Finalizada', 'nx-badge-green'],
  ])('%s → "%s"', (status, label, cls) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass('nx-badge', cls);
  });

  it('os 7 status têm cores distintas', () => {
    const { container } = render(
      <>
        {[
          'PENDENTE',
          'EM_TRIAGEM',
          'AGUARDANDO_DISTRIBUICAO',
          'DISTRIBUIDA',
          'EM_ANDAMENTO',
          'AGUARDANDO_CONCLUSAO',
          'FINALIZADA',
        ].map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </>,
    );
    const classes = [...container.querySelectorAll('.nx-badge')].map((el) => el.className);
    expect(new Set(classes).size).toBe(7);
  });

  it('aceita variações de escrita do valor', () => {
    render(<StatusBadge status="em triagem" />);
    expect(screen.getByText('Em triagem')).toBeInTheDocument();
  });

  it('mostra o próprio valor (em cinza) para status desconhecido', () => {
    render(<StatusBadge status="CANCELADA" />);
    expect(screen.getByText('CANCELADA')).toHaveClass('nx-badge-gray');
  });

  it('mostra travessão quando não há status', () => {
    render(<StatusBadge />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('PriorityBadge', () => {
  it.each([
    ['BAIXA', 'Baixa', 'nx-badge-gray'],
    ['MEDIA', 'Média', 'nx-badge-blue'],
    ['Média', 'Média', 'nx-badge-blue'],
    ['ALTA', 'Alta', 'nx-badge-amber'],
    ['URGENTE', 'Urgente', 'nx-badge-red'],
  ])('%s → "%s"', (valor, label, cls) => {
    const { container } = render(<PriorityBadge prioridade={valor} />);
    const badge = container.querySelector('.nx-badge');
    expect(badge).toHaveClass(cls);
    expect(badge).toHaveTextContent(`Prioridade ${label}`);
  });
});
