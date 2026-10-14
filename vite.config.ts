import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, open: true },
  // allow Render's *.onrender.com hostname when served with `npm start`
  preview: { allowedHosts: true },
  build: { chunkSizeWarningLimit: 2000 },
});
