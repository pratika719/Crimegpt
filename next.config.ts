import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  devIndicators: false,
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/onnxruntime-node/bin/napi-v6/win32/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/darwin/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**/*",
    ],
  },
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