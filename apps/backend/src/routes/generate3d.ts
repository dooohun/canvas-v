import { Router } from 'express';
import { ExternalApiError } from '../lib/externalApiError.js';
import { generateModel } from '../lib/meshyClient.js';
import { saveBuffer } from '../lib/storage.js';

export const generate3dRouter: Router = Router();

const SERVED_IMAGE_PATH = /^\/uploads\/[^/]+$/;

generate3dRouter.post('/api/generate-3d', async (req, res) => {
  const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl : '';
  if (!SERVED_IMAGE_PATH.test(imageUrl)) {
    res.status(400).json({ error: 'imageUrl is required' });
    return;
  }

  const absoluteImageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;

  try {
    const buffer = await generateModel(absoluteImageUrl);
    const { url } = saveBuffer(buffer, 'model.glb');
    res.status(200).json({ modelUrl: url });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      res.status(error.status).json({
        error: error.status === 429 ? 'rate limited, try again later' : '3d generation failed',
      });
      return;
    }
    res.status(502).json({ error: '3d generation failed' });
  }
});
