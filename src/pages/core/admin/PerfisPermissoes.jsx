import { Check, Minus } from 'lucide-react';
import {
  PERFIS_ADMIN,
  PERFIS_DISTRIBUICAO,
  PERFIS_EDICAO_DEMANDA,
  PERFIS_ESCRITA_DOCUMENTO,
  PERFIS_RELATORIOS,
} from '../../../auth/perfis.js';
import { PERFIS } from './validarAdmin.js';

// Matriz somente leitura, derivada das regras de interface espelhadas da API (a API autoriza).
const PERMISSOES = [
  {
    chave: 'ver',
    rotulo: 'Consultar demandas, documentos e indicadores',
    perfis: PERFIS.map((p) => p.codigo),
  },
  { chave: 'demandas', rotulo: 'Cadastrar e editar demandas', perfis: PERFIS_EDICAO_DEMANDA },
  {
    chave: 'distribuir',
    rotulo: 'Distribuir demandas e encerrar fiscalizações',
    perfis: PERFIS_DISTRIBUICAO,
  },
  {
    chave: 'fiscalizar',
    rotulo: 'Executar fiscalização (fiscal designado)',
    perfis: ['ADMIN', 'GESTOR', 'FISCAL'],
  },
  { chave: 'documentos', rotulo: 'Enviar e vincular documentos', perfis: PERFIS_ESCRITA_DOCUMENTO },
  { chave: 'relatorios', rotulo: 'Relatórios gerenciais', perfis: PERFIS_RELATORIOS },
  {
    chave: 'admin',
    rotulo: 'Área administrativa (usuários, setores, auditoria)',
    perfis: PERFIS_ADMIN,
  },
];

export default function PerfisPermissoes() {
  return (
    <section className="card nx-card" aria-label="Perfis e permissões">
      <div className="card-body">
        <h2 className="h6 mb-1">Matriz de permissões por perfil</h2>
        <p className="text-secondary small">
          Somente leitura. O perfil Administrador possui acesso completo. A autorização é sempre
          validada pela API.
        </p>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Permissão</th>
                {PERFIS.map((p) => (
                  <th key={p.codigo} scope="col" className="text-center">
                    {p.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSOES.map((perm) => (
                <tr key={perm.chave}>
                  <th scope="row" className="fw-normal">
                    {perm.rotulo}
                  </th>
                  {PERFIS.map((p) => {
                    const tem = perm.perfis.includes(p.codigo);
                    return (
                      <td key={p.codigo} className="text-center">
                        {tem ? (
                          <Check size={16} className="text-success" aria-label="Permitido" />
                        ) : (
                          <Minus size={16} className="text-secondary" aria-label="Não permitido" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
