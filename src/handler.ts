// Wallet risk scoring logic.
// Uses Etherscan + public RPCs to build a risk profile from real onchain data.

const ETHERSCAN_BASE = "https://api.etherscan.io/api";

interface RiskFactors {
  wallet_age_days: number;
  tx_count: number;
  unique_tokens: number;
  has_ens: boolean;
  protocol_interactions: number;
}

interface RiskResult {
  address: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  factors: RiskFactors;
  summary: string;
}

export async function analyzeWallet(address: string): Promise<RiskResult> {
  const addr = address.toLowerCase();

  // Fetch tx list and token transfers in parallel
  const [txData, tokenData] = await Promise.all([
    etherscanFetch("txlist", addr),
    etherscanFetch("tokentx", addr),
  ]);

  const txs = txData.result ?? [];
  const tokens = tokenData.result ?? [];

  // Wallet age: difference between first tx and now
  const firstTx = txs.length > 0 ? Number(txs[0].timeStamp) : Date.now() / 1000;
  const ageDays = Math.floor((Date.now() / 1000 - firstTx) / 86400);

  // Unique token contracts interacted with
  const uniqueTokens = new Set(tokens.map((t: any) => t.contractAddress)).size;

  // Unique contract addresses called (proxy for protocol interactions)
  const contractCalls = txs.filter((tx: any) => tx.input !== "0x" && tx.to !== "");
  const uniqueProtocols = new Set(contractCalls.map((tx: any) => tx.to)).size;

  // ENS: check if address has a reverse record (simple heuristic)
  const hasEns = await checkEns(addr);

  const factors: RiskFactors = {
    wallet_age_days: ageDays,
    tx_count: txs.length,
    unique_tokens: uniqueTokens,
    has_ens: hasEns,
    protocol_interactions: uniqueProtocols,
  };

  // Score: new wallets with few txs and no ENS are riskier
  const score = computeScore(factors);
  const level = scoreToLevel(score);

  return {
    address: addr,
    risk_score: score,
    risk_level: level,
    factors,
    summary: buildSummary(addr, score, level, factors),
  };
}

function computeScore(f: RiskFactors): number {
  let score = 50; // start neutral

  // Age: older is safer
  if (f.wallet_age_days > 365) score -= 15;
  else if (f.wallet_age_days > 90) score -= 8;
  else if (f.wallet_age_days < 7) score += 20;
  else if (f.wallet_age_days < 30) score += 10;

  // Transaction volume: more activity = more established
  if (f.tx_count > 500) score -= 12;
  else if (f.tx_count > 100) score -= 8;
  else if (f.tx_count < 5) score += 15;
  else if (f.tx_count < 20) score += 5;

  // Token diversity
  if (f.unique_tokens > 20) score -= 5;
  else if (f.unique_tokens === 0) score += 10;

  // ENS = identity signal
  if (f.has_ens) score -= 10;

  // Protocol interactions show real usage
  if (f.protocol_interactions > 10) score -= 8;
  else if (f.protocol_interactions === 0) score += 8;

  return Math.max(0, Math.min(100, score));
}

function scoreToLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

function buildSummary(
  addr: string,
  score: number,
  level: string,
  f: RiskFactors
): string {
  const short = addr.slice(0, 6) + "..." + addr.slice(-4);
  if (level === "low")
    return `${short} is a well-established wallet (${f.wallet_age_days}d old, ${f.tx_count} txs) with low risk indicators.`;
  if (level === "medium")
    return `${short} shows moderate activity (${f.tx_count} txs, ${f.unique_tokens} tokens). Standard caution advised.`;
  if (level === "high")
    return `${short} has limited history (${f.wallet_age_days}d old, ${f.tx_count} txs). Elevated risk - verify before transacting.`;
  return `${short} is a very new or inactive wallet. Exercise extreme caution.`;
}

async function etherscanFetch(
  action: string,
  address: string
): Promise<any> {
  const key = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?module=account&action=${action}&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=asc&apikey=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return await res.json();
  } catch {
    return { result: [] };
  }
}

async function checkEns(address: string): Promise<boolean> {
  try {
    const res = await fetch("https://mainnet.base.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: "0x3671ae578e63fdf66ad4f3e12cc0c0d71ac7510c", // ENS reverse registrar
            data:
              "0x691f3431" + // name(bytes32)
              address.slice(2).toLowerCase().padStart(64, "0"),
          },
          "latest",
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    return (
      json.result &&
      json.result !== "0x" &&
      json.result !==
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  } catch {
    return false;
  }
}
