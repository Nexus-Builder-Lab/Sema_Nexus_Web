import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vincularDocumento } from '../api/documentosApi.js';
import { mensagemDeErro } from '../api/httpClient.js';
import { focoValido } from '../pages/intelligence/mapaConfig.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import Icon from './Icon.jsx';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v));
const idOk = (v) => Number.isInteger(num(v)) && num(v) > 0;

/** Destino de navegação de cada tipo (null = tipo sem navegação ou parâmetros inválidos). */
export function destinoDaAcao(acao) {
  const p = acao?.parametros ?? {};
  switch (acao?.tipo) {
    case 'ABRIR_COMPARACAO':
      return idOk(p.aId) && idOk(p.bId)
        ? `/docia/comparacao?a=${num(p.aId)}&b=${num(p.bId)}`
        : null;
    case 'ABRIR_DEMANDA':
      return idOk(p.demandaId) ? `/flux/demandas/${num(p.demandaId)}` : null;
    case 'VER_NO_MAPA': {
      const foco = focoValido(p.lat, p.lon, p.zoom);
      if (!foco) return null;
      const q = new URLSearchParams({ lat: String(foco.lat), lon: String(foco.lon) });
      if (foco.zoom != null) q.set('zoom', String(foco.zoom));
      if (idOk(p.demandaId)) q.set('demandaId', String(num(p.demandaId)));
      return `/intelligence/inteligencia-ambiental?${q}`;
    }
    default:
      return null;
  }
}

const ICONES = { ABRIR_COMPARACAO: 'compare', ABRIR_DEMANDA: 'file', VER_NO_MAPA: 'map' };

function vinculoValido(acao) {
  const p = acao?.tipo === 'SUGERIR_VINCULO_DEMANDA' ? acao.parametros : null;
  return p && idOk(p.documentoId) && idOk(p.demandaId);
}

/**
 * Action Cards (Issue API#136 / Web#139): botões derivados e validados na API. Navegar não grava nada; o vínculo
 * documento↔demanda só é gravado após confirmação explícita. Tipos desconhecidos são ignorados.
 */
export default function AcoesSugeridas({ acoes }) {
  const navigate = useNavigate();
  const [vinculo, setVinculo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState(null);

  const validas = (acoes ?? []).filter((a) => destinoDaAcao(a) || vinculoValido(a));
  if (validas.length === 0) return null;

  async function confirmar() {
    const { documentoId, demandaId } = vinculo.parametros;
    setBusy(true);
    try {
      await vincularDocumento(num(demandaId), num(documentoId));
      setResultado({
        ok: true,
        texto: `Documento ${documentoId} vinculado à demanda ${demandaId}.`,
      });
    } catch (e) {
      const status = e?.response?.status;
      const texto =
        status === 409
          ? 'Este documento já está vinculado a esta demanda.'
          : status === 403
            ? 'Você não tem permissão para vincular documentos a esta demanda.'
            : mensagemDeErro(e, 'Não foi possível vincular o documento.');
      setResultado({ ok: status === 409, texto });
    } finally {
      setBusy(false);
      setVinculo(null);
    }
  }

  return (
    <div className="mt-2" data-testid="acoes-sugeridas">
      <h3 className="h6 mb-1">Ações sugeridas</h3>
      <div className="d-flex flex-wrap gap-2" role="group" aria-label="Ações sugeridas">
        {validas.map((a, i) => {
          const destino = destinoDaAcao(a);
          return (
            <button
              key={`${a.tipo}-${i}`}
              type="button"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 text-start"
              onClick={() => (destino ? navigate(destino) : setVinculo(a))}
            >
              {ICONES[a.tipo] && <Icon name={ICONES[a.tipo]} size={14} />}
              {a.rotulo || a.tipo}
            </button>
          );
        })}
      </div>
      {resultado && (
        <p
          className={`small mt-2 mb-0 ${resultado.ok ? 'text-success' : 'text-danger'}`}
          role="status"
        >
          {resultado.texto}
        </p>
      )}
      <ConfirmDialog
        show={vinculo != null}
        title="Vincular documento"
        message={
          vinculo
            ? `Vincular documento ${vinculo.parametros.documentoId} à demanda ${vinculo.parametros.demandaId}?`
            : ''
        }
        confirmLabel="Vincular"
        variant="primary"
        busy={busy}
        onConfirm={confirmar}
        onCancel={() => setVinculo(null)}
      />
    </div>
  );
}
