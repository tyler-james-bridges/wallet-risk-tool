# Wallet Roast

Paste any Ethereum wallet or ENS name and return one JSON card with a 0-100 risk score, five-factor breakdown, and a short behavior-only roast.

Author: Tyler (tmoney_145)
Price: $0.10 per roast

## Endpoint

`POST /api/tool`

Body accepts `address` as an Ethereum address or ENS name.

The endpoint is x402-gated on Base USDC. Missing or invalid wallet inputs still return a Wallet Roast card after payment instead of raw 4xx errors.

## Card Contract

Returns pure JSON with `ok`, `type`, `address`, optional `label`, `score`, `tier`, `breakdown`, `roast`, and `summary`. `breakdown` includes wallet age, transaction count, token diversity, ENS presence, and protocol count when available.

## Examples

- "roast my wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
- "is vitalik.eth sketchy?"
- "score this address: 0x0000000000000000000000000000000000000001"

Roasts must target onchain wallet behavior only. Do not make real-world identity, fraud, criminal, or defamatory claims.
