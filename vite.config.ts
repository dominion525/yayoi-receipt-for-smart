import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    hmr: {
      clientPort: 443
    },
    // ngrok経由のアクセスを許可
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.app'
    ]
  }
})