// Prova automatizada dos hooks: executa guard.mjs de verdade (stdin JSON) e confere exit code. Uso: node .claude/hooks/test-hooks.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const guard = fileURLToPath(new URL('./guard.mjs', import.meta.url));
const BS = String.fromCharCode(92);
const B = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const P = (command) => ({ tool_name: 'PowerShell', tool_input: { command } });
const R = (file_path) => ({ tool_name: 'Read', tool_input: { file_path } });
const G = (o) => ({ tool_name: 'Grep', tool_input: o });
const casos = [
  ['Grep glob .env* bloqueado', G({ pattern: 'KEY', glob: '.env*' }), 2],
  ['Grep em src permitido', G({ pattern: 'KEY', path: 'src' }), 0],
  ['cat .e* bloqueado', B('cat .e*'), 2],
  ['cat .en? bloqueado', B('cat .en?'), 2],
  ['cat com aspas bloqueado', B('cat ".env"'), 2],
  ['ReadAllText bloqueado', P('[IO.File]::ReadAllText(".env")'), 2],
  ['readFileSync bloqueado', B('node -e "fs.readFileSync(\'.env\')"'), 2],
  ['Read com espaço final bloqueado', R('/repo/.env '), 2],
  ['docker compose rm -sv bloqueado', B('docker compose rm -sv'), 2],
  ['docker rm -v bloqueado', P('docker rm -v meu'), 2],
  ['docker compose rm sem -v permitido', B('docker compose rm -f'), 0],
  ['stdin null sai 0', 'null', 0],
  ['down -v bloqueado', B('docker compose down -v'), 2],
  ['down --volumes bloqueado (PowerShell)', P('docker compose down --volumes --remove-orphans'), 2],
  ['down sem -v permitido', B('docker compose down'), 0],
  ['volume rm bloqueado', B('docker volume rm sema_nexus_oracle'), 2],
  ['volume ls permitido', B('docker volume ls'), 0],
  ['volume prune bloqueado', P('docker volume prune -f'), 2],
  ['system prune bloqueado', B('docker system prune -af --volumes'), 2],
  ['docker ps permitido', B('docker ps'), 0],
  ['cat .env bloqueado', B('cat .env'), 2],
  ['Get-Content .env.local bloqueado', P('Get-Content .' + BS + '.env.local'), 2],
  ['type .env bloqueado', P('type C:' + BS + 'SEMANEXUS' + BS + '.env'), 2],
  ['cat .env.example permitido', B('cat .env.example'), 0],
  ['Read .env bloqueado', R('C:' + BS + 'SEMANEXUS' + BS + '.env'), 2],
  ['Read .env.local bloqueado', R('/repo/.env.local'), 2],
  ['Read .env.example permitido', R('/repo/.env.example'), 0],
  ['git status permitido', B('git status'), 0],
];
let falhas = 0;
for (const [nome, entrada, esperado] of casos) {
  const r = spawnSync(process.execPath, [guard], { input: typeof entrada === 'string' ? entrada : JSON.stringify(entrada), encoding: 'utf8' });
  const ok = r.status === esperado && (esperado === 0 || /BLOQUEADO/.test(r.stderr));
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome} (exit ${r.status})`);
}
console.log(`${casos.length - falhas}/${casos.length} casos ok`);
process.exit(falhas ? 1 : 0);
