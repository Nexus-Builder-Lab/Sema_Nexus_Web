/**
 * Pré-visualização simples e segura de Markdown: só títulos (#), listas (-, *), parágrafos e
 * **negrito**, tudo como elementos React (nada de HTML bruto; links aparecem como texto).
 */
function linha(texto) {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .map((parte, i) =>
      parte.startsWith('**') && parte.endsWith('**') && parte.length > 4 ? (
        <strong key={i}>{parte.slice(2, -2)}</strong>
      ) : (
        parte
      ),
    );
}

export default function MarkdownSeguro({ texto }) {
  const blocos = [];
  let lista = null;
  String(texto ?? '')
    .split(/\r?\n/)
    .forEach((bruta, i) => {
      const t = bruta.trimEnd();
      const item = /^\s*[-*]\s+(.*)$/.exec(t);
      if (item) {
        if (!lista) {
          lista = [];
          blocos.push({ tipo: 'ul', itens: lista, i });
        }
        lista.push(item[1]);
        return;
      }
      lista = null;
      const titulo = /^(#{1,6})\s+(.*)$/.exec(t);
      if (titulo) {
        blocos.push({ tipo: 'h', nivel: Math.min(titulo[1].length + 2, 6), texto: titulo[2], i });
      } else if (t.trim()) {
        blocos.push({ tipo: 'p', texto: t, i });
      }
    });
  return (
    <div className="nx-minuta-preview">
      {blocos.map((b) => {
        if (b.tipo === 'ul') {
          return (
            <ul key={b.i}>
              {b.itens.map((it, k) => (
                <li key={k}>{linha(it)}</li>
              ))}
            </ul>
          );
        }
        if (b.tipo === 'h') {
          const H = `h${b.nivel}`;
          return <H key={b.i}>{linha(b.texto)}</H>;
        }
        return <p key={b.i}>{linha(b.texto)}</p>;
      })}
    </div>
  );
}
