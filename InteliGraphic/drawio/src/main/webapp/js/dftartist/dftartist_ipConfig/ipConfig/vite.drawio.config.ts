import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(() => {
  const app = process.env.APP || 'all'
  const entry = resolve(__dirname, "src/apps/all-entry.ts");

  return {
    plugins: [react()],

    // 关键：把 React 里用到的 process.env.NODE_ENV 直接替换成字符串
    define: {
      'process.env.NODE_ENV': '"production"',
    },

    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      cssCodeSplit: false,

      rollupOptions: {
        input: entry,
        output: {
          format: 'iife',
          name: 'DFTS',
          entryFileNames: `${app}.entry.js`,
          inlineDynamicImports: true, // 关键：禁止拆包，变成单文件
        },
      },
    },
  }
})
