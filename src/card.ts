import { createPublicClient, getAddress, http, isAddress } from "viem";
import { mainnet } from "viem/chains";

type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskResult = {
  address: string;
  risk_score: number;
  risk_level: RiskLevel;
  factors: {
    wallet_age_days: number;
    tx_count: number;
    unique_tokens: number;
    has_ens: boolean;
    protocol_interactions: number;
  };
  summary: string;
};

export type WalletRoastCard = {
  ok: true;
  type: "wallet_roast";
  address?: string;
  label?: string;
  score: number | null;
  tier: RiskLevel | "unknown";
  breakdown: {
    walletAgeDays?: number;
    txCount?: number;
    tokenDiversity?: number;
    ens?: boolean;
    protocols?: number;
  };
  roast: string;
  summary: string;
};

const ENS_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_URL || "https://eth.llamarpc.com"),
});

export async function resolveWalletInput(
  input: string,
  resolveEns = (name: string) => publicClient.getEnsAddress({ name }),
) {
  const value = input.trim();
  if (isAddress(value)) return { ok: true as const, address: getAddress(value), label: value };
  if (!ENS_RE.test(value)) return { ok: false as const, message: "Paste a 0x Ethereum address or a .eth name." };
  const address = await resolveEns(value).catch(() => null);
  if (!address) return { ok: false as const, message: `Could not resolve ENS name ${value}.` };
  return { ok: true as const, address: getAddress(address), label: value };
}

function short(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "wallet";
}

export function roastLine(result: RiskResult) {
  const id = short(result.address);
  const f = result.factors;
  if (result.risk_level === "low") {
    return `${id} brought receipts: ${f.tx_count} txs, ${f.unique_tokens} tokens, and real protocol mileage.`;
  }
  if (result.risk_level === "medium") {
    return `${id} is not a burner, but the onchain resume still has gaps.`;
  }
  if (result.risk_level === "high") {
    return `${id}: ${f.tx_count} txs, ${f.has_ens ? "ENS found" : "no ENS"}, thin protocol history. Coin flip with gas fees.`;
  }
  return `${id} has sparse onchain history and almost no receipts. Burner-wallet energy, behaviorally speaking.`;
}

export function formatWalletRoastCard(result: RiskResult, label?: string): WalletRoastCard {
  return {
    ok: true,
    type: "wallet_roast",
    address: result.address,
    label,
    score: result.risk_score,
    tier: result.risk_level,
    breakdown: {
      walletAgeDays: result.factors.wallet_age_days,
      txCount: result.factors.tx_count,
      tokenDiversity: result.factors.unique_tokens,
      ens: result.factors.has_ens,
      protocols: result.factors.protocol_interactions,
    },
    roast: roastLine(result),
    summary: result.summary,
  };
}

export function gracefulWalletCard(message: string, label?: string): WalletRoastCard {
  return {
    ok: true,
    type: "wallet_roast",
    label,
    score: null,
    tier: "unknown",
    breakdown: {},
    roast: "No roast yet. The wallet input needs a clean onchain target first.",
    summary: message,
  };
}
