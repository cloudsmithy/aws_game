import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// 网站的根就是 code/：/ 和 /index.html 都是游戏
const game = new URL('../code/index.html', import.meta.url);
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = path === '/' || path === '/index.html' ? game : null;
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const html = await readFile(file);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html);
  } catch {
    response.writeHead(500).end();
  }
});
server.listen(8878, '127.0.0.1');
