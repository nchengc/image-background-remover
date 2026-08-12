import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite 配置。
 *
 * - alias `@` 指向 `src`，与 tsconfig.json 的 paths 保持一致。
 * - build.outDir = `dist`，与 wrangler.toml 的 pages_build_output_dir 保持一致。
 * - server.proxy 仅用于「单独跑 `npm run dev`」的场景：把 /api 转给
 *   `wrangler pages dev`（默认 8788 端口）。若使用 `npm run dev:functions`
 *   （wrangler 在前、vite 在后），浏览器直接访问 8788 即可，不会走到这里。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
});
