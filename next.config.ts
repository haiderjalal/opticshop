import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Rendered server-side only (invoice PDFs); keep it out of the bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Logo uploads go through a server action; logos are capped at 1 MB, plus form overhead.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
