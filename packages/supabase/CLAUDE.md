# packages/supabase — Client & helpers BDD

Package partagé utilisé par `apps/platform`. Types auto-générés, helpers typés.

## Structure
- `src/types.ts` — types auto-générés (ne jamais éditer manuellement)
- `src/helpers.ts` — entity (getBySlug, getByUserId, menuSections, widgets, faq)
- `src/follows.ts` — isFollowing, followEntity, unfollowEntity
- `src/publications.ts` — CRUD publications + médias
- `src/notifications.ts` — getNotifications, getUnreadCount, markAsRead
- `src/comments.ts` — CRUD commentaires (rate limit RLS 1/min)
- `src/appointments.ts` — CRUD types de rendez-vous
- `src/availability.ts` — schedules, exceptions, calcul créneaux
- `src/bookings.ts` — réservations + stats
- `src/cache.ts` — purgeEntityCache, purgePublicationCache
- `src/index.ts` — barrel exports

## Tables
Liste exacte et à jour dans `src/types.ts` (`Database['public']['Tables']`) — ne pas recopier de compte ici, il dérive à chaque migration.

## Régénérer les types
```bash
pnpm gen-types
```
