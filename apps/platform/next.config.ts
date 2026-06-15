import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@ibee/ui-react', '@ibee/shared', '@ibee/supabase'],
  // Médias produit/publications : jusqu'à 10 Mo image / 200 Mo vidéo (miroir API Astro).
  // Drive / produits digitaux : jusqu'à 500 Mo (serverActions bodySizeLimit ci-dessous).
  experimental: {
    serverActions: {
      bodySizeLimit: '520mb',
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
