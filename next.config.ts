import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
  experimental: {
    reactCompiler: true,
    proxyTimeout: 120_000,
  },
   devIndicators: false,
  async rewrites() {
    const rawNestUrl = (process.env.NESTJS_API_URL || 'http://127.0.0.1:3001/api').replace(/\/+$/, '');
    const nestUrl = rawNestUrl.endsWith('/api') ? rawNestUrl : `${rawNestUrl}/api`;
    return [
      {
        source: '/api/:path*',
        destination: `${nestUrl}/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${nestUrl}/auth/:path*`,
      },
    ];
  },
   async headers() {
     return [
       {
         source: '/:path*',
         headers: [
           {
             key: 'Content-Security-Policy',
             value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' http://localhost:3001 https://api.mybackend.com;"
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