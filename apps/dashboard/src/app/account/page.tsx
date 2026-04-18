import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LogoutButton } from './LogoutButton'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const createdAt = format(new Date(user.created_at), "'Inscrit le' d MMMM yyyy", { locale: fr })

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-neutral-900">Mon compte</h1>

        {/* Informations du compte */}
        <section className="mt-6 rounded-xl border border-neutral-200 bg-neutral-0 p-4 md:mt-8 md:p-6">
          <h2 className="text-lg font-medium text-neutral-900">Informations du compte</h2>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-neutral-400">Email</p>
              <p className="text-sm font-medium text-neutral-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Date d&apos;inscription</p>
              <p className="text-sm font-medium text-neutral-900">{createdAt}</p>
            </div>
          </div>
        </section>

        {/* Changer l'email */}
        <section className="mt-4 rounded-xl border border-neutral-200 bg-neutral-0 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <div>
              <h2 className="text-base font-medium text-neutral-900 md:text-lg">Changer l&apos;email</h2>
              <p className="mt-1 text-sm text-neutral-400">Modifier l&apos;adresse email associée à votre compte.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Bientôt disponible</span>
              <button
                type="button"
                disabled
                className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-400 cursor-not-allowed"
              >
                Modifier
              </button>
            </div>
          </div>
        </section>

        {/* Changer le mot de passe */}
        <section className="mt-4 rounded-xl border border-neutral-200 bg-neutral-0 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <div>
              <h2 className="text-base font-medium text-neutral-900 md:text-lg">Changer le mot de passe</h2>
              <p className="mt-1 text-sm text-neutral-400">Mettre à jour votre mot de passe de connexion.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Bientôt disponible</span>
              <button
                type="button"
                disabled
                className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-400 cursor-not-allowed"
              >
                Modifier
              </button>
            </div>
          </div>
        </section>

        {/* Gestion de l'abonnement */}
        <section className="mt-4 rounded-xl border border-neutral-200 bg-neutral-0 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <div>
              <h2 className="text-base font-medium text-neutral-900 md:text-lg">Abonnement Agora</h2>
              <p className="mt-1 text-sm text-neutral-400">Gérer votre abonnement et votre facturation.</p>
            </div>
            <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-600">
              Compte Free
            </span>
          </div>
        </section>

        {/* Supprimer le compte */}
        <section className="mt-4 rounded-xl border border-error/10 bg-neutral-0 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <div>
              <h2 className="text-base font-medium text-neutral-900 md:text-lg">Supprimer le compte</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Supprimer définitivement votre compte et toutes vos données.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Bientôt disponible</span>
              <button
                type="button"
                disabled
                className="rounded-md bg-error/10 px-4 py-2 text-sm font-medium text-error cursor-not-allowed opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        </section>

        {/* Se déconnecter */}
        <section className="mt-4 rounded-xl border border-neutral-200 bg-neutral-0 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <div>
              <h2 className="text-base font-medium text-neutral-900 md:text-lg">Se déconnecter</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Fermer votre session sur cet appareil.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  )
}
