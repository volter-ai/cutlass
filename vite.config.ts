import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Library build: `vite build --mode lib`
  if (mode === 'lib') {
    return {
      plugins: [react(), tailwindcss()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/lib.ts'),
          name: 'Cutlass',
          fileName: 'cutlass',
          formats: ['es'],
        },
        outDir: 'dist/lib',
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
    }
  }

  // Default: standalone app build
  return {
    plugins: [react(), tailwindcss()],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      proxy: {
        // Proxy OpenAI API calls through the dev server to avoid CORS issues
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          secure: true,
        },
      },
    },
    optimizeDeps: {
      // Exclude @ffmpeg/ffmpeg from Vite's pre-bundling so Vite handles
      // new URL("./worker.js", import.meta.url) correctly — without this,
      // esbuild flattens the package into /node_modules/.vite/deps/@ffmpeg_ffmpeg.js
      // and the relative worker.js URL resolves to a 404, causing ffmpeg.load() to hang.
      exclude: ['@ffmpeg/ffmpeg'],
    },
  }
})
