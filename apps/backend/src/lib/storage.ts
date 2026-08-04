import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE_DIR = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '..',
  'uploads',
);

export function saveBuffer(
  buffer: Buffer,
  originalName: string,
): { filename: string; url: string } {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
  const filename = `${randomUUID()}-${originalName}`;
  writeFileSync(path.join(STORAGE_DIR, filename), buffer);
  return { filename, url: `/uploads/${filename}` };
}

export function resolveStoredFilePath(filename: string): string | null {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  return path.join(STORAGE_DIR, filename);
}
