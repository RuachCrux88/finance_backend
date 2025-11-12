import type { VercelRequest, VercelResponse } from "@vercel/node";
import vercelHandler from "../src/main";

export default async function api(req: VercelRequest, res: VercelResponse) {
  return vercelHandler(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
