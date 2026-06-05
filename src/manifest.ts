// ERC-8257 Tool Manifest
// This defines the tool's identity, inputs/outputs, and pricing for the registry.

export const manifest = {
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "wallet-risk-score",
  description:
    "Analyze an Ethereum wallet address and return a risk score based on onchain activity patterns: age, transaction volume, token diversity, and protocol interactions.",
  version: "0.1.0",
  endpoint: "https://wallet-risk-tool.vercel.app/api/tool",
  tags: ["wallet", "risk", "security", "analysis", "defi"],
  creatorAddress: "0xa102a2cb8aac6c7d2c477412ebb7d41d0ce53495",
  inputs: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "Ethereum wallet address (0x-prefixed, 42 characters)",
      },
    },
    required: ["address"],
  },
  outputs: {
    type: "object",
    properties: {
      address: { type: "string", description: "Normalized input address" },
      risk_score: {
        type: "number",
        description: "Risk score from 0 (safe) to 100 (dangerous)",
      },
      risk_level: {
        type: "string",
        description: "Human-readable risk level: low, medium, high, critical",
      },
      factors: {
        type: "object",
        description: "Breakdown of individual risk signals",
        properties: {
          wallet_age_days: { type: "number" },
          tx_count: { type: "number" },
          unique_tokens: { type: "number" },
          has_ens: { type: "boolean" },
          protocol_interactions: { type: "number" },
        },
      },
      summary: {
        type: "string",
        description: "One-sentence risk assessment",
      },
    },
  },
} as const;
