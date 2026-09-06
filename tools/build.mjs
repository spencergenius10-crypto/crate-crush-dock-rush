#!/usr/bin/env node
/* Production build for mobile web → dist/
 *   node tools/build.mjs            (npm run build)
 *
 * - bundles the ordered <script defer> list from web/index.html into ONE app.<hash>.js
 * - bundles js/dev/* into a separate dev.<hash>.js that main.js lazy-loads (CC_DEV_BUNDLE)
 * - minifies JS + CSS with esbuild when installed (npm i), otherwise plain concat (still 1 request)
 * - inlines the CSS, strips HTML comments, writes .gz and .br siblings (serve with gzip_static / brotli_static)
 * Game source stays plain files in web/ — no build needed to develop. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const DIST = path.join(ROOT, 'dist');
const DEV_SCRIPTS = ['js/dev/sheet.js', 'js/dev/bot.js', 'js/dev/devpanel.js'];

let esbuild = null;
try { esbuild = (await import('esbuild')).default || (await import('esbuild')); } catch (_) { /* optional */ }

const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const appScripts = [...html.matchAll(/<script\s+defer\s+src="([^"]+)"><\/script>/g)].map((m) => m[1]);
if (!appScripts.length) throw new Error('no <script defer src> tags found in web/index.html');
const cssHref = /<link rel="stylesheet" href="([^"]+)" \/>/.exec(html)?.[1];

const read = (rel) => fs.readFileSync(path.join(WEB, rel), 'utf8');
const concat = (list) => list.map((f) => `/* ---- ${f} ---- */\n${read(f)}`).join('\n;\n');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

async function minifyJS(code) {
  if (!esbuild) return code;
  const r = await esbuild.transform(code, { minify: true, target: ['es2018'], legalComments: 'none' });
  return r.code;
}
async function minifyCSS(code) {
  if (!esbuild) return code;
  return (await esbuild.transform(code, { loader: 'css', minify: true })).code;
}

const appSrc = concat(appScripts), devSrc = concat(DEV_SCRIPTS);
const appMin = await minifyJS(appSrc), devMin = await minifyJS(devSrc);
const cssSrc = cssHref ? read(cssHref) : '';
const cssMin = await minifyCSS(cssSrc);
const appName = `app.${hash(appMin)}.js`, devName = `dev.${hash(devMin)}.js`;

let out = html
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .replace(/\s*<script\s+defer\s+src="[^"]+"><\/script>/g, '')
  .replace(/<link rel="stylesheet" href="[^"]+" \/>/, `<style>${cssMin.trim()}</style>`)
  .replace('</body>', `  <script>window.CC_DEV_BUNDLE='${devName}'</script>\n  <script defer src="${appName}"></script>\n</body>`)
  .replace(/\n\s*\n/g, '\n');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const files = { 'index.html': out, [appName]: appMin, [devName]: devMin };
const rows = [];
for (const [name, content] of Object.entries(files)) {
  const buf = Buffer.from(content, 'utf8');
  fs.writeFileSync(path.join(DIST, name), buf);
  const gz = zlib.gzipSync(buf, { level: 9 });
  const br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } });
  fs.writeFileSync(path.join(DIST, name + '.gz'), gz);
  fs.writeFileSync(path.join(DIST, name + '.br'), br);
  rows.push({ name, raw: buf.length, gz: gz.length, br: br.length });
}

// static passthrough: PWA manifest + icons (binary assets are copied as-is, no compression siblings needed)
for (const rel of ['manifest.webmanifest']) if (fs.existsSync(path.join(WEB, rel))) fs.copyFileSync(path.join(WEB, rel), path.join(DIST, rel));
if (fs.existsSync(path.join(WEB, 'icons'))) {
  fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });
  for (const f of fs.readdirSync(path.join(WEB, 'icons'))) if (!f.endsWith('.md')) fs.copyFileSync(path.join(WEB, 'icons', f), path.join(DIST, 'icons', f));
}
if (!fs.existsSync(path.join(WEB, 'icons', 'app-icon-1024.png'))) console.warn('WARN  web/icons/app-icon-1024.png missing — favicon / PWA icon will 404 until the locked asset is dropped (web/icons/README.md)');

const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' KB';
const srcTotal = appScripts.reduce((n, f) => n + fs.statSync(path.join(WEB, f)).size, 0) + (cssHref ? fs.statSync(path.join(WEB, cssHref)).size : 0) + Buffer.byteLength(html);
console.log(`dist/  (${esbuild ? 'esbuild minify' : 'NO minify — run `npm i` for esbuild'})`);
console.log('file'.padEnd(20) + '      raw        gzip      brotli');
for (const r of rows) console.log(r.name.padEnd(20) + kb(r.raw) + '  ' + kb(r.gz) + '  ' + kb(r.br));
const crit = rows.filter((r) => !r.name.startsWith('dev.'));
const sum = (k) => crit.reduce((n, r) => n + r[k], 0);
console.log('-'.repeat(58));
console.log('critical path'.padEnd(20) + kb(sum('raw')) + '  ' + kb(sum('gz')) + '  ' + kb(sum('br')) + `   (2 requests; unbundled source: ${kb(srcTotal).trim()} over ${appScripts.length + 2} requests)`);
