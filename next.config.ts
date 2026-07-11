import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
  experimental: {
    reactCompiler: true,
   },
   devIndicators: false,
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/onnxruntime-node/bin/napi-v6/darwin/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/win32/**/*",
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
             value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://api.mybackend.com;"
           },
           {
             key: "X-Frame-Options",
             value: "DENY",
           },
           {
             key: "X-Content-Type-Options",
             value: "nosniff",
           },
           {
             key: "Referrer-Policy",
             value: "strict-origin-when-cross-origin",
           },
           {
             key: "Permissions-Policy",
             value: "camera=(), microphone=(), geolocation=()",
           },
         ],
       },
     ]
   },
};

export default nextConfig;