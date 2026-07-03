import type { Metadata } from 'next'
import { RevenuPersoDashboard } from '@/components/dashboard/revenu/RevenuPersoDashboard'

export const metadata: Metadata = {
  title: 'Revenus perso',
}

export default function RevenusPersoPage() {
  return <RevenuPersoDashboard />
}
