import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: true,
    },
  },
  build: {
    rolldownOptions: {
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'entries/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // All React and React-dependent UI libraries in one chunk to avoid circular deps
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/react-i18next') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-')) {
            return 'vendor-react'
          }

          // Auth vendor
          if (id.includes('node_modules/@supabase/supabase-js')) {
            return 'vendor-auth'
          }

          // i18n core
          if (id.includes('node_modules/i18next') && !id.includes('react-i18next')) {
            return 'vendor-i18n'
          }

          // Utility libraries (no React dependency)
          if (id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'vendor-utils'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'i18next',
      'react-i18next',
    ],
  },
})
