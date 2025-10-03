/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Performance optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle analyzer (comment out for production)
  // Uncomment to analyze bundle size: npm run build
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
  //     config.plugins.push(
  //       new BundleAnalyzerPlugin({
  //         analyzerMode: 'static',
  //         openAnalyzer: false,
  //       })
  //     );
  //   }
  //   return config;
  // },
  
  // Note: modularizeImports disabled for HeroUI compatibility
  
  // Experimental features disabled for stability
  // experimental: {
  //   optimizeCss: true, // Requires critters package
  // },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
