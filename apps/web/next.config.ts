import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@luxichic/ui", "@luxichic/types", "@luxichic/validation"],
};

export default nextConfig;
