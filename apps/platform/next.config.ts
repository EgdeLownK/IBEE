import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  // Monorepo pnpm : inclure les packages workspace dans le trace de prod (Vercel).
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@ibee/ui-react', '@ibee/shared', '@ibee/supabase'],
  // Médias produit/publications : jusqu'à 10 Mo image / 200 Mo vidéo (miroir API Astro).
  // Server actions volumineuses (médias) : bodySizeLimit ci-dessous.
  experimental: {
    serverActions: {
      bodySizeLimit: '520mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ztblirxxptdwqobmervk.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
    ],
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
