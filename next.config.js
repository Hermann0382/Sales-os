/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: [
      'localhost',
      // Add S3 bucket domain when configured
      // 'callos-recordings-prod.s3.amazonaws.com',
    ],
  },
  typescript: {
    // Allow production builds to complete even with type errors
    // Remove this in production when all types are properly defined
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to complete even with ESLint errors
    ignoreDuringBuilds: false,
  },
  // Improve logging during development
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Enable standalone output for Docker deployment
  output: 'standalone',
};

module.exports = nextConfig;
