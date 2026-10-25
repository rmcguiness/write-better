import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!path.startsWith(root + '/') && path !== root) { res.writeHead(403).end(); return; }
  const dynamicRoute = /^\/(piece|learn)\/[^/]+$/.exec(new URL(req.url, 'http://localhost').pathname);
  const fallback = dynamicRoute ? `${root}/${dynamicRoute[1]}/[id].html` : root + '/index.html';
  for (const file of [path, path + '.html', path + '/index.html', fallback]) {
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
      return;
    } catch { /* Try static route or SPA fallback for saved piece IDs. */ }
  }
  res.writeHead(404).end();
}).listen(4173, '127.0.0.1');
