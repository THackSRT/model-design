import { createServer, type Server } from 'node:http';
import { ENGINE_VERSION } from './version.js';

/** Serveur HTTP minimal : `GET /health`. Le calcul n'est pas encore exposé (tâche suivante). */
export function createHealthServer(): Server {
  return createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ name: 'drape', version: ENGINE_VERSION }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/problem+json' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Not Found', status: 404 }));
  });
}
