import { createClient } from '@/lib/supabase/server'
import { PublicShell } from '@/components/public/PublicShell'
import { loadAccountShellData } from '@/lib/account-shell-data'
import type { AccountShellData } from '@/lib/account-shell-data'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'

  let accountData: AccountShellData | null = null

  if (user) {
    accountData = await loadAccountShellData(supabase)
  }

  return (
    <PublicShell accountData={accountData} webUrl={webUrl}>
      {children}
    </PublicShell>
  )
}
