#!/usr/bin/env node
// Prints paper booklets (and their OMR sheets) to PDF with Playwright inside
// Docker, so the host needs no browser.
//
//   npm run build && npm run pdf                 # every free paper in src/data/papers
//   npm run pdf -- bpsc-tre/set-01               # one paper
//   npm run pdf -- --file ../content/papers/bpsc-tre/mock-01.json   # a paid paper JSON (never published)
//   npm run pdf -- --no-omr                      # booklets only
//
// Output: /home/omkar/EDTECH/output/pdfs/<exam>-<paper-id>.pdf (+ -omr.pdf)
// Override with PDF_OUT=/some/dir. Image: PLAYWRIGHT_IMAGE (default below).
//
// The script runs twice: on the host it starts a short-lived container that
// re-runs this same file with --inside. Inside, a tiny static server serves
// web/dist on 127.0.0.1 and Chromium prints each booklet page. Fonts (Mukta,
// including Devanagari) come from the build itself, so Hindi renders and is
// embedded in the PDF.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMAGE = process.env.PLAYWRIGHT_IMAGE || 'mcr.microsoft.com/playwright:v1.63.0-noble';
const here = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(here, '..');
const args = process.argv.slice(2);
const inside = args.includes('--inside');

function parseArgs(list) {
  const out = { papers: [], file: null, omr: true };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--inside') continue;
    else if (a === '--no-omr') out.omr = false;
    else if (a === '--file') out.file = list[++i];
    else if (/^[a-z0-9-]+\/[a-z0-9-]+$/.test(a)) out.papers.push(a);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const opts = parseArgs(args);

if (!inside) host();
else await container();

/* ------------------------------------------------------------------ host */
function host() {
  const dist = join(WEB, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('web/dist is missing. Run `npm run build` first.');
    process.exit(1);
  }
  const outDir = resolve(process.env.PDF_OUT || join(WEB, '..', 'output', 'pdfs'));
  mkdirSync(outDir, { recursive: true });

  const dockerArgs = [
    'run', '--rm', '--init', '--network', 'none',
    '--user', `${process.getuid()}:${process.getgid()}`,
    '-e', 'HOME=/tmp',
    '-e', `BASE_PATH=${process.env.BASE_PATH || '/'}`,
    '-v', `${WEB}:/web:ro`,
    '-v', `${outDir}:/out`,
    '-w', '/web',
  ];
  const inner = ['node', 'scripts/pdf.mjs', '--inside'];
  if (!opts.omr) inner.push('--no-omr');
  inner.push(...opts.papers);
  if (opts.file) {
    const f = resolve(opts.file);
    if (!existsSync(f)) {
      console.error(`No such file: ${f}`);
      process.exit(1);
    }
    dockerArgs.push('-v', `${dirname(f)}:/paper:ro`);
    inner.push('--file', `/paper/${basename(f)}`);
  }
  console.log(`Printing with ${IMAGE} → ${outDir}`);
  const r = spawnSync('docker', [...dockerArgs, IMAGE, ...inner], { stdio: 'inherit' });
  if (r.error) {
    console.error(`Could not start docker: ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}

/* ------------------------------------------------------------- container */
async function container() {
  const { chromium } = await import('playwright-core');
  const dist = '/web/dist';
  const base = (process.env.BASE_PATH || '/').replace(/\/+$/, '');

  const jobs = [];
  if (opts.file) {
    const paper = JSON.parse(readFileSync(opts.file, 'utf8'));
    if (!/^[a-z0-9-]+$/.test(paper.exam ?? '') || !/^[a-z0-9-]+$/.test(paper.id ?? '')) throw new Error('paper JSON needs exam and id');
    jobs.push({ exam: paper.exam, id: paper.id, json: paper });
  } else if (opts.papers.length) {
    for (const p of opts.papers) {
      const [exam, id] = p.split('/');
      jobs.push({ exam, id });
    }
  } else {
    const root = '/web/src/data/papers';
    for (const exam of existsSync(root) ? readdirSync(root) : []) {
      if (!statSync(join(root, exam)).isDirectory()) continue;
      for (const f of readdirSync(join(root, exam))) if (f.endsWith('.json')) jobs.push({ exam, id: f.slice(0, -5) });
    }
  }
  if (!jobs.length) {
    console.log('No papers to print.');
    return;
  }

  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml' };
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
    let file = join(dist, path);
    if (!file.startsWith(dist + sep) && file !== dist) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((ok) => server.listen(4173, '127.0.0.1', ok));
  const origin = `http://127.0.0.1:4173${base}`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'hi-IN' });
  const footer = (label) => `<div style="width:100%;font-size:7.5pt;color:#444;padding:0 11mm;display:flex;justify-content:space-between;font-family:sans-serif">
    <span>Prashnottar practice paper, not an official document</span><span>${label} · <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

  let failed = 0;
  for (const job of jobs) {
    for (const mode of opts.omr ? ['booklet', 'sheet'] : ['booklet']) {
      const page = await ctx.newPage();
      page.on('pageerror', (e) => console.error(`  page error (${job.exam}/${job.id} ${mode}): ${e.message}`));
      let url;
      if (job.json) {
        // Paid paper: serve the JSON in place of the API so it never touches the build.
        await page.route('**/api/papers/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(job.json) }));
        url = `${origin}/play/?exam=${job.exam}&paper=${job.id}&mode=${mode}&pdf=1`;
      } else {
        url = `${origin}/${job.exam}/${job.id}/${mode}/?pdf=1`;
      }
      const out = `/out/${job.exam}-${job.id}${mode === 'sheet' ? '-omr' : ''}.pdf`;
      try {
        const res = await page.goto(url, { waitUntil: 'networkidle' });
        if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()} for ${url}`);
        await page.waitForSelector('html[data-ready]', { timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        const devanagari = await page.evaluate(() => document.fonts.check('16px Mukta', 'प्रश्न'));
        if (!devanagari) console.warn('  warning: Mukta (Devanagari) not loaded');
        await page.emulateMedia({ media: 'print' });
        await page.pdf({
          path: out,
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: footer(`${job.exam} / ${job.id}${mode === 'sheet' ? ' · OMR' : ''}`),
        });
        console.log(`  ✓ ${out.replace('/out/', '')}`);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${job.exam}/${job.id} ${mode}: ${e.message}`);
      } finally {
        await page.close();
      }
    }
  }
  await browser.close();
  server.close();
  if (failed) process.exit(1);
}
