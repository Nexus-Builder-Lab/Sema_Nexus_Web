import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { enviarDocumento, preAnalisarDocumento } from '../../api/documentosApi.js';
import { listarMunicipios } from '../../api/catalogosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { hojeISO } from '../../utils/datas.js';
import {
  EXTENSOES_PERMITIDAS,
  formatarTamanho,
  LIMITES,
  mensagemDeUpload,
  separarPalavras,
  validarDocumento,
  VALORES_INICIAIS,
} from './validarDocumento.js';

const semCampo = (obj, campo) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => k !== campo));

function Campo({ id, label, obrigatorio, erro, ajuda, className = 'col-12 col-md-6', children }) {
  const descricoes = [erro && `${id}-erro`, ajuda && `${id}-ajuda`].filter(Boolean).join(' ');
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">
        {label}
        {obrigatorio && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': erro ? 'true' : undefined,
        'aria-describedby': descricoes || undefined,
        'aria-required': obrigatorio ? 'true' : undefined,
        className: `form-control${erro ? ' is-invalid' : ''}`,
      })}
      {ajuda && (
        <div id={`${id}-ajuda`} className="form-text">
          {ajuda}
        </div>
      )}
      {erro && (
        <div id={`${id}-erro`} className="invalid-feedback d-block">
          {erro}
        </div>
      )}
    </div>
  );
}

function Formulario({ municipios, demandaId }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const formRef = useRef(null);
  const [valores, setValores] = useState({ ...VALORES_INICIAIS, dataDocumento: hojeISO() });
  const [arquivo, setArquivo] = useState(null);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [tentativas, setTentativas] = useState(0);
  const [erroEnvio, setErroEnvio] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [preAnalise, setPreAnalise] = useState(null); // { avisos, vinculos } da última pré-análise
  const [erroPreAnalise, setErroPreAnalise] = useState(null);
  // campo -> valor anterior à sugestão (para desfazer); some quando a pessoa edita o campo.
  const [sugeridos, setSugeridos] = useState({});
  const tocados = useRef(new Set());
  const sequencia = useRef(0);
  const hoje = hojeISO();
  const definir = (campo) => (e) => {
    const valor = e.target.value;
    tocados.current.add(campo);
    setSugeridos((atual) => semCampo(atual, campo));
    setValores((atual) => ({ ...atual, [campo]: valor }));
  };

  async function selecionarArquivo(e) {
    const escolhido = e.target.files?.[0] ?? null;
    setArquivo(escolhido);
    setPreAnalise(null);
    setErroPreAnalise(null);
    const minha = ++sequencia.current;
    const ext = escolhido?.name.split('.').pop().toLowerCase();
    if (!escolhido || !EXTENSOES_PERMITIDAS.includes(ext)) {
      setAnalisando(false);
      return;
    }
    setAnalisando(true);
    try {
      const r = await preAnalisarDocumento(escolhido);
      if (minha !== sequencia.current) return;
      setPreAnalise({ avisos: r.avisos ?? [], vinculos: r.vinculosDemanda ?? [] });
      const vazio = (v) => !String(v ?? '').trim();
      const sugestoes = {
        titulo: [r.titulo?.trim(), vazio],
        municipioId: [r.municipioId, vazio],
        dataDocumento: [r.dataDocumento, (v) => !v || v === hoje],
        palavrasChave: [(r.palavrasChave ?? []).join(', '), vazio],
      };
      setValores((atual) => {
        const proximo = { ...atual };
        const anteriores = {};
        for (const [campo, [valor, livre]] of Object.entries(sugestoes)) {
          if (valor == null || valor === '' || tocados.current.has(campo) || !livre(atual[campo]))
            continue;
          anteriores[campo] = atual[campo];
          proximo[campo] = String(valor);
        }
        setSugeridos(anteriores);
        return proximo;
      });
    } catch (erro) {
      if (minha !== sequencia.current) return;
      setErroPreAnalise(mensagemDeUpload(erro, 'Não foi possível sugerir os dados do documento.'));
    } finally {
      if (minha === sequencia.current) setAnalisando(false);
    }
  }

  function desfazer(campo) {
    tocados.current.delete(campo);
    setValores((atual) => ({ ...atual, [campo]: sugeridos[campo] }));
    setSugeridos((atual) => semCampo(atual, campo));
  }

  const comSugestao = (campo, base) =>
    campo in sugeridos ? (
      <>
        {base && <>{base} </>}
        <span className="badge text-bg-info me-1">sugerido pela pré-análise</span>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 align-baseline"
          onClick={() => desfazer(campo)}
        >
          Desfazer
        </button>
      </>
    ) : (
      base
    );

  useEffect(() => {
    if (tentativas > 0) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    setErroEnvio(null);
    const encontrados = validarDocumento(valores, arquivo, { hoje });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setTentativas((n) => n + 1);
      return;
    }
    setEnviando(true);
    setProgresso(0);
    try {
      const salvo = await enviarDocumento(
        {
          titulo: valores.titulo.trim(),
          descricao: valores.descricao.trim(),
          categoria: valores.categoria.trim(),
          tipo: valores.tipo.trim(),
          dataDocumento: valores.dataDocumento,
          municipioId: valores.municipioId,
          palavrasChave: separarPalavras(valores.palavrasChave),
          demandaId,
        },
        arquivo,
        setProgresso,
      );
      showToast({
        message: demandaId
          ? 'Documento enviado e vinculado à demanda com sucesso.'
          : 'Documento enviado com sucesso.',
      });
      navigate(demandaId ? `/flux/demandas/${demandaId}` : `/docia/documentos/${salvo.id}`);
    } catch (erro) {
      setErroEnvio(mensagemDeUpload(erro));
      setEnviando(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={enviar} aria-label="Dados do documento">
      {demandaId && (
        <div className="alert alert-info" role="status">
          O documento será vinculado à demanda #{demandaId} ao ser enviado.
        </div>
      )}
      {erroEnvio && (
        <div className="alert alert-danger" role="alert">
          {erroEnvio}
        </div>
      )}
      <fieldset disabled={enviando} className="card card-body shadow-sm mb-3">
        <legend className="visually-hidden">Dados do documento</legend>
        <div className="row g-3">
          <Campo
            id="arquivo"
            label="Arquivo"
            obrigatorio
            erro={erros.arquivo}
            className="col-12"
            ajuda={`Formatos: ${EXTENSOES_PERMITIDAS.join(', ').toUpperCase()} · até 10 MB.`}
          >
            {(props) => (
              <input
                {...props}
                type="file"
                accept={EXTENSOES_PERMITIDAS.map((e) => `.${e}`).join(',')}
                onChange={selecionarArquivo}
              />
            )}
          </Campo>
          {arquivo && (
            <p className="small text-body-secondary col-12 mb-0">
              Selecionado: {arquivo.name} ({formatarTamanho(arquivo.size)})
            </p>
          )}
          {(analisando || erroPreAnalise || preAnalise) && (
            <div className="col-12" aria-live="polite">
              {analisando && (
                <div className="small text-body-secondary" role="status">
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Analisando o arquivo para sugerir os dados…
                </div>
              )}
              {erroPreAnalise && (
                <div className="alert alert-warning py-2 mb-0" role="status">
                  {erroPreAnalise} Preencha os campos manualmente.
                </div>
              )}
              {preAnalise && (
                <div className="small">
                  {preAnalise.avisos.map((aviso) => (
                    <div key={aviso} className="alert alert-info py-2 mb-2" role="status">
                      {aviso}
                    </div>
                  ))}
                  {preAnalise.vinculos.length > 0 && (
                    <p className="mb-0">
                      Demandas citadas no conteúdo:{' '}
                      <strong>{preAnalise.vinculos.join(', ')}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <Campo
            id="titulo"
            label="Título"
            obrigatorio
            erro={erros.titulo}
            className="col-12"
            ajuda={comSugestao(
              'titulo',
              `${LIMITES.titulo.min} a ${LIMITES.titulo.max} caracteres.`,
            )}
          >
            {(props) => (
              <input {...props} type="text" value={valores.titulo} onChange={definir('titulo')} />
            )}
          </Campo>
          <Campo id="descricao" label="Descrição" erro={erros.descricao} className="col-12">
            {(props) => (
              <textarea
                {...props}
                rows={3}
                value={valores.descricao}
                onChange={definir('descricao')}
              />
            )}
          </Campo>
          <Campo id="categoria" label="Categoria" obrigatorio erro={erros.categoria}>
            {(props) => (
              <input
                {...props}
                type="text"
                placeholder="Ex.: Relatório técnico"
                value={valores.categoria}
                onChange={definir('categoria')}
              />
            )}
          </Campo>
          <Campo id="tipo" label="Tipo" obrigatorio erro={erros.tipo}>
            {(props) => (
              <input
                {...props}
                type="text"
                placeholder="Ex.: Laudo"
                value={valores.tipo}
                onChange={definir('tipo')}
              />
            )}
          </Campo>
          <Campo
            id="dataDocumento"
            label="Data do documento"
            obrigatorio
            erro={erros.dataDocumento}
            ajuda={comSugestao('dataDocumento')}
          >
            {(props) => (
              <input
                {...props}
                type="date"
                max={hoje}
                value={valores.dataDocumento}
                onChange={definir('dataDocumento')}
              />
            )}
          </Campo>
          <Campo id="municipioId" label="Município (opcional)" ajuda={comSugestao('municipioId')}>
            {(props) => (
              <select
                {...props}
                className="form-select"
                value={valores.municipioId}
                onChange={definir('municipioId')}
              >
                <option value="">Não informado</option>
                {municipios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo
            id="palavrasChave"
            label="Palavras-chave"
            erro={erros.palavrasChave}
            className="col-12"
            ajuda={comSugestao('palavrasChave', 'Separe por vírgula (até 20).')}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                value={valores.palavrasChave}
                onChange={definir('palavrasChave')}
              />
            )}
          </Campo>
        </div>
      </fieldset>

      {enviando && (
        <div className="mb-3" aria-live="polite">
          <div className="small mb-1">Enviando… {progresso}%</div>
          <div
            className="progress"
            role="progressbar"
            aria-label="Progresso do envio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso}
          >
            <div className="progress-bar" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      <div className="d-flex gap-2 flex-wrap">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar documento'}
        </button>
        <Link
          to={demandaId ? `/flux/demandas/${demandaId}` : '/docia/documentos'}
          className="btn btn-outline-secondary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Cadastro de documento (`/docia/documentos/novo`); `?demandaId=` já vincula à demanda. */
export default function DocumentoFormPage() {
  const [searchParams] = useSearchParams();
  const demandaId = searchParams.get('demandaId') || '';
  const municipios = useCarregar(listarMunicipios);

  let conteudo;
  if (municipios.error) {
    conteudo = (
      <ErrorState
        title="Não foi possível carregar o formulário"
        message={mensagemDeErro(municipios.error)}
        onRetry={municipios.recarregar}
      />
    );
  } else if (!municipios.data) {
    conteudo = <Loading message="Carregando formulário..." />;
  } else {
    conteudo = <Formulario municipios={municipios.data} demandaId={demandaId} />;
  }

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Novo documento"
        description="Envie um documento (fictício) para a biblioteca documental."
      />
      {conteudo}
    </>
  );
}
