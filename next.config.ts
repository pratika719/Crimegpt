import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
   },
   devIndicators: false,
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
    outputFileTracingExcludes: {
      "*": [
       "node_modules/onnxruntime-node/bin/**/*",
       "!node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*",
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
         }
         ],
       },
     ]
   },
};

export default nextConfig;