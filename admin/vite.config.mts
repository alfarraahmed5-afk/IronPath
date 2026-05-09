import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    // PR1 design-overhaul addendum: every subsequent PR can `npm run -w admin build`
    // and inspect dist/stats.html to see the kB receipt for what they added. The
    // bundle is already over 500 kB; we want a paper trail before adding more.
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 5173 },
});
