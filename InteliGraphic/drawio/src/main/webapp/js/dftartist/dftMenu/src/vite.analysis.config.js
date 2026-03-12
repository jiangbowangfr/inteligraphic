import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
    build: {
        lib: {
            entry: 'src/entries/analysis.entry.jsx',
            name: 'DFTAnalysis',                 // 全局：window.DFTAnalysis
            formats: ['iife'],
            fileName: () => 'dft-analysis.iife',  // dist/dft-analysis.iife.js
            cssFileName: 'dft-preview-code.iife'
        },
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
        emptyOutDir: false,                    // ✅ 不要清空 dist
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                manualChunks: undefined,
                entryFileNames: 'dft-analysis.iife.js'
            }
        },
        target: 'es2017',
        sourcemap: false,
        minify: 'esbuild'
    }
});