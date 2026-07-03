import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { EventEditStudio } from '@/components/profile/event-edit/EventEditStudio'
import { getDashboardContext } from '@/lib/dashboard-context'
import { loadEventEditData } from '@/lib/load-event-edit'

export const metadata: Metadata = {
  title: 'Édition événement — Studio',
}

type PageProps = {
  params: Promise<{ eventId: string }>
}

export default async function EventEditPage({ params }: PageProps) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  const { eventId } = await params
  const data = await loadEventEditData(ctx.supabase, ctx.entity.id, eventId)
  if (!data) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'
  const publicEventHref = `${siteUrl}/${ctx.entity.slug}/events/${data.event.slug}`

  return <EventEditStudio data={data} publicEventHref={publicEventHref} />
}
