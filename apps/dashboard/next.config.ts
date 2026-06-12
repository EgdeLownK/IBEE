import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@ibee/ui-react'],
  // Médias produit/publications : jusqu'à 10 Mo image / 200 Mo vidéo (miroir API Astro).
  experimental: {
    serverActions: {
      bodySizeLimit: '210mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/:slug/informations',
        destination: '/dashboard/site/general',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
