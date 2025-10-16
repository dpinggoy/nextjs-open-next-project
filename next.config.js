/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for OpenNext deployment
  output: 'standalone',
  
  // Enable Next.js image optimization
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optional: Add your custom domains for image optimization
  // images: {
  //   domains: ['example.com'],
  // },
}

module.exports = nextConfig