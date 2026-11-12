import { History, KeyRound, ShieldCheck, UserRound, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader.jsx';
import AuditoriaPage from './AuditoriaPage.jsx';
import EstruturaPage from './EstruturaPage.jsx';
import PerfisPermissoes from './PerfisPermissoes.jsx';
import UsuariosPage from './UsuariosPage.jsx';

const ABAS = [
  { id: 'usuarios', rotulo: 'Usuários', to: '/admin', Icone: UserRound },
  { id: 'estrutura', rotulo: 'Setores e equipes', to: '/admin/estrutura', Icone: Users },
  { id: 'perfis', rotulo: 'Perfis e permissões', to: '/admin/perfis', Icone: KeyRound },
  { id: 'auditoria', rotulo: 'Histórico de atividades', to: '/admin/auditoria', Icone: History },
];

/** Área administrativa: página única com abas (somente ADMIN, imposto pela rota e pela API). */
export default function AdminPage({ aba = 'usuarios' }) {
  return (
    <>
      <PageHeader
        module="Administração"
        title="Área administrativa"
        description="Gestão de usuários, setores e equipes, perfis de acesso e histórico de atividades."
      />

      <div className="alert alert-warning d-flex gap-2 align-items-start" role="note">
        <ShieldCheck size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
        <div>
          <strong>Controle de acesso demonstrativo.</strong>
          <div className="small">
            Dados fictícios. A autenticação e as permissões são validadas pela API; a interface
            apenas reflete o perfil e não substitui a autorização do servidor.
          </div>
        </div>
      </div>

      <nav aria-label="Seções da área administrativa" className="mb-3 overflow-x-auto">
        <ul className="nav nx-tabs flex-nowrap">
          {ABAS.map(({ id, rotulo, to, Icone }) => (
            <li key={id} className="nav-item">
              <Link
                to={to}
                className={`nav-link text-nowrap${aba === id ? ' active' : ''}`}
                aria-current={aba === id ? 'page' : undefined}
              >
                <Icone size={15} className="me-1" aria-hidden="true" />
                {rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {aba === 'usuarios' && <UsuariosPage embedded />}
      {aba === 'estrutura' && <EstruturaPage embedded />}
      {aba === 'perfis' && <PerfisPermissoes />}
      {aba === 'auditoria' && <AuditoriaPage embedded />}
    </>
  );
}
