import { defineConfig } from 'vitest/config';
import path from 'node:path';

const alias = Object.fromEntries(['core', 'ui', 'job-sites', 'testing'].map((p) => [`@ext/${p}`, path.resolve(__dirname, `packages/${p}/src/index.ts`)]));

export default defineConfig({
  define: { __DEV__: 'true' },
  resolve: { alias },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'extensions/*/test/**/*.test.ts', 'tools/*/test/**/*.test.{ts,mjs}', 'extensions/*/pipeline/test/**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/._*'],
    environment: 'node',
  },
});
