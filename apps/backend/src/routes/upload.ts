import { Router } from 'express';
import multer, { MulterError } from 'multer';
import { saveBuffer } from '../lib/storage.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'model/gltf-binary',
  'model/gltf+json',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadRouter: Router = Router();

uploadRouter.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'file too large' });
      return;
    }
    if (error) {
      res.status(400).json({ error: 'upload failed' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }
    if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
      res.status(400).json({ error: 'unsupported file type' });
      return;
    }

    const { url } = saveBuffer(req.file.buffer, req.file.originalname);
    res.status(200).json({ url });
  });
});
