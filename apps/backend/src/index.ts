import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { attachWebSocketServer } from './ws-server.js';

// Loaded here rather than in app.ts so tests (which import createApp directly) never depend on
// a developer's local .env. Real API keys stay server-side only (CLAUDE.md).
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const app = createApp();
const httpServer = createServer(app);
attachWebSocketServer(httpServer);

const port = Number(process.env.PORT ?? 3001);

httpServer.listen(port, () => {
  console.log(`backend listening on :${port}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is not set — POST /api/generate-image will fail with 502');
  }
  if (!process.env.MESHY_API_KEY) {
    console.warn('MESHY_API_KEY is not set — POST /api/generate-3d will fail with 502');
  }
});
