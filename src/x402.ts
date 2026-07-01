import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
  type HTTPAdapter,
  type HTTPRequestContext,
} from "@x402/core/server";
import type { Network, PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const BASE_NETWORK: Network = "eip155:8453";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const FACILITATOR_URL = process.env.X402_FACILITATOR_BASE || "https://facilitator.payai.network";
const PAY_TO = process.env.WALLET_RISK_PAY_TO || "0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c";
const PREVIEW_MODE = process.env.X402_PREVIEW_MODE === "1" || process.env.X402_PREVIEW_MODE === "true";

type VerifiedPayment = {
  context: HTTPRequestContext;
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
  declaredExtensions?: Record<string, unknown>;
};

type JsonResult = { status?: number; body: unknown };

class VercelAdapter implements HTTPAdapter {
  constructor(private req: VercelRequest) {}

  getHeader(name: string) {
    const value = this.req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  getMethod() {
    return this.req.method || "GET";
  }

  getPath() {
    return new URL(this.getUrl()).pathname;
  }

  getUrl() {
    const host = this.getHeader("host") || "localhost";
    const proto = this.getHeader("x-forwarded-proto") || "https";
    return new URL(this.req.url || "/api/tool", `${proto}://${host}`).toString();
  }

  getAcceptHeader() {
    return this.getHeader("accept") || "application/json";
  }

  getUserAgent() {
    return this.getHeader("user-agent") || "";
  }

  getBody() {
    return this.req.body;
  }
}

function makeScheme() {
  const scheme = new ExactEvmScheme();
  scheme.registerMoneyParser(async (amount, network) => {
    if (network !== BASE_NETWORK) return null;
    return {
      amount: Math.round(amount * 1e6).toString(),
      asset: BASE_USDC,
      extra: { name: "USD Coin", version: "2", decimals: 6 },
    };
  });
  return scheme;
}

let serverPromise: Promise<x402HTTPResourceServer> | null = null;

async function getServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const resourceServer = new x402ResourceServer(
        new HTTPFacilitatorClient({ url: FACILITATOR_URL }),
      ).register(BASE_NETWORK, makeScheme());
      const httpServer = new x402HTTPResourceServer(resourceServer, {
        "POST /api/tool": {
          accepts: [{ scheme: "exact", payTo: PAY_TO, price: "0.10", network: BASE_NETWORK }],
          description: "Wallet Roast: score and roast an Ethereum wallet's onchain behavior.",
          mimeType: "application/json",
          unpaidResponseBody: async () => ({
            contentType: "application/json",
            body: { error: "Payment required", price_usdc: 0.1, network: "base" },
          }),
        },
      });
      await httpServer.initialize();
      return httpServer;
    })();
  }
  return serverPromise;
}

function sendInstruction(res: VercelResponse, status: number, headers: Record<string, string>, body: unknown) {
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  if (body === undefined) return res.status(status).end();
  if (typeof body === "string") return res.status(status).send(body);
  return res.status(status).json(body);
}

async function verifyPayment(req: VercelRequest, res: VercelResponse): Promise<VerifiedPayment | null> {
  const adapter = new VercelAdapter(req);
  const context: HTTPRequestContext = {
    adapter,
    path: adapter.getPath(),
    method: adapter.getMethod(),
    paymentHeader: adapter.getHeader("x-payment") || adapter.getHeader("x-x402-payment"),
  };
  const result = await (await getServer()).processHTTPRequest(context);
  if (result.type === "payment-error") {
    sendInstruction(res, result.response.status, result.response.headers, result.response.body);
    return null;
  }
  if (result.type === "no-payment-required") return { context, paymentPayload: {} as PaymentPayload, paymentRequirements: {} as PaymentRequirements };
  return { context, paymentPayload: result.paymentPayload, paymentRequirements: result.paymentRequirements, declaredExtensions: result.declaredExtensions };
}

export async function withPayment(
  req: VercelRequest,
  res: VercelResponse,
  handler: () => Promise<JsonResult>,
) {
  const verified = PREVIEW_MODE ? null : await verifyPayment(req, res);
  if (!PREVIEW_MODE && !verified) return;

  const result = await handler();
  const status = result.status ?? 200;
  const body = JSON.stringify(result.body);
  res.setHeader("Content-Type", "application/json");

  if (PREVIEW_MODE || status >= 400 || !verified) {
    return res.status(status).send(body);
  }

  const settlement = await (await getServer()).processSettlement(
    verified.paymentPayload,
    verified.paymentRequirements,
    verified.declaredExtensions,
    { request: verified.context, responseBody: Buffer.from(body) },
  );
  if (!settlement.success) {
    return res.status(402).json({ error: "Payment settlement failed", detail: settlement.errorMessage || settlement.errorReason });
  }
  for (const [key, value] of Object.entries(settlement.headers)) res.setHeader(key, value);
  return res.status(status).send(body);
}
