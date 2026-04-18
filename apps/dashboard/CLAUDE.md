# apps/dashboard — Next.js App Router (back-office)

App Next.js déployée sur Vercel. Dashboard de gestion pour les solopreneurs.

## Structure
- `src/app/dashboard/site/` — pages CMS (general, news, appointments, apercu)
- `src/app/dashboard/layout.tsx` — layout avec MainRail + GlobalHeader
- `src/app/account/` — gestion compte (layout séparé)
- `src/components/dashboard/` — composants dashboard (GlobalHeader, SiteSidebar, MainRail)
- `src/lib/supabase/server.ts` — client Supabase serveur

## Composants UI
- Composants interactifs dans `packages/ui-react/src/components/` (React + Radix)
- Input, Textarea, UploadAvatar, AvatarCropperModal, PublicationCardPreview, etc.

## Navigation
Rail principal (Mon site, Explorer) + Sidebar contextuelle (Dashboard, Aperçu, Général, News, Rendez-vous, etc.)

## Ports
Dev server : `localhost:3000`
