/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.tiktokcdn.com',
      },
    ],
  },
  outputFileTracingIncludes: {
    '/api/sync': ['node_modules/@sparticuz/chromium/bin/**/*'],
  },
};

module.exports = nextConfig;
