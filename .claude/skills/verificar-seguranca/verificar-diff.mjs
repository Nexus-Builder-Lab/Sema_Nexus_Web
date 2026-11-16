#!/usr/bin/env node
// SEMA ALERTA — varre as linhas ADICIONADAS do diff em busca de segredos e dados proibidos.
// Uso (na raiz do repositório): node .claude/skills/verificar-seguranca/verificar-diff.mjs [base]
//   base padrão: origin/main. Considera commits do branch + alterações não commitadas + arquivos novos não rastreados.
// Nunca imprime o valor de um segredo: só arquivo, linha e o tipo do achado.
// Saída 1 se houver achado BLOQUEANTE; avisos não reprovam.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const base = process.argv[2] || 'origin/main';
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const raiz = git(['rev-parse', '--show-toplevel']).trim();
// Checkout principal (em worktree, o .env fica lá, não no worktree).
const principal = dirname(resolve(raiz, git(['rev-parse', '--git-common-dir']).trim()));

// Valores reais de segredos do .env da API (se existir) — só para comparação, nunca exibidos.
const segredosLocais = [];
const candidatos = [join(raiz, '.env'), join(principal, '.env'), join(principal, '..', 'Sema_Nexus_API', '.env')];
for (const env of [...new Set(candidatos)]) {
  if (!existsSync(env)) continue;
  for (const linha of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*(ESRI_API_KEY|ORACLE_PASSWORD|APP_DB_PASSWORD|JWT_SECRET|[A-Z_]*(SECRET|PASSWORD|TOKEN|KEY))\s*=\s*['"]?([^'"#\s]+)/);
    if (m && m[3].length >= 12) segredosLocais.push({ nome: m[1], valor: m[3] });
  }
}

const BLOQUEANTES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'],
  [/\bAAP[KT][A-Za-z0-9._~-]{20,}/, 'chave de API da Esri/ArcGIS'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'token do GitHub'],
  [/\bsk-(ant-)?[A-Za-z0-9_-]{20,}/, 'chave de API (sk-)'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'chave AWS'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT completo'],
  [/[?&](token|api_?key|key)=(?!\$)[A-Za-z0-9._~-]{16,}/i, 'segredo em query string'],
  [/\bVITE_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_?KEY)[A-Z0-9_]*\s*[:=]/, 'segredo em variável VITE_* (vai para o bundle)'],
  [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, 'CPF (dado pessoal)'],
];
const AVISOS = [
  [/(password|senha|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s$]{8,}['"]/i, 'possível credencial literal'],
  [/\b12345678\b/, 'senha do usuário de teste fora dos arquivos permitidos'],
];
// Onde a credencial demonstrativa pode aparecer em texto puro (CLAUDE.md do projeto).
const PERMITIDOS_SENHA_DEMO = [
  /^(README\.md|CLAUDE\.md|docs\/DEMO\.md|docs\/DOCKER\.md)$/,
  /(^|\/)src\/test\//, /\.test\.(js|jsx|mjs)$/, /^scripts\/tests\//, /^\.github\/workflows\//,
  /^src\/mocks\//, /^\.claude\/skills\//,
];
const ARQUIVOS_PROIBIDOS = [/(^|\/)\.env$/, /(^|\/)\.env\.(local|prod|production)$/, /\.(pem|p12|pfx|jks|keystore)$/];

// Linhas adicionadas: commits do branch + working tree; arquivos novos não rastreados lidos inteiros.
const diff = git(['diff', '--unified=0', '--no-color', '--no-ext-diff', base]);
const adicionadas = [];
let arquivo = null, linhaNo = 0;
for (const l of diff.split('\n')) {
  if (l.startsWith('+++ ')) { arquivo = l.slice(4).replace(/^b\//, ''); continue; }
  const h = l.match(/^@@ -\S+ \+(\d+)/);
  if (h) { linhaNo = Number(h[1]); continue; }
  if (l.startsWith('+') && arquivo && arquivo !== '/dev/null') adicionadas.push({ arquivo, linha: linhaNo++, texto: l.slice(1) });
}
const novos = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
for (const f of novos) {
  let conteudo = '';
  try { conteudo = readFileSync(join(raiz, f), 'utf8'); } catch { continue; }
  conteudo.split(/\r?\n/).forEach((texto, i) => adicionadas.push({ arquivo: f, linha: i + 1, texto }));
}
const alterados = new Set([...git(['diff', '--name-only', base]).split('\n').filter(Boolean), ...novos]);

const achados = [];
for (const f of alterados) {
  if (ARQUIVOS_PROIBIDOS.some((r) => r.test(f)) && !/\.example$/.test(f)) achados.push({ nivel: 'BLOQUEANTE', arquivo: f, linha: '-', tipo: 'arquivo de segredo no Git' });
}
for (const a of adicionadas) {
  if (a.arquivo === '.claude/skills/verificar-seguranca/verificar-diff.mjs') continue; // os próprios padrões
  for (const s of segredosLocais) {
    if (a.texto.includes(s.valor)) achados.push({ nivel: 'BLOQUEANTE', ...a, tipo: `valor real de ${s.nome} do .env` });
  }
  for (const [re, tipo] of BLOQUEANTES) if (re.test(a.texto)) achados.push({ nivel: 'BLOQUEANTE', ...a, tipo });
  for (const [re, tipo] of AVISOS) {
    if (!re.test(a.texto)) continue;
    if (tipo.startsWith('senha do usuário') && PERMITIDOS_SENHA_DEMO.some((p) => p.test(a.arquivo))) continue;
    if (tipo.startsWith('possível') && PERMITIDOS_SENHA_DEMO.slice(1).some((p) => p.test(a.arquivo))) continue;
    achados.push({ nivel: 'AVISO', ...a, tipo });
  }
}

console.log(`Base: ${base} · arquivos alterados: ${alterados.size} · linhas adicionadas: ${adicionadas.length} · segredos do .env comparados: ${segredosLocais.length}`);
if (!achados.length) { console.log('OK: nenhum achado.'); process.exit(0); }
for (const a of achados) console.log(`${a.nivel}: ${a.arquivo}:${a.linha} — ${a.tipo}`);
const bloq = achados.filter((a) => a.nivel === 'BLOQUEANTE').length;
console.log(`${bloq} bloqueante(s), ${achados.length - bloq} aviso(s). Avisos exigem conferência manual, não reprovam.`);
process.exit(bloq ? 1 : 0);
