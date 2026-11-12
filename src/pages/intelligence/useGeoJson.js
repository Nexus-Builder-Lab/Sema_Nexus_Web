import { useEffect, useState } from 'react';

/** Carrega uma malha GeoJSON local (public/geo) — o mapa funciona sem internet. */
export default function useGeoJson(url) {
  const [dados, setDados] = useState(null);
  useEffect(() => {
    let ativo = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => ativo && setDados(json))
      .catch(() => ativo && setDados(null));
    return () => {
      ativo = false;
    };
  }, [url]);
  return dados;
}
