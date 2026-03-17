// vite.status.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
  build: {
    lib: {
      entry: 'src/entries/status.entry.jsx',
      name: 'DFTStatus',                 // 全局 window.DFTStatus
      formats: ['iife'],
      fileName: () => 'dft-status.iife', // dist/dft-status.iife.js
      cssFileName: 'dft-status.iife',    // dist/dft-status.iife.css
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    emptyOutDir: false,
    rollupOptions: { output: { inlineDynamicImports: true, manualChunks: undefined, entryFileNames: 'dft-status.iife.js' } },
    target: 'es2017',
    sourcemap: false,
    minify: 'esbuild'
  }
});
