/** Messages et CTA des états vides des widgets Accueil. */

export interface WidgetEmptyContent {
  visitorMessage: string
  ownerMessage: string
  ctaLabel: string
  ctaAction: string
  ctaValue?: string
}

function configCta(widgetId: string): Pick<WidgetEmptyContent, 'ctaAction' | 'ctaValue'> {
  return { ctaAction: 'data-open-home-widget-config', ctaValue: widgetId }
}

export function widgetEmptyContent(
  widgetType: string,
  scenario: 'unconfigured' | 'missing_ref' | 'empty_pool' | 'empty_category' | 'no_images' | 'no_faq' | 'no_news' | 'no_bio',
  opts: { widgetId?: string; categoryName?: string } = {},
): WidgetEmptyContent {
  const { widgetId = '', categoryName } = opts
  const catSuffix = categoryName ? ` « ${categoryName} »` : ''

  switch (scenario) {
    case 'unconfigured':
      switch (widgetType) {
        case 'widget_shop':
          return {
            visitorMessage: 'Boutique bientôt disponible.',
            ownerMessage: 'Choisis un produit ou une catégorie à mettre en avant.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
        case 'widget_service':
          return {
            visitorMessage: 'Services bientôt disponibles.',
            ownerMessage: 'Choisis un service à mettre en avant sur l\'accueil.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
        case 'widget_event':
          return {
            visitorMessage: 'Événements bientôt annoncés.',
            ownerMessage: 'Choisis un événement à mettre en avant sur l\'accueil.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
        case 'widget_announcement':
          return {
            visitorMessage: 'Bannière bientôt disponible.',
            ownerMessage: 'Ajoute des images pour créer ta bannière d\'accueil.',
            ctaLabel: 'Ajouter des images',
            ...configCta(widgetId),
          }
        case 'widget_bio':
          return {
            visitorMessage: 'Informations bientôt disponibles.',
            ownerMessage: 'Renseigne tes contacts et horaires à afficher.',
            ctaLabel: 'Configurer la bio',
            ...configCta(widgetId),
          }
        case 'widget_faq':
          return {
            visitorMessage: 'Pas encore de FAQ.',
            ownerMessage: 'Ajoute tes premières questions fréquentes.',
            ctaLabel: 'Ajouter des questions',
            ctaAction: 'data-open-faq-overlay',
          }
        case 'widget_news':
          return {
            visitorMessage: 'Actualités bientôt disponibles.',
            ownerMessage: 'Publie ta première actualité pour alimenter ce widget.',
            ctaLabel: 'Ajouter une publication',
            ctaAction: 'data-open-publication-overlay',
          }
        case 'widget_highlight':
          return {
            visitorMessage: 'Contenu bientôt disponible.',
            ownerMessage: 'Choisis un produit, service, événement ou actualité à mettre en avant.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
        case 'widget_carousel':
          return {
            visitorMessage: 'Contenu bientôt disponible.',
            ownerMessage: 'Choisis une source pour alimenter ce carrousel.',
            ctaLabel: 'Choisir la source',
            ...configCta(widgetId),
          }
        default:
          return {
            visitorMessage: 'Contenu à venir.',
            ownerMessage: 'Configure ce widget pour afficher du contenu.',
            ctaLabel: 'Configurer',
            ...configCta(widgetId),
          }
      }

    case 'missing_ref':
      switch (widgetType) {
        case 'widget_shop':
          return {
            visitorMessage: 'Produit bientôt disponible.',
            ownerMessage: 'Choisis un produit à mettre en avant.',
            ctaLabel: 'Choisir un produit',
            ...configCta(widgetId),
          }
        case 'widget_service':
          return {
            visitorMessage: 'Service bientôt disponible.',
            ownerMessage: 'Choisis un service à mettre en avant.',
            ctaLabel: 'Choisir un service',
            ...configCta(widgetId),
          }
        case 'widget_event':
          return {
            visitorMessage: 'Événement bientôt annoncé.',
            ownerMessage: 'Choisis un événement à mettre en avant.',
            ctaLabel: 'Choisir un événement',
            ...configCta(widgetId),
          }
        case 'widget_highlight':
          return {
            visitorMessage: 'Contenu bientôt disponible.',
            ownerMessage: 'Sélectionne le contenu à afficher.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
        default:
          return {
            visitorMessage: 'Contenu à venir.',
            ownerMessage: 'Sélectionne le contenu à afficher.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
      }

    case 'empty_category':
      return {
        visitorMessage: `Aucun produit dans cette catégorie${catSuffix} pour le moment.`,
        ownerMessage: `Ajoute des produits dans cette catégorie${catSuffix} pour les afficher ici.`,
        ctaLabel: 'Ajouter un produit',
        ctaAction: 'data-open-product-overlay',
      }

    case 'empty_pool':
      switch (widgetType) {
        case 'widget_carousel':
          return {
            visitorMessage: 'Contenu à venir.',
            ownerMessage: 'Ajoute du contenu pour alimenter ce carrousel.',
            ctaLabel: 'Choisir la source',
            ...configCta(widgetId),
          }
        case 'widget_service':
          return {
            visitorMessage: 'Aucun service réservable pour l\'instant.',
            ownerMessage: 'Propose ton premier service réservable.',
            ctaLabel: 'Ajouter un service',
            ctaAction: 'data-open-service-overlay',
          }
        case 'widget_event':
          return {
            visitorMessage: 'Reviens bientôt pour découvrir les prochains événements.',
            ownerMessage: 'Annonce ton prochain webinaire, atelier ou meetup.',
            ctaLabel: 'Ajouter un événement',
            ctaAction: 'data-open-event-overlay',
          }
        default:
          return {
            visitorMessage: 'Contenu à venir.',
            ownerMessage: 'Ajoute du contenu pour remplir ce widget.',
            ctaLabel: 'Choisir le contenu',
            ...configCta(widgetId),
          }
      }

    case 'no_images':
      return {
        visitorMessage: 'Bannière bientôt disponible.',
        ownerMessage: 'Ajoute des images pour créer ta bannière d\'accueil.',
        ctaLabel: 'Ajouter des images',
        ...configCta(widgetId),
      }

    case 'no_faq':
      return {
        visitorMessage: 'Pas encore de FAQ.',
        ownerMessage: 'Ajoute tes premières questions fréquentes.',
        ctaLabel: 'Ajouter des questions',
        ctaAction: 'data-open-faq-overlay',
      }

    case 'no_news':
      return {
        visitorMessage: 'Pas encore d\'actus par ici.',
        ownerMessage: 'Partage tes actus avec ta communauté.',
        ctaLabel: 'Ajouter une publication',
        ctaAction: 'data-open-publication-overlay',
      }

    case 'no_bio':
      return {
        visitorMessage: 'Informations bientôt disponibles.',
        ownerMessage: 'Active au moins un moyen de contact ou tes horaires.',
        ctaLabel: 'Configurer la bio',
        ...configCta(widgetId),
      }
  }
}
