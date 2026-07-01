import test from "node:test";
import assert from "node:assert/strict";

import {
  formatWalletRoastCard,
  gracefulWalletCard,
  resolveWalletInput,
  roastLine,
  type RiskResult,
} from "../src/card.js";

const sample: RiskResult = {
  address: "0x0000000000000000000000000000000000000001",
  risk_score: 82,
  risk_level: "critical",
  factors: {
    wallet_age_days: 2,
    tx_count: 3,
    unique_tokens: 0,
    has_ens: false,
    protocol_interactions: 0,
  },
  summary: "Sparse wallet history.",
};

test("resolves raw Ethereum addresses", async () => {
  const result = await resolveWalletInput("0x0000000000000000000000000000000000000001");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.address, "0x0000000000000000000000000000000000000001");
});

test("resolves ENS through an injectable resolver", async () => {
  const result = await resolveWalletInput("vitalik.eth", async () => "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.address, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
});

test("bad input returns a graceful card", async () => {
  const result = await resolveWalletInput("not a wallet");
  assert.equal(result.ok, false);
  const card = gracefulWalletCard(result.ok ? "" : result.message, "not a wallet");
  assert.equal(card.ok, true);
  assert.equal(card.score, null);
});

test("formats behavior-only roast cards", () => {
  const card = formatWalletRoastCard(sample, "test.eth");
  assert.equal(card.type, "wallet_roast");
  assert.equal(card.tier, "critical");
  assert.equal(card.breakdown.txCount, 3);
  assert.match(card.roast, /onchain|wallet|receipts|history|Burner/i);
  assert.doesNotMatch(roastLine(sample), /person|criminal|scammer/i);
});
