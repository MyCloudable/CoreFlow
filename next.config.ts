import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is what the Dockerfile runs (node server.js). It is
  // opt-in via env because `npm start` (next start) does not support it —
  // Vercel/Railway builds ignore this and work either way.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
