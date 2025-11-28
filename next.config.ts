import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable trailing slash redirects to prevent 307 redirects on webhooks
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
