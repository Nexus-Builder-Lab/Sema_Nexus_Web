// Hook PreToolUse do Claude Code (SEMA ALERTA Web). Lê o JSON do hook na stdin.
// Exit 2 + mensagem em português na stderr = bloqueia a chamada. Exit 0 = permite.
import { basename } from 'node:path';

const BS = String.fromCharCode(92);
const SEGREDO = /^\.env(\.(?!example$|sample$|template$|dist$)[\w.-]+)?$/i;
const LEITORES = /(^|[\s;|&(])(cat|type|get-content|gc|less|more|head|tail|bat|nl|tac|od|xxd|strings|select-string|sls|grep|egrep|rg|awk|sed|cut|sort|python3?|node|source|\.|printenv|import-csv|findstr|certutil|copy|cp|cpi|copy-item)(\s|$)/i;

export function ehArquivoSegredo(caminho) {
  return SEGREDO.test(basename(String(caminho).split(BS).join('/')));
}

function tokens(cmd) {
  return cmd.split(/[\s;|&()<>]+/).map((t) => t.replace(/^['"`]+|['"`]+$/g, '')).filter(Boolean);
}

export function avaliar(entrada) {
  const nome = entrada.tool_name || '';
  const inp = entrada.tool_input || {};
  if (['Read', 'Grep', 'Glob', 'NotebookRead'].includes(nome)) {
    const alvo = inp.file_path || inp.path || inp.notebook_path || '';
    if (alvo && ehArquivoSegredo(alvo)) return `Leitura de arquivo de segredos bloqueada (${basename(alvo.split(BS).join('/'))}). Use .env.example como referência; nunca leia nem imprima o .env.`;
    return null;
  }
  const cmd = inp.command;
  if (typeof cmd !== 'string') return null;
  const t = tokens(cmd).map((x) => x.toLowerCase());
  for (let i = 0; i < t.length; i++) {
    const compose = t[i] === 'docker-compose' ? i : t[i] === 'docker' && t[i + 1] === 'compose' ? i + 1 : -1;
    if (compose >= 0) {
      const resto = t.slice(compose + 1);
      const d = resto.indexOf('down');
      if (d >= 0 && resto.slice(d + 1).some((a) => a === '--volumes' || /^-[a-z]*v[a-z]*$/.test(a))) {
        return 'Bloqueado: "docker compose down -v/--volumes" apaga os volumes (banco Oracle e dados da demo). Use "docker compose down" sem -v, ou peça autorização do proprietário.';
      }
    }
    if (t[i] === 'docker' && t[i + 1] === 'volume' && ['rm', 'remove', 'prune'].includes(t[i + 2])) {
      return 'Bloqueado: "docker volume rm/prune" apaga volumes de dados. Peça autorização do proprietário.';
    }
    if (t[i] === 'docker' && t[i + 1] === 'system' && t[i + 2] === 'prune') {
      return 'Bloqueado: "docker system prune" remove recursos Docker (inclusive volumes com --volumes). Peça autorização do proprietário.';
    }
  }
  if (LEITORES.test(cmd) && tokens(cmd).some((x) => ehArquivoSegredo(x))) {
    return 'Bloqueado: leitura/impressão de arquivo .env (segredos). Use .env.example como referência; nunca exiba o conteúdo do .env.';
  }
  return null;
}

async function main() {
  let bruto = '';
  for await (const c of process.stdin) bruto += c;
  let entrada;
  try { entrada = JSON.parse(bruto); } catch { process.exit(0); }
  const motivo = avaliar(entrada);
  if (motivo) { process.stderr.write(`[hook guard SEMA] ${motivo}\n`); process.exit(2); }
}
if (import.meta.url === `file:///${process.argv[1]?.split(BS).join('/')}` || process.argv[1]?.endsWith('guard.mjs')) await main();
