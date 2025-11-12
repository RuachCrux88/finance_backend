import path from "node:path";
import { pathToFileURL } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type RequestHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

let cached: RequestHandler | null = null;

async function loadHandler(): Promise<RequestHandler> {
  const modulePaths = [
    "../dist/src/main.js",
    "../dist/main.js",
    "../dist/src/main.mjs",
    "../dist/main.mjs",
    "../dist/main.cjs",
  ];

  let lastError: unknown;

  for (const relPath of modulePaths) {
    try {
      const absolute = path.join(__dirname, relPath);
      const mod = await import(pathToFileURL(absolute).href);
      const candidate =
        (typeof mod.default === "function" && mod.default) ||
        (typeof mod.vercelHandler === "function" && mod.vercelHandler) ||
        (typeof mod === "function" ? mod : null);

      if (candidate) {
        return candidate as RequestHandler;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to locate compiled Nest handler");
}

async function getServer(): Promise<RequestHandler> {
  if (!cached) {
    cached = await loadHandler();
  }
  if (!cached) {
    throw new Error("Handler not initialized");
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
