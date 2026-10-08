import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // O three.js sozinho tem ~650 kB; não é um problema para um jogo
    chunkSizeWarningLimit: 1000,
  },
});
