// Vercel serverless function - the actual tool endpoint.
// Validates input, runs the risk analysis, returns structured output.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { analyzeWallet } from "../src/handler.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for agent callers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { address } = req.body ?? {};

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing address field" });
  }

  if (!ADDRESS_RE.test(address)) {
    return res.status(400).json({
      error: "Invalid Ethereum address. Expected 0x-prefixed, 42 characters.",
    });
  }

  try {
    const result = await analyzeWallet(address);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(502).json({
      error: "Analysis failed",
      detail: err?.message ?? String(err),
    });
  }
}
