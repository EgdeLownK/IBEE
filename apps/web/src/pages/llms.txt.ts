import type { APIRoute } from 'astro'

export const GET: APIRoute = () => {
  const body = `# Agora
Plateforme de profils professionnels pour solopreneurs (coachs, consultants, formateurs, infopreneurs, praticiens, cr\u00e9ateurs).

## Qu'est-ce qu'Agora
Agora est un profil public unique par solopreneur, optimis\u00e9 pour le r\u00e9f\u00e9rencement et la citabilit\u00e9 par les moteurs de recherche et les LLMs. Chaque profil contient : identit\u00e9 (nom, r\u00f4le, localisation), biographie, publications (news), et sections activables selon le profil.

## Routes canoniques
- / : profil officiel Agora
- /[slug] : profil public d'un solopreneur
- /[slug]/news/[publicationSlug] : permalien d'une publication
- /[slug]/services/[serviceSlug] : page d\u00e9di\u00e9e d'un service de rendez-vous
- /explore : recherche de profils (non index\u00e9e)
- /sitemap.xml : plan complet du site
- /robots.txt : directives crawlers

## Format d'un profil
Chaque profil /[slug] contient :
- display_name (nom affich\u00e9)
- role (fonction professionnelle)
- location (ville ou pays)
- bio (description 300 caract\u00e8res maximum)
- publications (articles de type news avec titre, contenu, date)
- FAQ (optionnelle, questions-r\u00e9ponses)

## Schema.org disponible
- Person + ProfilePage sur /[slug] et /
- Article sur les permaliens publications
- FAQPage conditionnel sur les profils avec FAQ
- Service sur les pages services de rendez-vous

## Contact
admin@agora.example.com`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
