import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置。
 *
 * - alias `@` 与 vite.config.ts / tsconfig.json 保持一致
 * - 默认 node 环境（纯逻辑 + Pages Functions 集成测，依赖 Node 22 的
 *   全局 fetch / FormData / Blob / Request / Response）
 * - 组件测试文件用文件头 `// @vitest-environment jsdom` 单独切换环境
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    restoreMocks: true,
    testTimeout: 10_000,
  },
});
