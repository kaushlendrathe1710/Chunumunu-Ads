import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, './.env') });

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client/src'),
      '@client': path.resolve(import.meta.dirname, 'client'),
      '@server': path.resolve(import.meta.dirname, 'server'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'wouter',
            '@tanstack/react-query',
            'date-fns',
            'axios',
            'lucide-react',
            'framer-motion',
            '@aws-sdk/client-s3',
            '@stripe/react-stripe-js',
            '@stripe/stripe-js',
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
      'date-fns',
      'axios',
      'lucide-react',
      'framer-motion',
      '@aws-sdk/client-s3',
    ],
  },
  server: {
    fs: {
      allow: [],
    },
  },
});
