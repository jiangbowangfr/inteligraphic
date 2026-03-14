import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
    build: {
        lib: {
            entry: 'src/entries/load.entry.jsx',
            name: 'DFTLoad',                 // 全局：window.DFTLoad
            formats: ['iife'],
            fileName: () => 'dft-load.iife',  // 生成 dist/dft-load.iife.js
            cssFileName: 'dft-load.iife',      // 生成 dist/dft-load.iife.css
        },
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
        // 第一次保留默认：清空 dist
        emptyOutDir: true,
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                manualChunks: undefined,
                entryFileNames: 'dft-load.iife.js' // 强制文件名
            }
        },
        target: 'es2017',
        sourcemap: false,
        minify: 'esbuild'
    }
});