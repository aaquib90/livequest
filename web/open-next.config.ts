const cloudflareOverrides = {
  wrapper: "cloudflare" as const,
  converter: "edge" as const,
  incrementalCache: "s3-lite" as const,
  tagCache: "dynamodb-lite" as const,
  queue: "sqs-lite" as const,
};

const config = {
  default: {
    runtime: "edge" as const,
    placement: "global" as const,
    override: cloudflareOverrides,
  },
  imageOptimization: {
    runtime: "edge" as const,
    placement: "global" as const,
    override: {
      wrapper: "cloudflare" as const,
      converter: "edge" as const,
    },
  },
  revalidate: {
    runtime: "edge" as const,
    placement: "global" as const,
    override: cloudflareOverrides,
  },
  initializationFunction: {
    runtime: "edge" as const,
    placement: "global" as const,
    override: cloudflareOverrides,
  },
  warmer: {
    runtime: "edge" as const,
    placement: "global" as const,
    override: cloudflareOverrides,
  },
  middleware: {
    external: true,
    originResolver: "pattern-env",
    override: {
      wrapper: "cloudflare" as const,
      converter: "edge" as const,
    },
  },
};

export default config;
