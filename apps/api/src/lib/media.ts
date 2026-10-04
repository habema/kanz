import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Uploaded logos, images, sounds and videos. In Docker this is a volume, so
// they survive rebuilds.
export const mediaDir = path.resolve(process.env.MEDIA_DIR ?? 'data/media');
mkdirSync(mediaDir, { recursive: true });

export const mediaTypes: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};
