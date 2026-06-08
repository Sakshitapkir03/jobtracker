/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone output is only needed for the Docker image build.
  // Vercel uses its own internal build pipeline and ignores this.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "logo.clearbit.com" },
    ],
  },
};

export default nextConfig;
