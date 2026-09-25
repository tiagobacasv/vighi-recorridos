import type { NextConfig } from "next";

// Exportacion estatica: sin servidor Node, se sube por FTP igual que el
// resto del sitio. Vive en /recorridos, por eso basePath/assetPrefix.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/recorridos",
  assetPrefix: "/recorridos",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
