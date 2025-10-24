const config = {
  default: {
    runtime: "edge" as const,
    placement: "global" as const,
    override: {
      wrapper: "cloudflare" as const,
      converter: "edge" as const,
    },
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
