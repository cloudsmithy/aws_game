import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const file = new URL('../index.html', import.meta.url);
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path !== '/' && path !== '/index.html') {
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
