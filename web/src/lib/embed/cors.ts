const allowlist = parseAllowlist();

function parseAllowlist(): string[] {
  return (process.env.EMBED_ALLOW_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveEmbedCorsOrigin(req: Request): string {
  try {
    if (allowlist.length === 0) return "*";
    const origin = req.headers.get("origin") || "";
    if (origin && allowlist.includes(origin)) {
      return origin;
    }
    return "null";
  } catch {
    return "*";
  }
}

export function embedResponseCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveEmbedCorsOrigin(req),
    Vary: "Origin",
  };
}

type PreflightOptions = {
  methods?: Array<string>;
  headers?: Array<string>;
};

export function embedPreflightCorsHeaders(
  req: Request,
  { methods = ["GET", "OPTIONS"], headers = ["Content-Type"] }: PreflightOptions = {},
): Record<string, string> {
  return {
    ...embedResponseCorsHeaders(req),
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": headers.join(", "),
  };
}
