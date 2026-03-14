// vite.preview.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
    build: {
        lib: {
            entry: 'src/entries/preview.entry.jsx',
            name: 'DFTPreviewCode',
            formats: ['iife'],
            fileName: () => 'dft-preview-code.iife.js',
            cssFileName: 'dft-preview-code.iife', // 👈 新增：不需要写 .css 扩展名
        },
        cssCodeSplit: false, // 保证只生成一份 CSS
        assetsInlineLimit: 100000000,
        emptyOutDir: false,                    // ✅ 不要清空 dist
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                manualChunks: undefined,
            },
        },
        target: 'es2017',
        sourcemap: false,
        minify: 'esbuild'
    },
});