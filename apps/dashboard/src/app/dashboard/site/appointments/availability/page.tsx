import { redirect } from 'next/navigation'

export default function AvailabilityRedirect() {
  redirect('/dashboard/site/appointments?tab=availability')
}
