import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { MessagePage } from '@/components/public/MessagePage'
import { createClient } from '@/lib/supabase/server'
import { getEntityBySlug, getEntityByUserId, getEntityContactInfo } from '@ibee/supabase'

export const revalidate = 86400

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) return { title: 'Message introuvable' }

  return {
    title: `Message — ${entity.display_name} — IBEE`,
    robots: { index: false, follow: true },
  }
}

export default async function PublicMessageRoute({ params }: PageProps) {
  const { slug } = await params
  if (!slug || slug.startsWith('__')) notFound()

  const supabase = await createClient()
  const entity = await getEntityBySlug(supabase, slug)
  if (!entity) notFound()

  const contactInfo = await getEntityContactInfo(supabase, entity.id)
  if (!contactInfo?.message_enabled) {
    redirect(`/${entity.slug}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = !!(user && entity.user_id && user.id === entity.user_id)
  if (isOwner) {
    redirect('/dashboard/site')
  }

  let senderName = ''
  let senderEmail = user?.email ?? ''
  if (user) {
    const senderEntity = await getEntityByUserId(supabase, user.id)
    senderName = senderEntity?.display_name ?? ''
  }

  return (
    <MessagePage
      entity={{
        slug: entity.slug,
        display_name: entity.display_name,
        avatar_url: entity.avatar_url,
      }}
      senderName={senderName}
      senderEmail={senderEmail}
    />
  )
}
