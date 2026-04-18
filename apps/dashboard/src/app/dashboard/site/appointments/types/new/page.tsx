import { redirect } from 'next/navigation'

export default function NewAppointmentTypeRedirect() {
  redirect('/dashboard/site/appointments?new=true')
}
