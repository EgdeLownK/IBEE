---
paths:
  - "**/package.json"
---
# Dépendances autorisées / interdites

## Déjà installées, pas besoin d'approbation

- `@supabase/supabase-js` — client Supabase
- `tailwindcss` v4 + `@tailwindcss/postcss` — styling
- `lucide-react` — icônes
- `sonner` — toasts de notification
- `react-easy-crop` — recadrage d'images
- `stripe` — paiements
- `@vercel/og` — génération OG image
- `qrcode` — génération QR codes
- `@ffmpeg/ffmpeg` + `ffmpeg-static` — traitement vidéo
- `sharp` — traitement image

## Interdites sans approbation explicite

- `axios` → utiliser `fetch` natif
- `moment.js` → utiliser `date-fns`
- `lodash` → utiliser ES6 natif
- Tout ORM (`prisma`, `drizzle`, `kysely`) → on parle directement à Supabase
- `react-query` / `swr` / `tanstack-query` → à discuter avant

Si besoin d'une lib non listée : arrêter et demander.
