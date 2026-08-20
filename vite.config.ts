import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [react()],
  server: {
    host: '::',
    port: 8080,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '::',
    port: 8080,
    strictPort: true,
  },
  // Pre-bundle deps comunes para acelerar dev y reducir transformaciones en frío.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
      '@tanstack/react-query',
      '@tanstack/react-virtual',
      '@supabase/supabase-js',
      'dexie',
      'dexie-react-hooks',
    ],
  },
  esbuild: {
    // En producción, eliminar console.* y debugger para reducir bundle y ruido.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
  build: {
    // Targets modernos → menos polyfills, código más pequeño y rápido.
    target: 'es2020',
    cssCodeSplit: true,
    // Acelera el build saltando el cálculo de tamaño gz por chunk.
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          // Núcleo React separado del resto para mejor caché entre deploys.
          'react-vendor': ['react', 'react-dom'],
          vendor: ['framer-motion'],
          utils: ['xlsx'],
          ui: ['lucide-react', '@tanstack/react-virtual', '@tanstack/react-query'],
          charts: ['recharts'],
          db: ['@supabase/supabase-js', 'dexie', 'dexie-react-hooks'],
        },
      },
    },
  },
}));
