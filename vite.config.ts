import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/riccio/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cras: resolve(__dirname, 'cras.html'),
        riccio: resolve(__dirname, 'riccio.html'),
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
