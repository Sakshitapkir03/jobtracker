/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained build under .next/standalone — required for
  // the multi-stage Docker image to run without the full node_modules tree.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "logo.clearbit.com" },
    ],
  },
};

export default nextConfig;
