import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this Turbopack walks up to the home directory looking for a lockfile
  // and picks up an unrelated one, which it then warns about on every build.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
