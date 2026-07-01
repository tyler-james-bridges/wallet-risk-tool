import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE = "https://wallet-risk-tool.vercel.app";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).json({
    openapi: "3.1.0",
    info: {
      title: "Wallet Risk Tool",
      version: "1.0.0",
      description:
        "x402-paid Ethereum wallet behavior scoring. Agents can submit a wallet address or ENS name and receive a Wallet Roast risk card.",
      "x-guidance":
        "Call POST /api/tool with an address field containing an Ethereum address or ENS name. The route is payable with x402 on Base USDC and returns a wallet_roast card after payment, including graceful cards for invalid inputs.",
      contact: { url: BASE },
    },
    servers: [{ url: BASE }],
    paths: {
      "/api/tool": {
        post: {
          operationId: "wallet_roast",
          summary: "Score and roast an Ethereum wallet",
          tags: ["Wallets", "x402"],
          "x-payment-info": {
            price: { mode: "fixed", currency: "USD", amount: "0.100000" },
            protocols: [{ x402: {} }],
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    address: {
                      type: "string",
                      minLength: 3,
                      description: "Ethereum address or ENS name to score.",
                    },
                  },
                  required: ["address"],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Wallet Roast card",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["ok", "type", "score", "tier", "breakdown", "roast", "summary"],
                    properties: {
                      ok: { type: "boolean" },
                      type: { const: "wallet_roast" },
                      address: { type: "string" },
                      label: { type: "string" },
                      score: { type: ["number", "null"] },
                      tier: { type: "string" },
                      breakdown: { type: "object" },
                      roast: { type: "string" },
                      summary: { type: "string" },
                    },
                  },
                },
              },
            },
            "402": { description: "Payment Required" },
          },
        },
      },
    },
  });
}
