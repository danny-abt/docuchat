/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdf-parse ships a debug harness that tries to read a test file at import time.
    // Mark it external on the server so Next doesn't try to bundle that path.
    config.externals = [...(config.externals || []), { 'pdf-parse': 'commonjs pdf-parse' }];
    return config;
  },
};

export default nextConfig;
