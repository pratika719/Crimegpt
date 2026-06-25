import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
devIndicators: false,
  async headers() {
    return [
      {
      source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://api.mybackend.com;"
          }
        ],
      },
    ]
  },
};

export default nextConfig;