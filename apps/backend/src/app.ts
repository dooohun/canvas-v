import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { generate3dRouter } from './routes/generate3d.js';
import { generateImageRouter } from './routes/generateImage.js';
import { uploadRouter } from './routes/upload.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(generateImageRouter);
  app.use(generate3dRouter);
  app.use(uploadRouter);
  app.use(uploadsRouter);

  // Express's default error handler renders an HTML page with a stack trace (information
  // disclosure) and breaks the `{ error: string }` contract every route in this app follows —
  // this replaces it, e.g. for express.json()'s SyntaxError on malformed request bodies.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'invalid JSON body' });
      return;
    }
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
