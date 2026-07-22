import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicShell } from '@/components/public/PublicShell'
import { loadAccountShellData } from '@/lib/account-shell-data'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const accountData = await loadAccountShellData(supabase)
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  return (
    <PublicShell accountData={accountData} webUrl={webUrl}>
      <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
    </PublicShell>
  )
}
