'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AccountShellData, ProjectAccount } from '@/lib/account-shell-data'

export type AccountMode = 'personal' | 'project'

type AccountContextValue = {
  mode: AccountMode
  activeProjectId: string
  activeProject: ProjectAccount
  personalAccount: AccountShellData['personalAccount']
  projectAccounts: ProjectAccount[]
  projectLabel: string
  setPersonalMode: () => void
  setProjectMode: (projectId: string) => void
  isPersonalMode: boolean
}

const AccountContext = createContext<AccountContextValue | null>(null)

type Props = {
  data: AccountShellData
  children: ReactNode
}

export function AccountContextProvider({ data, children }: Props) {
  const [mode, setMode] = useState<AccountMode>('project')
  const [activeProjectId, setActiveProjectId] = useState(data.primaryProjectId)

  const activeProject = useMemo(() => {
    return (
      data.projectAccounts.find((project) => project.id === activeProjectId) ??
      data.projectAccounts[0]
    )
  }, [activeProjectId, data.projectAccounts])

  const value = useMemo<AccountContextValue>(
    () => ({
      mode,
      activeProjectId: activeProject.id,
      activeProject,
      personalAccount: data.personalAccount,
      projectAccounts: data.projectAccounts,
      projectLabel: mode === 'personal' ? 'Compte perso' : activeProject.name,
      setPersonalMode: () => setMode('personal'),
      setProjectMode: (projectId: string) => {
        setActiveProjectId(projectId)
        setMode('project')
      },
      isPersonalMode: mode === 'personal',
    }),
    [mode, activeProject, data.personalAccount, data.projectAccounts],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccountContext() {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccountContext must be used within AccountContextProvider')
  }
  return ctx
}
