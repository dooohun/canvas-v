import { Router } from 'express';
import { resolveStoredFilePath } from '../lib/storage.js';

export const uploadsRouter: Router = Router();

uploadsRouter.get('/uploads/:filename', (req, res) => {
  const filePath = resolveStoredFilePath(req.params.filename);
  if (!filePath) {
    res.status(400).json({ error: 'invalid filename' });
    return;
  }

  res.sendFile(filePath, (error) => {
    if (error) {
      res.status(404).json({ error: 'not found' });
    }
  });
});
