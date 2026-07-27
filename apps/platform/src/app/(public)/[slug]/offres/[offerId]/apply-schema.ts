// Validation de la candidature publique (createJobApplicationAction). La
// table entity_job_applications n'impose aucune longueur en base (contrairement
// a bookings/booker_name|email|message qui ont des CHECK explicites) : les
// bornes ci-dessous sont un choix applicatif aligne sur ce precedent
// (200 caracteres repartis en 100/100 pour prenom+nom au lieu d'un champ
// unique, 320 pour l'email — limite RFC 5321 d'une adresse mail, 2000 pour
// le message).
import { z } from 'zod'

// offer_id est valide separement du reste du formulaire : un uuid malforme
// ne peut pas venir d'un vrai formulaire (le champ est un lien/parametre
// d'URL, jamais saisi) — c'est forcement un appel direct a la Server Action.
// Message generique, pas le message metier "offre indisponible" qui, lui,
// est reserve au cas reel (offre existante mais fermee, ou supprimee).
export const OfferIdSchema = z.string().uuid()

export const ApplyFieldsSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'Merci de renseigner votre prénom.')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères.'),
  last_name: z
    .string()
    .trim()
    .min(1, 'Merci de renseigner votre nom.')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères.'),
  email: z
    .string()
    .trim()
    .min(1, 'Merci de renseigner votre email.')
    .max(320, 'Cette adresse email est trop longue.')
    .email("Cette adresse email n'est pas valide."),
  message: z
    .string()
    .trim()
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères.')
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type ApplyFields = z.infer<typeof ApplyFieldsSchema>
