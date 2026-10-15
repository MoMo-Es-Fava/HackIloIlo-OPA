import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next.js (and Tailwind's PostCSS
  // source scanning) don't infer a parent folder that contains an unrelated
  // package-lock.json. Without this, styling can silently fail to compile.
  outputFileTracingRoot: path.join(__dirname, "./"),
};

export default nextConfig;
