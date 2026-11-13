// @vitest-environment node
// Garante as regras da imagem Docker do Web (Issue #2): SPA fallback, proxy /api,
// usuário não-root e nenhum segredo/arquivo de ambiente no contexto de build.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

describe('imagem Docker do Web', () => {
  const dockerfile = read('Dockerfile');
  const nginx = read('nginx/default.conf.template');
  const dockerignore = read('.dockerignore').split(/\r?\n/);

  it('usa build multi-stage com node:22-alpine e runtime nginx-unprivileged', () => {
    expect(dockerfile).toMatch(/^FROM node:22-alpine AS build/m);
    expect(dockerfile).toMatch(/^FROM nginxinc\/nginx-unprivileged:alpine/m);
    expect(dockerfile).toMatch(/RUN npm ci/);
    expect(dockerfile).toMatch(/RUN npm run build/);
  });

  it('executa como não-root, expõe 8080 e tem HEALTHCHECK', () => {
    expect(dockerfile).toMatch(/^USER 101$/m);
    expect(dockerfile).toMatch(/^EXPOSE 8080$/m);
    expect(dockerfile).toMatch(/^HEALTHCHECK /m);
    expect(nginx).toMatch(/listen 8080;/);
    expect(nginx).toMatch(/location = \/healthz/);
  });

  it('faz fallback SPA e proxy de /api para host configurável', () => {
    expect(nginx).toMatch(/try_files \$uri \$uri\/ \/index\.html;/);
    expect(nginx).toMatch(/location \/api\/ \{/);
    expect(nginx).toMatch(/set \$api_upstream \$\{API_UPSTREAM\};/);
    expect(dockerfile).toMatch(/API_UPSTREAM=http:\/\/api:8080/);
  });

  it('não leva segredos nem arquivos de ambiente para a imagem', () => {
    for (const entry of ['node_modules', 'dist', '.git', '.env*']) {
      expect(dockerignore).toContain(entry);
    }
    // Única exceção: a referência à variável da visão de satélite (Web#107) — o valor vem do .env pelo
    // compose em tempo de execução, nunca do arquivo.
    const semReferenciaEsri = nginx
      .replaceAll('token=$esri_key', '')
      .replaceAll('${ESRI_API_KEY}', '');
    expect(`${dockerfile}\n${semReferenciaEsri}`).not.toMatch(
      /12345678|password|secret|api[_-]?key|\btoken\b/i,
    );
  });

  it('a chave da Esri só é lida da variável de ambiente (nenhum valor no Nginx ou no Dockerfile)', () => {
    expect(nginx).toContain('set $esri_key "${ESRI_API_KEY}";');
    expect(nginx).toMatch(/\?token=\$esri_key;/);
    expect(nginx).not.toMatch(/token=(?!\$esri_key)/);
    expect(nginx).not.toMatch(/AAPT[A-Za-z0-9._~-]{10,}/); // prefixo das API Keys do ArcGIS
    expect(dockerfile).not.toMatch(/ESRI/);
  });
});
