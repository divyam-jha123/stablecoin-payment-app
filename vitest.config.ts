import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@traveller/shared': fileURLToPath(
        new URL('./packages/shared/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/api/**/*.test.ts'],
    environment: 'node',
  },
});
