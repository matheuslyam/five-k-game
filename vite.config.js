import { defineConfig } from 'vite';

// Base './' é obrigatório: o jogo é servido via rewrite proxy
// lyam.dev.br/five-k-game/ -> five-k-game.vercel.app/
// Com base '/' os assets resolveriam para lyam.dev.br/assets/... (tela branca).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js']
  }
});
