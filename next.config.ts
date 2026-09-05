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

  /**
   * The background-removal model and the WebAssembly that runs it are about
   * 7.5 MB over the wire between them, and neither ever changes without its
   * filename changing. Without an explicit header Next serves them with no
   * caching directive, so a visitor who used the tool yesterday downloads the
   * whole thing again today — which would make the feature feel broken on a
   * slow connection while being technically correct.
   */
  async headers() {
    return [
      {
        source: "/models/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/vendor/onnxruntime/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
