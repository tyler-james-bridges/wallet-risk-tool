# wallet-risk-tool

ERC-8257 demo tool: analyzes Ethereum wallets and returns a risk score based on onchain activity.

Built with [@opensea/tool-sdk](https://github.com/ProjectOpenSea/tool-sdk) for the [Agent Tool Index](https://agent-tool-index.vercel.app) livestream.

## How it works

POST an address, get back a risk score (0-100) with a breakdown:
- Wallet age
- Transaction count
- Token diversity
- ENS ownership
- Protocol interactions

## Run locally

```bash
npm install
npx vercel dev
# POST http://localhost:3000/api/tool -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}'
```

## Register on Base

```bash
npx @opensea/tool-sdk register \
  --metadata https://wallet-risk-tool.vercel.app/.well-known/ai-tool/wallet-risk-score.json \
  --network base
```

## License

MIT
