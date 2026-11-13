import { Check, Minus } from 'lucide-react';
import { PERMISSOES } from './permissoes.js';
import { PERFIS } from './validarAdmin.js';

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
