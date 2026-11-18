import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), UnoCSS()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        // 每个 SCSS 入口（含 SFC 的 <style lang="scss">）自动注入设计令牌与混入，
        // 组件内无需再手写 @use。只能注入不产生 CSS 输出的文件（变量 / 混入 / 函数）。
        additionalData: `@use '@/styles/variables' as *;\n@use '@/styles/mixins' as *;\n`,
      },
    },
  },

  server: {
    port: 5173,
    open: false,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
