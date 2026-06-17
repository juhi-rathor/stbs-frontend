/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: false,
  reactCompiler: true,

  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
