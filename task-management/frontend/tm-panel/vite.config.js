import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process': '{"env":{"NODE_ENV":"production"}}',
  },
  build: {
    outDir: '../static',
    emptyOutDir: false,
    lib: {
      entry: 'src/panel.jsx',
      name: 'TaskManagementPanel',
      fileName: () => 'panel.js',
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
    },
  },
})
