import { redirect } from 'next/navigation'

export default async function AppointmentTypesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string }>
}) {
  const params = await searchParams
  const toast = params.toast ? `&toast=${params.toast}` : ''
  redirect(`/dashboard/site/appointments?tab=services${toast}`)
}
