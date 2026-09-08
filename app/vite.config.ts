import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// PAGES_BASE=/repo-name/ → static build for GitHub Pages (no worker); otherwise Cloudflare Worker build.
const pagesBase = process.env.PAGES_BASE;

export default defineConfig({
  base: pagesBase || '/',
  plugins: [react(), ...(pagesBase ? [] : [cloudflare()])],
  build: { chunkSizeWarningLimit: 1600 },
});
