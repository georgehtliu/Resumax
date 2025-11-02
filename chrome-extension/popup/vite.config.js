import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './', // Use relative paths for Chrome extension
  plugins: [react()],
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

