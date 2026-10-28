/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  distDir: process.env.MEDRISK_NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
