import { Router } from 'express';
import { ExternalApiError } from '../lib/externalApiError.js';
import { generateImage } from '../lib/openaiClient.js';
import { saveBuffer } from '../lib/storage.js';

export const generateImageRouter: Router = Router();

generateImageRouter.post('/api/generate-image', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  try {
    const buffer = await generateImage(prompt);
    const { url } = saveBuffer(buffer, 'generated.png');
    res.status(200).json({ imageUrl: url });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      res.status(error.status).json({
        error: error.status === 429 ? 'rate limited, try again later' : 'image generation failed',
      });
      return;
    }
    res.status(502).json({ error: 'image generation failed' });
  }
});
