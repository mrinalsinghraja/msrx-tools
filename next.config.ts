import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this Turbopack walks up to the home directory looking for a lockfile
  // and picks up an unrelated one, which it then warns about on every build.
  turbopack: { root: path.resolve(".") },

  /**
   * Four calculators moved from /calculator to /finance when the Financial
   * Calculators category was created. The slugs did not change, only the
   * category segment — and a URL somebody bookmarked or linked to is not ours
   * to break, so the old paths redirect permanently rather than 404.
   */
  async redirects() {
    const moved = [
      "sip-calculator",
      "compound-interest-calculator",
      "loan-emi-calculator",
      "gst-calculator",
    ];
    return moved.map((slug) => ({
      source: `/calculator/${slug}`,
      destination: `/finance/${slug}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
