import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    open: false, // Don't open browser automatically
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Configure CSS in the output bundle
    cssCodeSplit: true,
    // Set this to control how asset URLs are processed
    assetsInlineLimit: 4096, // 4kb
  },
  // Add environment variable prefixes
  envPrefix: ['VITE_'],
});