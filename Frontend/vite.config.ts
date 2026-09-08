import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // El contenedor corre sobre un bind mount (./Frontend:/app en
    // docker-compose): los eventos inotify del filesystem del host no
    // siempre llegan al watcher de Vite dentro del contenedor, así que
    // ediciones desde fuera del contenedor podían quedar sin detectarse y
    // el dev server seguía sirviendo el bundle viejo hasta reiniciarlo
    // manualmente. Con polling, Vite revisa los archivos activamente en
    // vez de depender de esos eventos.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
