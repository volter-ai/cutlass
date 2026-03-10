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
  }
})
