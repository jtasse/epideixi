import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Amplify/S3 serve 404.html for unknown paths so /auth/callback loads the SPA. */
function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const indexPath = path.resolve(dirname, 'dist/index.html');
      const fallbackPath = path.resolve(dirname, 'dist/404.html');
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, fallbackPath);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback404()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
});
