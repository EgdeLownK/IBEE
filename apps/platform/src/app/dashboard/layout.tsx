import { redirect } from 'next/navigation'
import { AppShell } from '@/components/dashboard/AppShell'
import { getDashboardAccountShell } from '@/lib/dashboard-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const accountData = await getDashboardAccountShell()
  if (!accountData) redirect('/login')

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  return (
    <AppShell accountData={accountData} webUrl={webUrl}>
      {children}
    </AppShell>
  )
}
