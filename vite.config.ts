import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const localPackageAliases = {
  '@laix/ditto-core-engine': path.join(workspaceRoot, 'package/ditto-core-engine/src/index.ts'),
  '@laix/ditto-ui-components': path.join(workspaceRoot, 'package/ditto-ui-components/src/index.ts'),
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: './.env',
  plugins: [react()],
  resolve: {
    alias: mode === 'localhost' ? localPackageAliases : {},
    dedupe: ['react', 'react-dom'],
  },
  server: mode === 'localhost'
    ? {
        proxy: {
          '/api-proxy': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            rewrite: (requestPath) => requestPath.replace(/^\/api-proxy/, ''),
          },
        },
      }
    : undefined,
}))
