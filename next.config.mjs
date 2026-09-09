/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // The App Router uses Server Actions by default in Next 15.
    // Optimize package imports for Lucide (tree-shakes icons).
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
