import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Le studio appelle les services à travers /api (la passerelle en production, ce proxy en local).
export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ['source'] },
  server: {
    port: 5173,
    proxy: {
      '/api/designs': {
        target: 'http://localhost:3101',
        rewrite: (path) => path.replace(/^\/api\/designs/, ''),
      },
    },
  },
  test: { environment: 'jsdom', include: ['test/**/*.test.tsx'], setupFiles: ['test/setup.ts'] },
});
