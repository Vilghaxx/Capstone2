const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
      {
        source: "/xrays/:path*",
        destination: "http://localhost:4000/xrays/:path*",
      },
    ];
  },
};

export default nextConfig;