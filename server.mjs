import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
// 只对外提供页面需要的文件：入口、源码、样式和图片素材。
const publicFiles = new Set(['index.html']);
const publicDirs = ['src/', 'styles/', 'assets/'];

http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filename = resolve(root, relative);
    if (!filename.startsWith(root.endsWith(sep) ? root : root + sep) || (!publicFiles.has(relative) && !publicDirs.some(dir => relative.startsWith(dir)))) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`拾间 is ready at http://localhost:${port}`));
