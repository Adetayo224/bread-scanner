import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices (phone, other laptops) to load /_next/* dev resources.
  // Next 16 blocks these by default for safety. Broaden as needed.
  allowedDevOrigins: [
    "192.168.18.9",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
    "localhost",
  ],
};

export default nextConfig;
