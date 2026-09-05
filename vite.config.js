import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { proxy: { '/socket': { target: 'ws://localhost:3001', ws: true } } },
  build: { target: 'es2022', rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
});
