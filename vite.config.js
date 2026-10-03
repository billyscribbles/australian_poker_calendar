/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { theme } from './src/config/theme.config.js'
import { createAdminHandler } from './admin/handler.mjs'
import { createApiHandler } from './server/api.mjs'
import { createStore } from './server/store.mjs'
import { createMediaHandler } from './server/media.mjs'
import { withRuntimeContent } from './scripts/lib/document.mjs'

// The day this bundle is built, exposed to the app as import.meta.env.VITE_BUILD_DATE.
//
// WHY: the calendar page defaults to "this month" and marks "today", but the
// prerender runs on the build machine and hydration runs in the visitor's
// browser. If each took `new Date()` the static document and the first client
// render would disagree whenever a deploy outlives the day it was built, and
// React would throw the prerendered body away. Both sides read this instead
// (see src/lib/useToday.js), and the real date takes over after hydration.
// Any VITE_-prefixed process.env var is forwarded to import.meta.env by Vite.
process.env.VITE_BUILD_DATE ??= new Date().toISOString().slice(0, 10)

/**
 * Injects the webfont links named in theme.config.js into <head>.
 *
 * WHY A PLUGIN RATHER THAN HARDCODED TAGS IN index.html: the font stack is part
 * of the brand and changes per site, so index.html would have to be
 * hand-edited in lockstep with theme.config — and when it wasn't, the page
 * silently rendered the fallback family instead. It did, for months. Deriving
 * the tags from the same object the CSS variables come from means picking a font
 * is a one-line edit in one file, and forgetting to load it is impossible.
 *
 * Runs in dev and in the build, so what you see locally is what ships.
 */
function webfonts() {
  const families = theme.googleFonts ?? []
  return {
    name: 'site-webfonts',
    transformIndexHtml() {
      if (!families.length) return []
      const href =
        'https://fonts.googleapis.com/css2?' +
        families.map((f) => `family=${f}`).join('&') +
        // swap: show the fallback immediately rather than blocking paint on the
        // download. The metric differences cause a visible reflow, which is why
        // the stacks in theme.config name a same-category fallback.
        '&display=swap'
      return [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          injectTo: 'head-prepend',
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
          injectTo: 'head-prepend',
        },
        { tag: 'link', attrs: { rel: 'stylesheet', href }, injectTo: 'head' },
      ]
    },
  }
}

/**
 * The dashboard at /admin, the forms' /api/enquiry and the uploaded media at
 * /media on the dev server, as on the site server. All read and write .data/
 * (see server/store.mjs). The published stories and shorts are written into
 * the page as the production server writes them, so `yarn dev` shows them
 * (client-rendered, as everything is in dev) instead of the demo cards.
 */
function admin(mode) {
  const store = createStore()
  // Vite keeps .env out of process.env; the forms' Formspree id lives there.
  const { VITE_FORMSPREE_ID: formspreeId = '' } = loadEnv(mode, process.cwd(), 'VITE_')
  const handlers = [
    createApiHandler({ store, formspreeId }),
    createAdminHandler({ store }),
    createMediaHandler({ dir: store.content.mediaDir }),
  ]
  return {
    name: 'site-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!handlers.some((handle) => handle(req, res))) next()
      })
    },
    transformIndexHtml: {
      order: 'post',
      handler: (html) => withRuntimeContent(html, store.content.publicContent()),
    },
  }
}

// `yarn build:analyze` sets ANALYZE=true to emit dist/bundle-stats.html.
const analyze = process.env.ANALYZE === 'true'

// `yarn build` runs this config twice: once for the browser bundle, then again
// with --ssr for src/entry-prerender.jsx, whose output scripts/prerender.mjs
// imports to render every route to static HTML. The two passes want different
// rollup output, so the config is a function of the build kind.
export default defineConfig(({ isSsrBuild, mode }) => ({
  plugins: [
    react(),
    webfonts(),
    admin(mode),
    analyze && visualizer({ filename: 'dist/bundle-stats.html', gzipSize: true }),
  ].filter(Boolean),
  preview: {
    host: '0.0.0.0',
    port: 4173,
    // Railway assigns a per-deploy *.up.railway.app subdomain plus any custom
    // domains. The leading dot makes Vite treat this as a wildcard, so we
    // don't have to update the config every deploy.
    allowedHosts: ['.up.railway.app'],
    // Baseline security headers. NOTE: `vite preview` is no longer what serves
    // production — server/index.mjs is, and it sets the same headers. This block
    // covers running `vite preview` directly to debug a build.
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    // scripts/prerender.mjs reads dist/.vite/manifest.json to find the CSS and
    // JS chunk belonging to each route and links them from that route's static
    // document. Without it a prerendered page paints against the entry
    // stylesheet only, then restyles when its own CSS arrives.
    manifest: !isSsrBuild,
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              motion: ['framer-motion'],
            },
          },
    },
  },
  ssr: {
    // Bundled into the SSR output rather than left external. framer-motion
    // resolves through browser-only entry conditions, and react-helmet-async is
    // CommonJS — Node's ESM loader refuses named imports from it, so the
    // prerender entry only gets { Helmet, HelmetProvider } if Vite does the
    // interop at build time.
    noExternal: ['framer-motion', 'react-helmet-async'],
  },
  // Vitest runs the "contract" suite — see src/test/.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
}))
