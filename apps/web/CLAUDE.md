# apps/web — Astro SSR (profils publics)

App Astro déployée sur Cloudflare Pages. Sert les profils publics SEO/GEO/AEO.

## Structure
- `src/layouts/` — AppLayout (sidebar + header + slot), BaseLayout (head + SEO)
- `src/pages/` — [slug].astro (profil), explore.astro, notifications.astro, api/
- `src/styles/global.css` — tokens Tailwind v4 (@theme), imports police Inter
- `src/lib/supabase/` — auth client (createAuthClient)

## Composants UI
Tous dans `packages/ui-server/src/components/` (Astro, zéro React) :
- ProfilePage/Card/Hero — structure profil
- PublicationCard/List + MediaCarousel — section news
- GlobalSidebar + GlobalHeader — navigation
- MenuTabs — onglets profil (news, events, shop, appointments, links)
- AppointmentBooking + AppointmentTypeCard — section rendez-vous
- CommentCard/CommentsList — commentaires publications

## Ports
Dev server : `localhost:4321`
