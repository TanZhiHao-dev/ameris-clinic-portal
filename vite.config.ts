import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // PGlite ships WASM resolved via import.meta.url — keep it external so the
  // bundler doesn't mangle the WASM lookup at runtime.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  ssr: { external: ['@electric-sql/pglite', 'postgres'] },
  worker: { format: 'es' },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//, '@electric-sql/pglite'] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
