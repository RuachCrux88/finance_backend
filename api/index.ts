import type { VercelRequest, VercelResponse } from '@vercel/node';

let cached: ((req: VercelRequest, res: VercelResponse) => Promise<void>) | null = null;

async function getServer() {
  if (!cached) {
    const mod = await import('../dist/src/main.js');
    const handler = mod.default ?? mod;
    if (typeof handler !== 'function') {
      throw new Error('Serverless handler is not a function');
    }
    cached = handler as (req: VercelRequest, res: VercelResponse) => Promise<void>;
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
