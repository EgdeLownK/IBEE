import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante — requise pour le checkout boutique.')
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  })

  return stripeClient
}

export function getWebBaseUrl(): string {
  return process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
}
