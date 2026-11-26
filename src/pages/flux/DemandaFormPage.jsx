import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cadastrarDemanda, detalharDemanda, editarDemanda } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { STATUS_EDITAVEIS } from '../../auth/perfis.js';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { hojeISO } from '../../utils/datas.js';
import AreaPoligonoField from './AreaPoligonoField.jsx';
import { carregarCatalogosFlux } from './catalogosFlux.js';
import {
  errosDaApi,
  LIMITES,
  montarCorpo,
  validarDemanda,
  valoresDaDemanda,
  valoresDaUrl,
  VALORES_INICIAIS,
} from './validarDemanda.js';

/** Campo com rótulo, mensagem de erro associada (`aria-describedby`) e `aria-invalid`. */
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

function Opcoes({ itens = [], vazio }) {
  return (
    <>
      <option value="">{vazio}</option>
      {itens.map((item) => (
        <option key={item.codigo} value={item.codigo}>
          {item.rotulo}
        </option>
      ))}
    </>
  );
}

function Formulario({ inicial, catalogos, demanda }) {
  const editando = Boolean(demanda);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const formRef = useRef(null);
  const [valores, setValores] = useState(inicial);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [tentativas, setTentativas] = useState(0);

  const bloqueada = editando && !STATUS_EDITAVEIS.includes(demanda.status);
  const areaOriginal = editando
    ? { areaHa: demanda.areaHa ?? null, areaGeometria: demanda.areaGeometria ?? null }
    : null;
  const tinhaArea = Boolean(
    areaOriginal && (areaOriginal.areaHa != null || areaOriginal.areaGeometria != null),
  );
  const definir = (campo) => (e) => setValores((atual) => ({ ...atual, [campo]: e.target.value }));
  const hoje = hojeISO();

  // Leva o foco ao primeiro campo inválido depois de cada envio com erro.
  useEffect(() => {
    if (tentativas > 0) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [tentativas]);

  async function enviar(event) {
    event.preventDefault();
    if (enviando || bloqueada) return;

    const encontrados = validarDemanda(valores, { municipios: catalogos.municipios, hoje });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setTentativas((n) => n + 1);
      return;
    }

    setEnviando(true);
    try {
      const corpo = montarCorpo(valores, catalogos.municipios, { editando, areaOriginal });
      const salva = editando
        ? await editarDemanda(demanda.id, corpo)
        : await cadastrarDemanda(corpo);
      showToast({
        message: editando
          ? `Demanda ${salva.numero} atualizada com sucesso.`
          : `Demanda ${salva.numero} cadastrada com sucesso.`,
      });
      navigate(`/flux/demandas/${salva.id}`);
    } catch (erro) {
      const status = erro.response?.status;
      const doBackend = errosDaApi(erro.response?.data?.errors);
      if (status === 400 && Object.keys(doBackend).length > 0) {
        setErros(doBackend);
        setTentativas((n) => n + 1);
      } else {
        showToast({
          variant: 'danger',
          message:
            status === 403
              ? 'Seu perfil não tem permissão para esta operação.'
              : mensagemDeErro(erro, 'Não foi possível salvar a demanda.'),
        });
      }
      setEnviando(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={enviar} aria-label="Dados da demanda">
      {bloqueada && (
        <div className="alert alert-warning" role="alert">
          Esta demanda está em <strong>{demanda.status}</strong> e não pode mais ser editada
          (somente nos status PENDENTE ou EM_TRIAGEM).
        </div>
      )}
      <fieldset disabled={bloqueada || enviando} className="card card-body shadow-sm mb-3">
        <legend className="visually-hidden">Dados da demanda</legend>
        <div className="row g-3">
          <Campo
            id="titulo"
            label="Título"
            obrigatorio
            erro={erros.titulo}
            className="col-12"
            ajuda={`${LIMITES.titulo.min} a ${LIMITES.titulo.max} caracteres.`}
          >
            {(props) => (
              <input {...props} type="text" value={valores.titulo} onChange={definir('titulo')} />
            )}
          </Campo>

          <Campo
            id="descricao"
            label="Descrição"
            obrigatorio
            erro={erros.descricao}
            className="col-12"
          >
            {(props) => (
              <textarea
                {...props}
                rows={4}
                value={valores.descricao}
                onChange={definir('descricao')}
              />
            )}
          </Campo>

          <Campo id="origem" label="Origem" obrigatorio erro={erros.origem}>
            {(props) => (
              <select
                {...props}
                className={props.className.replace('form-control', 'form-select')}
                value={valores.origem}
                onChange={definir('origem')}
              >
                <Opcoes itens={catalogos.origens} vazio="Selecione" />
              </select>
            )}
          </Campo>

          <Campo id="categoria" label="Categoria (sugerida)" erro={erros.categoria}>
            {(props) => (
              <select
                {...props}
                className={props.className.replace('form-control', 'form-select')}
                value={valores.categoria}
                onChange={definir('categoria')}
              >
                <Opcoes itens={catalogos.categorias} vazio="Não informada" />
              </select>
            )}
          </Campo>

          <Campo
            id="municipio"
            label="Município (MT)"
            obrigatorio
            erro={erros.municipio}
            ajuda="Digite para buscar e escolha um município de Mato Grosso."
          >
            {(props) => (
              <>
                <input
                  {...props}
                  type="text"
                  list="municipios-mt"
                  autoComplete="off"
                  value={valores.municipio}
                  onChange={definir('municipio')}
                />
                <datalist id="municipios-mt">
                  {catalogos.municipios.map((m) => (
                    <option key={m.id} value={m.nome} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>

          <Campo
            id="localidade"
            label="Localidade"
            erro={erros.localidade}
            ajuda="Fazenda, comunidade, rodovia…"
          >
            {(props) => (
              <input
                {...props}
                type="text"
                value={valores.localidade}
                onChange={definir('localidade')}
              />
            )}
          </Campo>

          <Campo
            id="latitude"
            label="Latitude (opcional)"
            erro={erros.latitude}
            ajuda="Entre -18,1 e -7,3."
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                value={valores.latitude}
                onChange={definir('latitude')}
              />
            )}
          </Campo>

          <Campo
            id="longitude"
            label="Longitude (opcional)"
            erro={erros.longitude}
            ajuda="Entre -61,7 e -50,2."
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                value={valores.longitude}
                onChange={definir('longitude')}
              />
            )}
          </Campo>

          <AreaPoligonoField
            areaGeometria={valores.areaGeometria}
            areaHa={valores.areaHa}
            removerArea={valores.removerArea}
            editando={editando}
            tinhaArea={tinhaArea}
            disabled={bloqueada || enviando}
            erroAreaHa={erros.areaHa}
            erroAreaGeometria={erros.areaGeometria}
            onChangeAreaHa={(valor) =>
              setValores((atual) => ({ ...atual, areaHa: valor, removerArea: false }))
            }
            onAplicarGeometria={({ geometria, areaHa, centroide }) =>
              setValores((atual) => ({
                ...atual,
                areaGeometria: geometria,
                areaHa: String(areaHa).replace('.', ','),
                removerArea: false,
                ...(centroide
                  ? {
                      latitude: String(centroide.latitude).replace('.', ','),
                      longitude: String(centroide.longitude).replace('.', ','),
                    }
                  : {}),
              }))
            }
            onRemoverArea={() =>
              setValores((atual) => ({
                ...atual,
                areaGeometria: null,
                areaHa: '',
                removerArea: editando && tinhaArea,
              }))
            }
            onDesfazerRemocao={() =>
              setValores((atual) => ({
                ...atual,
                areaGeometria: areaOriginal?.areaGeometria ?? null,
                areaHa:
                  areaOriginal?.areaHa != null ? String(areaOriginal.areaHa).replace('.', ',') : '',
                removerArea: false,
              }))
            }
          />

          <Campo
            id="dataRecebimento"
            label="Data de recebimento"
            obrigatorio
            erro={erros.dataRecebimento}
          >
            {(props) => (
              <input
                {...props}
                type="date"
                max={hoje}
                value={valores.dataRecebimento}
                onChange={definir('dataRecebimento')}
              />
            )}
          </Campo>

          <Campo id="prioridade" label="Prioridade (sugerida)" erro={erros.prioridade}>
            {(props) => (
              <select
                {...props}
                className={props.className.replace('form-control', 'form-select')}
                value={valores.prioridade}
                onChange={definir('prioridade')}
              >
                <Opcoes itens={catalogos.prioridades} vazio="Não informada" />
              </select>
            )}
          </Campo>

          <Campo
            id="prazoSugerido"
            label="Prazo sugerido"
            erro={erros.prazoSugerido}
            ajuda="O prazo definitivo é fixado na distribuição."
          >
            {(props) => (
              <input
                {...props}
                type="date"
                min={valores.dataRecebimento || undefined}
                value={valores.prazoSugerido}
                onChange={definir('prazoSugerido')}
              />
            )}
          </Campo>

          <Campo id="observacoes" label="Observações" erro={erros.observacoes} className="col-12">
            {(props) => (
              <textarea
                {...props}
                rows={3}
                value={valores.observacoes}
                onChange={definir('observacoes')}
              />
            )}
          </Campo>
        </div>
      </fieldset>

      <div className="d-flex gap-2 flex-wrap">
        <button type="submit" className="btn btn-primary" disabled={bloqueada || enviando}>
          {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar demanda'}
        </button>
        <Link to="/flux/demandas" className="btn btn-outline-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Cadastro (`/flux/demandas/nova`) e edição (`/flux/demandas/:id/editar`) de demanda. */
export default function DemandaFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const editando = Boolean(id);

  const catalogos = useCarregar(carregarCatalogosFlux);
  const carregarDemanda = useCallback(
    () => (editando ? detalharDemanda(id) : Promise.resolve(null)),
    [editando, id],
  );
  const demanda = useCarregar(carregarDemanda);

  const titulo = editando ? 'Editar demanda' : 'Nova demanda';
  const erro = catalogos.error || demanda.error;
  const carregando = catalogos.loading || demanda.loading;

  let conteudo;
  if (erro) {
    conteudo = (
      <ErrorState
        title={
          demanda.error?.response?.status === 404
            ? 'Demanda não encontrada'
            : 'Não foi possível carregar o formulário'
        }
        message={mensagemDeErro(erro)}
        onRetry={() => {
          catalogos.recarregar();
          demanda.recarregar();
        }}
      />
    );
  } else if (carregando) {
    conteudo = <Loading message="Carregando formulário..." />;
  } else {
    const pedeMunicipio = ['municipioId', 'municipio'].some((c) => searchParams.get(c));
    const semMunicipio =
      !demanda.data && pedeMunicipio && !valoresDaUrl(searchParams, catalogos.data).municipio;
    conteudo = (
      <>
        {semMunicipio && (
          <div className="alert alert-warning" role="status">
            O município informado no atalho não foi encontrado no catálogo de Mato Grosso:
            selecione-o manualmente.
          </div>
        )}
        <Formulario
          // Recria o formulário ao trocar de demanda, reaproveitando o estado só dentro da mesma.
          key={id ?? 'nova'}
          inicial={
            demanda.data
              ? valoresDaDemanda(demanda.data)
              : {
                  ...VALORES_INICIAIS,
                  dataRecebimento: hojeISO(),
                  ...valoresDaUrl(searchParams, catalogos.data, location.state),
                }
          }
          catalogos={catalogos.data}
          demanda={demanda.data}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        module="Flux"
        title={editando && demanda.data ? `${titulo} ${demanda.data.numero}` : titulo}
        description="Campos marcados com * são obrigatórios. O número da demanda é gerado ao salvar."
      />
      {conteudo}
    </>
  );
}
