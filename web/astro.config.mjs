// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Public origin used for canonical URLs and the sitemap. Set SITE_URL
 * explicitly, or rely on the production URL that Vercel / Netlify expose.
 * Without it the site still builds, just without canonical links or sitemap.
 */
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NETLIFY && process.env.CONTEXT === 'production' && process.env.URL) {
    return process.env.URL;
  }
  return undefined;
}

const site = siteUrl();

export default defineConfig({
  site,
  // e.g. BASE_PATH=/EDTECH for a GitHub Pages project site.
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  // Keep whitespace between inline elements (Astro 7 defaults to 'jsx').
  compressHTML: true,
  // OUT_DIR lets a test build go elsewhere: web/dist is served live by the API container.
  outDir: process.env.OUT_DIR || './dist',
  build: { format: 'directory' },
  integrations: site ? [sitemap()] : [],
  devToolbar: { enabled: false },
});
