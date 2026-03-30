import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Aumenta o aviso de chunk (padrão 500kb — firebase é grande)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separa firebase em chunk próprio para melhor cache
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/messaging'],
          leaflet:  ['leaflet'],
        },
      },
    },
  },
})
