import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  /** 使用相对路径，便于将 dist 作为静态文件本地打开或部署到任意子路径 */
  base: './',
})
