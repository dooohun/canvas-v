import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BACKEND_ORIGIN = 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Keeps the REST calls and generated asset URLs same-origin in dev, so the client can use the
  // relative paths from docs/api-spec.md verbatim and the backend needs no CORS handling.
  server: {
    proxy: {
      '/api': BACKEND_ORIGIN,
      '/uploads': BACKEND_ORIGIN,
    },
  },
});
