// Vercel serverless function - the actual tool endpoint.
// Validates input, runs the risk analysis, returns structured output.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { gracefulWalletCard, formatWalletRoastCard, resolveWalletInput } from "../src/card.js";
import { analyzeWallet } from "../src/handler.js";
import { withPayment } from "../src/x402.js";

function readBody(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for agent callers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Payment, X-X402-Payment");
  res.setHeader("Access-Control-Expose-Headers", "X-Payment-Response, X-Payment-Required");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(200).json(gracefulWalletCard("Use POST /api/tool with { address } to get a Wallet Roast card."));
  }

  return withPayment(req, res, async () => {
    const { address } = readBody(req);
    if (!address || typeof address !== "string") {
      return { body: gracefulWalletCard("Missing address. Paste a 0x Ethereum address or ENS name.") };
    }
    const resolved = await resolveWalletInput(address);
    if (!resolved.ok) return { body: gracefulWalletCard(resolved.message, address) };

    try {
      const result = await analyzeWallet(resolved.address);
      return { body: formatWalletRoastCard(result, resolved.label) };
    } catch {
      return { body: gracefulWalletCard("Wallet analysis could not complete. Try again shortly.", resolved.label) };
    }
  });
}
