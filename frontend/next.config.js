/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
  // Suppress hydration warning for leaflet
  reactStrictMode: false,
};

module.exports = nextConfig;
