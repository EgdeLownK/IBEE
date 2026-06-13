import type { Metadata } from 'next'
import { ExploreClient } from '@/components/public/ExploreClient'

export const metadata: Metadata = {
  title: 'Explorer',
  robots: { index: false, follow: false },
}

export const revalidate = 300

export default function ExplorePage() {
  return <ExploreClient />
}
