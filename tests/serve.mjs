import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { PeerServer } from 'peer';

// 仅本机测试：官方 PeerServer 承担真实信令；控制接口只操作本进程的测试 WebSocket。
const clients = new Map(), blocked = new Set(), counts = {};
let signal;
await new Promise(resolve => { signal = PeerServer({ host: '127.0.0.1', port: Number(process.env.AWS_GAME_SIGNAL_PORT || 8879), path: '/', concurrent_limit: 32 }, resolve); });
signal.on('connection', client => {
  const id = client.getId(); clients.set(id, client);
  if (blocked.has(id)) client.getSocket()?.close();
});
signal.on('disconnect', client => { if (clients.get(client.getId()) === client) clients.delete(client.getId()); });
signal.on('message', (_client, m) => { counts[m.type] = (counts[m.type] || 0) + 1; });

// 网站的根就是 code/：/ 和 /index.html 都是游戏
const game = new URL('../code/index.html', import.meta.url);
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost'), path = url.pathname;
  if (path === '/__test/signal') {
    const id = url.searchParams.get('peer');
    if (request.method === 'POST' && id) {
      if (url.searchParams.get('block') === '1') blocked.add(id); else blocked.delete(id);
      clients.get(id)?.getSocket()?.close();
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ clients: [...clients.keys()], blocked: [...blocked], counts }));
    return;
  }
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
server.listen(Number(process.env.AWS_GAME_TEST_PORT || 8878), '127.0.0.1');
