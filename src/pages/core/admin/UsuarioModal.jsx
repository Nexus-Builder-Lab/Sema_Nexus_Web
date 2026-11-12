import { useState } from 'react';
import { atualizarUsuario, criarUsuario, substituirMembros } from '../../../api/adminApi.js';
import FormModal from './FormModal.jsx';
import { PERFIS, validarUsuario } from './validarAdmin.js';

/**
 * Cadastro/edição de usuário. A equipe é opcional: a API não guarda equipe no usuário, a
 * associação é feita em `PUT /equipes/{id}/membros` depois de salvar (só usuários ativos).
 * `equipesAtuais`: ids das equipes em que o usuário já é membro; `membrosPorEquipe`: id -> [ids].
 */
export default function UsuarioModal({
  usuario,
  setores,
  equipes,
  equipesAtuais = [],
  membrosPorEquipe = {},
  onClose,
  onSalvo,
}) {
  const criando = !usuario;
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState(usuario?.perfil ?? '');
  const [setorId, setSetorId] = useState(usuario?.setorId ? String(usuario.setorId) : '');
  const [equipeId, setEquipeId] = useState(equipesAtuais[0] ? String(equipesAtuais[0]) : '');
  const podeEquipe = criando || usuario.ativo;

  async function salvar() {
    const corpo = {
      nome: nome.trim(),
      email: email.trim(),
      perfil,
      setorId: setorId ? Number(setorId) : null,
    };
    if (senha) corpo.senha = senha;
    const salvo = criando ? await criarUsuario(corpo) : await atualizarUsuario(usuario.id, corpo);
    let aviso = null;
    if (podeEquipe && String(equipesAtuais[0] ?? '') !== equipeId) {
      try {
        for (const id of equipesAtuais) {
          if (String(id) !== equipeId) {
            await substituirMembros(id, {
              usuarioIds: (membrosPorEquipe[id] ?? []).filter((m) => m !== salvo.id),
            });
          }
        }
        if (equipeId && !equipesAtuais.includes(Number(equipeId))) {
          await substituirMembros(Number(equipeId), {
            usuarioIds: [...(membrosPorEquipe[equipeId] ?? []), salvo.id],
          });
        }
      } catch {
        aviso = 'O usuário foi salvo, mas não foi possível atualizar a equipe.';
      }
    }
    await onSalvo(criando ? 'Usuário cadastrado com sucesso.' : 'Usuário atualizado.', aviso);
  }

  return (
    <FormModal
      title={criando ? 'Novo usuário' : 'Editar usuário'}
      validar={() => validarUsuario({ nome, email, senha, perfil }, { criando })}
      onSubmit={salvar}
      onClose={onClose}
    >
      {({ erros, classe, campoErro }) => (
        <>
          <div className="mb-3">
            <label htmlFor="usr-nome" className="form-label">
              Nome *
            </label>
            <input
              id="usr-nome"
              className={classe('nome')}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros.nome ? 'true' : undefined}
            />
            {campoErro('nome')}
          </div>
          <div className="mb-3">
            <label htmlFor="usr-email" className="form-label">
              E-mail *
            </label>
            <input
              id="usr-email"
              type="email"
              autoComplete="off"
              className={classe('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={erros.email ? 'true' : undefined}
            />
            {campoErro('email')}
          </div>
          <div className="mb-3">
            <label htmlFor="usr-senha" className="form-label">
              {criando ? 'Senha *' : 'Nova senha'}
            </label>
            <input
              id="usr-senha"
              type="password"
              autoComplete="new-password"
              className={classe('senha')}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-invalid={erros.senha ? 'true' : undefined}
              aria-describedby="usr-senha-ajuda"
            />
            {campoErro('senha')}
            <div id="usr-senha-ajuda" className="form-text">
              {criando
                ? 'Mínimo de 8 caracteres.'
                : 'Deixe em branco para manter a senha atual. Se preenchida, mínimo de 8 caracteres.'}
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="usr-perfil" className="form-label">
                Perfil *
              </label>
              <select
                id="usr-perfil"
                className={classe('perfil', 'form-select')}
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
                aria-invalid={erros.perfil ? 'true' : undefined}
              >
                <option value="">Selecione</option>
                {PERFIS.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
              {campoErro('perfil')}
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="usr-setor" className="form-label">
                Setor
              </label>
              <select
                id="usr-setor"
                className={classe('setorId', 'form-select')}
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
              >
                <option value="">Sem setor</option>
                {setores
                  .filter((s) => s.ativo || String(s.id) === setorId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sigla} — {s.nome}
                    </option>
                  ))}
              </select>
              {campoErro('setorId')}
            </div>
            <div className="col-12">
              <label htmlFor="usr-equipe" className="form-label">
                Equipe
              </label>
              <select
                id="usr-equipe"
                className="form-select"
                value={equipeId}
                onChange={(e) => setEquipeId(e.target.value)}
                disabled={!podeEquipe}
              >
                <option value="">Sem equipe</option>
                {equipes
                  .filter((e) => e.ativo || String(e.id) === equipeId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
              </select>
              {!podeEquipe && (
                <div className="form-text">Usuário inativo não participa de equipes.</div>
              )}
            </div>
          </div>
        </>
      )}
    </FormModal>
  );
}
