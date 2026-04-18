import { redirect } from 'next/navigation'

// Redirect stub — /dashboard/profile migrated to /dashboard/site/general
export default function ProfileRedirect() {
  redirect('/dashboard/site/general')
}
