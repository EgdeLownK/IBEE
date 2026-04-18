import { redirect } from 'next/navigation'

// Redirect stub — /dashboard/publications/new migrated to /dashboard/site/news/new
export default function PublicationsNewRedirect() {
  redirect('/dashboard/site/news/new')
}
