import type { NextConfig } from "next";
// Sentry wrapper not supported in current Next.js version, init via sentry.*.config

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: [
      "@supabase/supabase-js",
      "@supabase/ssr",
      "lucide-react",
    ],
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
