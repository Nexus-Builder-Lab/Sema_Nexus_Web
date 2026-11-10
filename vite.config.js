import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração do Vite + Vitest.
// /api é sempre relativo: em dev o Vite faz proxy; no Docker, o Nginx (Issue #2).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Bootstrap 5.3 ainda usa @import e funções globais do Sass.
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
          quietDeps: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.js'],
      css: false,
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
