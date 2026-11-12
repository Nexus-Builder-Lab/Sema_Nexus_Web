import { useState } from 'react';
import {
  atualizarEquipe,
  atualizarSetor,
  criarEquipe,
  criarSetor,
  substituirMembros,
} from '../../../api/adminApi.js';
import FormModal from './FormModal.jsx';
import { validarEquipe, validarSetor } from './validarAdmin.js';

export function SetorModal({ setor, onClose, onSalvo }) {
  const [sigla, setSigla] = useState(setor?.sigla ?? '');
  const [nome, setNome] = useState(setor?.nome ?? '');
  const [ativo, setAtivo] = useState(setor?.ativo ?? true);

  async function salvar() {
    const corpo = { sigla: sigla.trim(), nome: nome.trim(), ativo };
    if (setor) await atualizarSetor(setor.id, corpo);
    else await criarSetor(corpo);
    await onSalvo(setor ? 'Setor atualizado.' : 'Setor cadastrado com sucesso.');
  }

  return (
    <FormModal
      title={setor ? 'Editar setor' : 'Novo setor'}
      validar={() => validarSetor({ sigla, nome })}
      onSubmit={salvar}
      onClose={onClose}
    >
      {({ erros, classe, campoErro }) => (
        <>
          <div className="mb-3">
            <label htmlFor="setor-sigla" className="form-label">
              Sigla *
            </label>
            <input
              id="setor-sigla"
              className={classe('sigla')}
              value={sigla}
              onChange={(e) => setSigla(e.target.value)}
              aria-invalid={erros.sigla ? 'true' : undefined}
            />
            {campoErro('sigla')}
          </div>
          <div className="mb-3">
            <label htmlFor="setor-nome" className="form-label">
              Nome *
            </label>
            <input
              id="setor-nome"
              className={classe('nome')}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros.nome ? 'true' : undefined}
            />
            {campoErro('nome')}
          </div>
          <div className="form-check">
            <input
              id="setor-ativo"
              type="checkbox"
              className="form-check-input"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            <label htmlFor="setor-ativo" className="form-check-label">
              Setor ativo
            </label>
          </div>
        </>
      )}
    </FormModal>
  );
}

export function EquipeModal({ equipe, setores, usuarios, onClose, onSalvo }) {
  const [nome, setNome] = useState(equipe?.nome ?? '');
  const [setorId, setSetorId] = useState(equipe?.setorId ? String(equipe.setorId) : '');
  const [responsavelId, setResponsavelId] = useState(
    equipe?.responsavel?.id ? String(equipe.responsavel.id) : '',
  );
  const [ativo, setAtivo] = useState(equipe?.ativo ?? true);

  async function salvar() {
    const corpo = {
      nome: nome.trim(),
      setorId: Number(setorId),
      responsavelId: responsavelId ? Number(responsavelId) : null,
      ativo,
    };
    if (equipe) await atualizarEquipe(equipe.id, corpo);
    else await criarEquipe(corpo);
    await onSalvo(equipe ? 'Equipe atualizada.' : 'Equipe cadastrada com sucesso.');
  }

  return (
    <FormModal
      title={equipe ? 'Editar equipe' : 'Nova equipe'}
      validar={() => validarEquipe({ nome, setorId })}
      onSubmit={salvar}
      onClose={onClose}
    >
      {({ erros, classe, campoErro }) => (
        <>
          <div className="mb-3">
            <label htmlFor="eq-nome" className="form-label">
              Nome *
            </label>
            <input
              id="eq-nome"
              className={classe('nome')}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros.nome ? 'true' : undefined}
            />
            {campoErro('nome')}
          </div>
          <div className="mb-3">
            <label htmlFor="eq-setor" className="form-label">
              Setor *
            </label>
            <select
              id="eq-setor"
              className={classe('setorId', 'form-select')}
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              aria-invalid={erros.setorId ? 'true' : undefined}
            >
              <option value="">Selecione</option>
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
          <div className="mb-3">
            <label htmlFor="eq-resp" className="form-label">
              Responsável
            </label>
            <select
              id="eq-resp"
              className={classe('responsavelId', 'form-select')}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
            >
              <option value="">Sem responsável</option>
              {usuarios
                .filter((u) => u.ativo || String(u.id) === responsavelId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </select>
            {campoErro('responsavelId')}
            <div className="form-text">O responsável passa a ser membro da equipe.</div>
          </div>
          <div className="form-check">
            <input
              id="eq-ativo"
              type="checkbox"
              className="form-check-input"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            <label htmlFor="eq-ativo" className="form-check-label">
              Equipe ativa
            </label>
          </div>
        </>
      )}
    </FormModal>
  );
}

/** Seleção de membros (somente usuários ativos) e do responsável entre eles. */
export function MembrosModal({ equipe, usuarios, membrosIds, onClose, onSalvo }) {
  const [selecionados, setSelecionados] = useState(membrosIds);
  const [responsavelId, setResponsavelId] = useState(
    equipe.responsavel?.id ? String(equipe.responsavel.id) : '',
  );
  const ativos = usuarios.filter((u) => u.ativo);
  const marcados = ativos.filter((u) => selecionados.includes(u.id));

  const alternar = (id) =>
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  async function salvar() {
    const corpo = { usuarioIds: selecionados };
    if (responsavelId && selecionados.includes(Number(responsavelId))) {
      corpo.responsavelId = Number(responsavelId);
    }
    await substituirMembros(equipe.id, corpo);
    await onSalvo('Membros da equipe atualizados.');
  }

  return (
    <FormModal
      title={`Membros — ${equipe.nome}`}
      validar={() => ({})}
      onSubmit={salvar}
      onClose={onClose}
    >
      {() => (
        <>
          <fieldset className="mb-3">
            <legend className="form-label fs-6">Usuários ativos</legend>
            {ativos.length === 0 && <p className="text-muted mb-0">Nenhum usuário ativo.</p>}
            {ativos.map((u) => (
              <div className="form-check" key={u.id}>
                <input
                  id={`membro-${u.id}`}
                  type="checkbox"
                  className="form-check-input"
                  checked={selecionados.includes(u.id)}
                  onChange={() => alternar(u.id)}
                />
                <label htmlFor={`membro-${u.id}`} className="form-check-label">
                  {u.nome} <span className="text-muted small">({u.perfil})</span>
                </label>
              </div>
            ))}
          </fieldset>
          <div>
            <label htmlFor="membros-resp" className="form-label">
              Responsável
            </label>
            <select
              id="membros-resp"
              className="form-select"
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
            >
              <option value="">Sem responsável</option>
              {marcados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </FormModal>
  );
}
