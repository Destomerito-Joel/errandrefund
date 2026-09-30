import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  // The runnable application now lives in /frontend; keep root-level Nuxt commands aligned.
  srcDir: 'frontend/app/',
  compatibilityDate: '2025-07-15',
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  tailwindcss: { viewer: false },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api',
    },
  },
  typescript: { strict: true, typeCheck: false },
});
