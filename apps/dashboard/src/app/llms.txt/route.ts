import { getSiteUrl } from '@/lib/site-url'

export const revalidate = 86400

const LLMS_BODY = `# IBEE
Plateforme de profils professionnels pour solopreneurs (coachs, consultants, formateurs, infopreneurs, praticiens, créateurs).

## Qu'est-ce qu'IBEE
IBEE est un profil public unique par solopreneur, optimisé pour le référencement et la citabilité par les moteurs de recherche et les LLMs. Chaque profil contient : identité (nom, rôle, localisation), biographie, publications (news), et sections activables selon le profil.

## Routes canoniques
- / : accueil IBEE
- /[slug] : profil public d'un solopreneur
- /[slug]/news/[publicationSlug] : permalien d'une publication
- /[slug]/services/[serviceSlug] : page dédiée d'un service de rendez-vous
- /[slug]/shop/[productSlug] : fiche produit
- /[slug]/events/[eventSlug] : fiche événement
- /[slug]/message : formulaire de contact (si activé)
- /explore : recherche de profils (non indexée)
- /sitemap.xml : plan complet du site
- /robots.txt : directives crawlers

## Format d'un profil
Chaque profil /[slug] contient :
- display_name (nom affiché)
- role (fonction professionnelle)
- location (ville ou pays)
- bio (description 300 caractères maximum)
- publications (articles de type news avec titre, contenu, date)
- FAQ (optionnelle, questions-réponses)

## Schema.org disponible
- Person + ProfilePage sur /[slug] et /
- Article sur les permaliens publications
- FAQPage conditionnel sur les profils avec FAQ
- Service sur les pages services de rendez-vous
- Product sur les fiches shop
- Event sur les fiches événements

## Contact
admin@ibee.example.com`

export async function GET() {
  const siteUrl = getSiteUrl()

  return new Response(`${LLMS_BODY}\n\nSite: ${siteUrl}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
