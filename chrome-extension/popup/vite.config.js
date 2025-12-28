import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  base: './', // Use relative paths for Chrome extension
  plugins: [
    react(),
    {
      name: 'copy-pdf-worker',
      writeBundle() {
        // Copy PDF.js worker to build directory
        try {
          const workerPath = resolve(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
          const destPath = resolve(__dirname, '..', 'popup-build', 'pdf.worker.min.js');
          copyFileSync(workerPath, destPath);
          console.log('✓ Copied PDF.js worker to build directory');
        } catch (e) {
          console.warn('Failed to copy PDF.js worker:', e);
        }
      }
    }
  ],
  build: {
    outDir: resolve(__dirname, '..', 'popup-build'),
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    },
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});

