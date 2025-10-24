import type { NextConfig } from "next";
// Sentry wrapper not supported in current Next.js version, init via sentry.*.config

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/icons/{{kebabCase member}}",
      preventFullImport: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
export default nextConfig;
