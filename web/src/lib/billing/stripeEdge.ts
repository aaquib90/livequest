const STRIPE_API_BASE = "https://api.stripe.com";

export class StripeApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function requireStripeSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return secret;
}

export async function stripeRequest<T>(
  secretKey: string,
  path: string,
  params: URLSearchParams,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
    ...init,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload.error?.message as string | undefined) ?? "Stripe request failed"
        : "Stripe request failed";
    const code =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload.error?.code as string | undefined)
        : undefined;
    throw new StripeApiError(response.status, message, code);
  }

  return payload as T;
}

type ParsedStripeSignature = {
  timestamp: string;
  signatures: string[];
};

function parseStripeSignatureHeader(signatureHeader: string | null): ParsedStripeSignature {
  if (!signatureHeader) {
    throw new Error("stripe_signature_header_missing");
  }
  const parts = signatureHeader.split(",");
  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (key === "t") {
      timestamp = value;
    } else if (key.startsWith("v")) {
      signatures.push(value);
    }
  }
  if (!timestamp || signatures.length === 0) {
    throw new Error("stripe_signature_header_invalid");
  }
  return { timestamp, signatures };
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string) {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  const encoder = new TextEncoder();
  const message = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const computedSignature = toHex(signatureBuffer);
  const valid = signatures.some((sig) => timingSafeEqual(sig, computedSignature));
  if (!valid) {
    throw new Error("stripe_signature_verification_failed");
  }
}
