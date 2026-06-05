// Serves the ERC-8257 manifest at /.well-known/ai-tool/wallet-risk-score.json
// This is what the registry's metadataURI points to.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { manifest } from "../src/manifest.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json(manifest);
}
