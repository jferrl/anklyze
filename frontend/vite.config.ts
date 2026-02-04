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
    rollupOptions: {
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'entries/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // React vendor chunk
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }

          // UI vendor chunk (Radix UI)
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui'
          }

          // Chart vendor
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts'
          }

          // Query vendor
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query'
          }

          // Auth vendor
          if (id.includes('node_modules/@supabase/supabase-js')) {
            return 'vendor-auth'
          }

          // i18n vendor
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n'
          }

          // Utils vendor
          if (id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'vendor-utils'
          }

          // Admin pages chunked by function
          if (id.includes('/src/pages/admin/dashboard')) {
            return 'admin-dashboard'
          }
          if (id.includes('/src/pages/admin') && id.includes('editor')) {
            return 'admin-editors'
          }
          if (id.includes('/src/pages/admin/analytics')) {
            return 'admin-analytics'
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
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
