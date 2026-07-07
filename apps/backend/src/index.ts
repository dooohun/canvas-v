import { createServer } from 'node:http';
import { createApp } from './app.js';
import { attachWebSocketServer } from './ws-server.js';

const app = createApp();
const httpServer = createServer(app);
attachWebSocketServer(httpServer);

const port = Number(process.env.PORT ?? 3001);

httpServer.listen(port, () => {
  console.log(`backend listening on :${port}`);
});
