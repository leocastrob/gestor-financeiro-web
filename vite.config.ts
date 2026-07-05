import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Desabilita o HMR para evitar o alerta de rede local
    // quando acessar pelo Cloudflare Tunnel (4G/5G)
    hmr: false,

    // Proxy: redireciona /api/* para a API Fastify (porta 3000)
    // Isso funciona porque front e API rodam no mesmo Moto G
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
