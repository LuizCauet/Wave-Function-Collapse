import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Wave-Function-Collapse/',
  server: {
    port: 3000
  },
  build: {
    target: 'esnext'
  }
});
