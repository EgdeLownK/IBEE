import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  // Monorepo pnpm : inclure les packages workspace dans le trace de prod (Vercel).
  outputFileTracingRoot: monorepoRoot,
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
