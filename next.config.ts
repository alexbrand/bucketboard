import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports for tree-shaking
    optimizePackageImports: [
      '@aws-sdk/client-s3',
      '@azure/storage-blob',
      '@google-cloud/storage',
      'react-window',
    ],
  },

  // Compress static assets
  compress: true,

  // Production source maps (disabled for smaller bundles)
  productionBrowserSourceMaps: false,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
