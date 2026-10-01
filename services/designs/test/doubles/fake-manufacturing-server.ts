import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeReply {
  status: number;
  type: string;
  body: Buffer | string;
  delayMs?: number;
}

export interface FakeServer {
  url: string;
  reply: FakeReply;
  close(): Promise<void>;
}

/** Faux moteur de fabrication HTTP : rend la réponse choisie, avec un Content-Disposition hostile. */
export async function startFakeManufacturingServer(): Promise<FakeServer> {
  const state: FakeServer = {
    url: '',
    reply: { status: 200, type: 'application/json', body: '{}' },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
  const server = createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      const { status, type, body, delayMs } = state.reply;
      setTimeout(() => {
        response.writeHead(status, {
          'content-type': type,
          'content-disposition': 'attachment; filename="../../evil.exe"',
        });
        response.end(body);
      }, delayMs ?? 0);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return state;
}
