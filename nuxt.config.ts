// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@comark/nuxt',
    '@nuxthub/core',
    'nuxt-auth-utils',
    'nuxt-charts',
    'nuxt-csurf'
  ],

  devtools: {
    enabled: true
  },

  css: [
    '@lichess-org/chessground/assets/chessground.base.css',
    '@lichess-org/chessground/assets/chessground.brown.css',
    '@lichess-org/chessground/assets/chessground.cburnett.css',
    '~/assets/css/main.css'
  ],

  experimental: {
    viewTransition: true
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    experimental: {
      openAPI: true
    }
  },

  hub: {
    db: 'sqlite',
    blob: true
  },

  vite: {
    optimizeDeps: {
      include: ['striptags']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    clientBundle: {
      scan: true
    },
    serverBundle: {
      collections: ['lucide', 'simple-icons', 'logos']
    }
  }
})
