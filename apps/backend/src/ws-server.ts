import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', () => {
    // Room-based Yjs sync/awareness relay is implemented by the ws-protocol feature.
  });

  return wss;
}
