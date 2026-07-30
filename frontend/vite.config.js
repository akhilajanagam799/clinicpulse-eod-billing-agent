import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone vite config for the frontend package.
// When running from the repo root, the root vite.config.ts is used instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
