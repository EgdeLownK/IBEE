# packages/supabase — Client & helpers BDD

Package partagé entre apps/web et apps/dashboard. Types auto-générés, helpers typés.

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

## Tables (14)
entity, entity_menu_sections, entity_home_widgets, entity_global_features, entity_faq_items, follows, publications, publication_media, publication_comments, notifications, appointment_types, availability_schedules, availability_exceptions, bookings

## Régénérer les types
```bash
pnpm supabase gen types typescript --project-id ztblirxxptdwqobmervk > packages/supabase/src/types.ts
```
