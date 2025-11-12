import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cached: ((req: VercelRequest, res: VercelResponse) => Promise<void>) | null = null;

async function loadHandler() {
  const modulePaths = [
    '../dist/src/main.js',
    '../dist/main.js',
    '../dist/src/main.mjs',
    '../dist/main.mjs',
  ];

  let lastError: unknown;

  for (const relPath of modulePaths) {
    try {
      const absolute = path.join(__dirname, relPath);
      const mod = await import(pathToFileURL(absolute).href);
      if (typeof mod.default === 'function') {
        return mod.default as (req: VercelRequest, res: VercelResponse) => Promise<void>;
      }
      if (typeof mod.vercelHandler === 'function') {
        return mod.vercelHandler;
      }
      if (typeof mod === 'function') {
        return mod as (req: VercelRequest, res: VercelResponse) => Promise<void>;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to locate compiled Nest handler');
}

async function getServer() {
  if (!cached) {
    cached = await loadHandler();
  }
  return cached;
}

export default async function vercelApiHandler(req: VercelRequest, res: VercelResponse) {
  const server = await getServer();
  return server(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
