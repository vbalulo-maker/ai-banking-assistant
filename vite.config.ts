import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ai-banking-assistant/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});