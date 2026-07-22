import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Parent folder has a stray package-lock.json that makes Turbopack pick the
  // wrong workspace root and break module resolution under founderos/.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
