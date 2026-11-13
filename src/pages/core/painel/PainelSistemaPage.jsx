import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../../api/httpClient.js';
import { obterPainel } from '../../../api/sistemaApi.js';
import Icon from '../../../components/Icon.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import { NOME_SISTEMA } from '../../../config/sistema.js';
import Arquitetura from './Arquitetura.jsx';
import { mapaVerificacoes } from './estados.js';
import {
  AgentesIa,
  Desenvolvimento,
  Integracoes,
  Modulos,
  PerfisInterativos,
  VisaoGeral,
} from './Secoes.jsx';
import { verificarEsri, verificarOsm } from './verificacoesNavegador.js';

const ABAS = [
  { id: 'visao', rotulo: 'Visão geral', icone: 'dashboard' },
  { id: 'arquitetura', rotulo: 'Arquitetura', icone: 'workflow' },
  { id: 'modulos', rotulo: 'Módulos', icone: 'layers' },
  { id: 'perfis', rotulo: 'Perfis e permissões', icone: 'users' },
  { id: 'agentes', rotulo: 'Agentes de IA', icone: 'sparkles' },
  { id: 'integracoes', rotulo: 'Integrações', icone: 'globe' },
  { id: 'desenvolvimento', rotulo: 'Desenvolvimento', icone: 'lightbulb' },
];
const INTERVALO_MS = 30_000;

/**
 * Painel do sistema (Web#123, somente ADMIN): o que é o sistema, como está operando agora (verificações
 * ao vivo da API e do navegador), arquitetura interativa, módulos, perfis, agentes de IA, integrações
 * e como foi desenvolvido.
 */
export default function PainelSistemaPage() {
  const [params, setParams] = useSearchParams();
  const aba = ABAS.some((a) => a.id === params.get('aba')) ? params.get('aba') : 'visao';
  const [painel, setPainel] = useState(null);
  const [navegador, setNavegador] = useState({});
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [automatico, setAutomatico] = useState(false);
  const [selecionado, setSelecionado] = useState('api');

  const verificar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    setNavegador((n) => ({
      esri: { ...n.esri, estado: 'VERIFICANDO' },
      osm: { ...n.osm, estado: 'VERIFICANDO' },
    }));
    verificarEsri().then((esri) => setNavegador((n) => ({ ...n, esri })));
    verificarOsm().then((osm) => setNavegador((n) => ({ ...n, osm })));
    try {
      setPainel(await obterPainel());
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível consultar o painel do sistema.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Primeira verificação fora da renderização do efeito (evita renderizações em cascata).
    const id = setTimeout(verificar, 0);
    return () => clearTimeout(id);
  }, [verificar]);

  useEffect(() => {
    if (!automatico) return undefined;
    const id = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [automatico, verificar]);

  const verificacoes = useMemo(() => mapaVerificacoes(painel, navegador), [painel, navegador]);

  const irPara = (novaAba, componente) => {
    if (componente) setSelecionado(componente);
    setParams(novaAba === 'visao' ? {} : { aba: novaAba });
  };

  const horario = painel?.geradoEm ? new Date(painel.geradoEm).toLocaleTimeString('pt-BR') : null;

  return (
    <>
      <PageHeader
        module="core"
        title="Painel do sistema"
        description={`Como o ${NOME_SISTEMA} funciona e como está operando agora.`}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="painel-automatico"
                checked={automatico}
                onChange={(e) => setAutomatico(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="painel-automatico">
                Atualizar a cada 30 s
              </label>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={verificar}
              disabled={carregando}
            >
              {carregando ? (
                <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
              ) : (
                <Icon name="activity" size={14} className="me-1" />
              )}
              Verificar agora
            </button>
          </div>
        }
      />

      <div className="d-flex align-items-center gap-2 small text-body-secondary mb-2" role="status">
        <span className={`nx-painel-pulso${carregando ? ' ativo' : ''}`} aria-hidden="true" />
        {carregando
          ? 'Verificando os componentes…'
          : horario
            ? `Última verificação às ${horario} · somente administradores veem esta página`
            : 'Sem verificação.'}
      </div>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <nav aria-label="Seções do painel do sistema" className="mb-3 overflow-x-auto">
        <ul className="nav nx-tabs flex-nowrap" role="tablist">
          {ABAS.map((a) => (
            <li key={a.id} className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                className={`nav-link text-nowrap${aba === a.id ? ' active' : ''}`}
                onClick={() => irPara(a.id)}
              >
                <Icon name={a.icone} size={15} className="me-1" />
                {a.rotulo}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div role="tabpanel" aria-label={ABAS.find((a) => a.id === aba)?.rotulo}>
        {aba === 'visao' && (
          <VisaoGeral painel={painel} verificacoes={verificacoes} onAbrir={irPara} />
        )}
        {aba === 'arquitetura' && (
          <Arquitetura
            verificacoes={verificacoes}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
          />
        )}
        {aba === 'modulos' && <Modulos />}
        {aba === 'perfis' && <PerfisInterativos />}
        {aba === 'agentes' && <AgentesIa painel={painel} verificacoes={verificacoes} />}
        {aba === 'integracoes' && <Integracoes verificacoes={verificacoes} />}
        {aba === 'desenvolvimento' && <Desenvolvimento />}
      </div>
    </>
  );
}
