#!/usr/bin/env node
/* Zero-dependency static server that behaves like a production edge for mobile testing:
 *   node tools/serve.mjs [dir=dist] [port=8080]
 * - serves precompressed .br / .gz siblings when the client accepts them (what CDNs / nginx *_static do)
 * - hashed bundles (app.<hash>.js, dev.<hash>.js) get `Cache-Control: immutable`; index.html is no-cache
 * - prints the LAN URL to open on a phone on the same Wi-Fi */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = path.resolve(process.argv[2] || 'dist');
const port = parseInt(process.argv[3] || '8080', 10);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.jsonl': 'application/x-ndjson' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(dir, p);
  if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', Vary: 'Accept-Encoding' };
  headers['Cache-Control'] = /\.[0-9a-f]{8}\.js$/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache';
  const ae = req.headers['accept-encoding'] || '';
  let src = file;
  if (/\bbr\b/.test(ae) && fs.existsSync(file + '.br')) { src = file + '.br'; headers['Content-Encoding'] = 'br'; }
  else if (/\bgzip\b/.test(ae) && fs.existsSync(file + '.gz')) { src = file + '.gz'; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = fs.statSync(src).size;
  res.writeHead(200, headers);
  fs.createReadStream(src).pipe(res);
}).listen(port, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal);
  console.log(`serving ${dir}\n  local  http://localhost:${port}/\n  phone  http://${lan ? lan.address : '<your-ip>'}:${port}/`);
});
