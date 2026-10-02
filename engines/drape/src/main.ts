import { createHealthServer } from './server.js';

const port = Number(process.env['PORT'] ?? 8000);

createHealthServer().listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', msg: 'drape listening', port }));
});
