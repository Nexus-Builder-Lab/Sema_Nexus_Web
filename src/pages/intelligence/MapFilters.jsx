import { useId } from 'react';
import FilterBar from '../../components/FilterBar.jsx';

function Selecao({ id, label, valor, onChange, vazio, opcoes, className }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label small mb-1">
        {label}
      </label>
      <select id={id} className="form-select" value={valor} onChange={onChange}>
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Filtros do mapa (município, bioma, categoria, período). Aplicados ao clicar em Filtrar. */
export default function MapFilters({
  valores,
  onChange,
  onSubmit,
  onClear,
  municipios,
  biomas,
  categorias,
}) {
  const id = useId();
  const set = (campo) => (event) => onChange({ ...valores, [campo]: event.target.value });

  return (
    <FilterBar label="Filtros do mapa" onSubmit={onSubmit} onClear={onClear}>
      <Selecao
        id={`${id}-mun`}
        className="col-12 col-md-6 col-xl-3"
        label="Município"
        vazio="Todos"
        valor={valores.municipioId}
        onChange={set('municipioId')}
        opcoes={municipios.map((m) => ({ valor: m.id, rotulo: m.nome }))}
      />
      <Selecao
        id={`${id}-bio`}
        className="col-6 col-md-3 col-xl-2"
        label="Bioma"
        vazio="Todos"
        valor={valores.bioma}
        onChange={set('bioma')}
        opcoes={biomas.map((b) => ({ valor: b.codigo, rotulo: b.rotulo }))}
      />
      <Selecao
        id={`${id}-cat`}
        className="col-6 col-md-3 col-xl-3"
        label="Categoria"
        vazio="Todas"
        valor={valores.categoria}
        onChange={set('categoria')}
        opcoes={categorias.map((c) => ({ valor: c.codigo, rotulo: c.rotulo }))}
      />
      <div className="col-6 col-md-3 col-xl-2">
        <label htmlFor={`${id}-de`} className="form-label small mb-1">
          Recebidas de
        </label>
        <input
          id={`${id}-de`}
          type="date"
          className="form-control"
          value={valores.de}
          max={valores.ate || undefined}
          onChange={set('de')}
        />
      </div>
      <div className="col-6 col-md-3 col-xl-2">
        <label htmlFor={`${id}-ate`} className="form-label small mb-1">
          Recebidas até
        </label>
        <input
          id={`${id}-ate`}
          type="date"
          className="form-control"
          value={valores.ate}
          min={valores.de || undefined}
          onChange={set('ate')}
        />
      </div>
      <div className="col-6 col-md-3 col-xl-2">
        <label htmlFor={`${id}-sde`} className="form-label small mb-1">
          Satélite (INPE) de
        </label>
        <input
          id={`${id}-sde`}
          type="date"
          className="form-control"
          value={valores.satDe}
          max={valores.satAte || undefined}
          onChange={set('satDe')}
        />
      </div>
      <div className="col-6 col-md-3 col-xl-2">
        <label htmlFor={`${id}-sate`} className="form-label small mb-1">
          Satélite (INPE) até
        </label>
        <input
          id={`${id}-sate`}
          type="date"
          className="form-control"
          value={valores.satAte}
          min={valores.satDe || undefined}
          onChange={set('satAte')}
        />
      </div>
    </FilterBar>
  );
}
