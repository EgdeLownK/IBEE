'use client'

import { useState, useEffect } from 'react'
import { JobOffer, JobApplication } from '@ibee/supabase'
import type { HistoryBlock } from '@ibee/shared'
import { MapPin, Download, Users, Users2, CalendarDays, ChevronLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { entityDetailExcerpt } from '@/lib/entity-detail-excerpt'
import { JobOfferDialog } from './JobOfferDialog'
import { contractLabel } from '@/components/public/jobs/contract-labels'
import {
  locationTags,
  formatShortDate,
  formatCompensationAmount,
  compensationUnitLabel,
} from '@/components/public/jobs/JobOfferRow'
import { JobOfferAdminMenu } from '@/components/public/jobs/JobOfferAdminMenu'
import {
  updateApplicationStatusAction,
  deleteJobOfferAction,
} from '../../../app/dashboard/talent/talent-actions'

type ApplicationStatus = 'new' | 'shortlisted' | 'interviewing' | 'hired' | 'rejected'

// Systeme de badges statut candidature — repris de la maquette Claude Design
// (mission feat/talent-detail-design, voir rapport phase 0) : chaque statut
// se distingue par une COULEUR/FOND (tokens IBEE, jamais de bleu/jaune/indigo/
// vert/rouge Tailwind par defaut) ET une FORME de marqueur (plein, cercle,
// carre, tirete) — pas seulement une teinte, pour rester lisible meme sans
// percevoir la couleur. 'new' et 'hired' partagent le marqueur plein
// (accent) mais des fonds opposes (clair/sombre), voir StatusBadge.
const STATUS_META: Record<
  ApplicationStatus,
  { label: string; badgeClass: string; marker: 'dot' | 'ring' | 'square' | 'dash' }
> = {
  new: { label: 'Nouvelle', badgeClass: 'bg-accent-tint text-accent-hover', marker: 'dot' },
  shortlisted: { label: 'Retenue', badgeClass: 'bg-neutral-100 text-neutral-900', marker: 'ring' },
  interviewing: {
    label: 'Rencontre',
    badgeClass: 'bg-neutral-200 text-neutral-900',
    marker: 'square',
  },
  hired: { label: 'Validée', badgeClass: 'bg-neutral-900 text-surface', marker: 'dot' },
  rejected: {
    label: 'Refusée',
    badgeClass: 'border border-border text-neutral-400',
    marker: 'dash',
  },
}

function StatusMarker({ type }: { type: 'dot' | 'ring' | 'square' | 'dash' }) {
  if (type === 'dot') return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
  if (type === 'ring')
    return <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-accent" />
  if (type === 'square') return <span className="h-1.5 w-1.5 shrink-0 bg-neutral-900" />
  return <span className="h-px w-2 shrink-0 bg-neutral-400" />
}

function StatusBadge({ status, size = 'sm' }: { status: ApplicationStatus; size?: 'sm' | 'lg' }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill font-bold whitespace-nowrap ${meta.badgeClass} ${
        size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-[11px]'
      }`}
    >
      <StatusMarker type={meta.marker} />
      {meta.label}
    </span>
  )
}

export function JobOfferDetails({
  entityId,
  offer,
  applications,
}: {
  entityId: string
  offer: JobOffer
  applications: JobApplication[]
}) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const getDefaultStatus = (apps: JobApplication[]) => {
    const activeApps = apps.filter((a) => !a.is_archived)
    if (activeApps.length === 0) return 'new'
    if (activeApps.some((a) => a.status === 'new')) return 'new'
    if (activeApps.some((a) => a.status === 'shortlisted')) return 'shortlisted'
    if (activeApps.some((a) => a.status === 'interviewing')) return 'interviewing'
    if (activeApps.some((a) => a.status === 'hired')) return 'hired'
    if (activeApps.some((a) => a.status === 'rejected')) return 'rejected'
    return 'new'
  }

  const [filterStatus, setFilterStatus] = useState<string>(() => getDefaultStatus(applications))
  const [searchQuery, setSearchQuery] = useState('')
  const [localApplications, setLocalApplications] = useState<JobApplication[]>(applications)

  useEffect(() => {
    setLocalApplications(applications)
  }, [applications])

  const handleStatusChange = async (appId: string, newStatus: any) => {
    setLocalApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
    )
    await updateApplicationStatusAction(appId, newStatus, offer.id)
  }

  const displayedApplications = localApplications.filter((a) => {
    if (a.is_archived) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = `${a.first_name} ${a.last_name}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    return true
  })
  const selectedApp =
    localApplications.find((a) => a.id === selectedAppId) || displayedApplications[0] || null

  // Compteurs des onglets de filtre : calcules sur les candidatures actives
  // (jamais les archivees, voir rapport phase 0 "fix/talent-detail-header-
  // menu" — la vue archives a disparu de l'interface), mais INDEPENDAMMENT
  // de searchQuery et de l'onglet actif — sinon chaque onglet n'afficherait
  // que son propre compte courant au lieu d'un aperçu stable de la
  // repartition. Maquette Claude Design (voir rapport phase 0) : libelles au
  // singulier + compteur ("Nouvelle 2"), remplace le pluriel sans compteur
  // (decision explicite de Killian, la maquette fait foi ici).
  const baseApplications = localApplications.filter((a) => !a.is_archived)
  const statusCounts = {
    new: baseApplications.filter((a) => a.status === 'new').length,
    shortlisted: baseApplications.filter((a) => a.status === 'shortlisted').length,
    interviewing: baseApplications.filter((a) => a.status === 'interviewing').length,
    hired: baseApplications.filter((a) => a.status === 'hired').length,
    rejected: baseApplications.filter((a) => a.status === 'rejected').length,
  }

  // --- Analytics Logic ---
  const locations = displayedApplications.reduce(
    (acc, app) => {
      const loc = app.location || 'Non renseigné'
      acc[loc] = (acc[loc] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Gender calculation
  const totalWithGender = displayedApplications.filter(
    (a) => a.gender === 'Homme' || a.gender === 'Femme' || a.gender === 'LGBT+',
  ).length
  const males = displayedApplications.filter((a) => a.gender === 'Homme').length
  const females = displayedApplications.filter((a) => a.gender === 'Femme').length
  const lgbt = displayedApplications.filter((a) => a.gender === 'LGBT+').length

  const malePct = totalWithGender > 0 ? Math.round((males / totalWithGender) * 100) : 0
  const femalePct = totalWithGender > 0 ? Math.round((females / totalWithGender) * 100) : 0
  const lgbtPct = totalWithGender > 0 ? Math.round((lgbt / totalWithGender) * 100) : 0

  // Age calculation
  const ageBrackets: Record<string, number> = {
    '< 18 ans': 0,
    '18-24 ans': 0,
    '25-34 ans': 0,
    '35-44 ans': 0,
    '45-54 ans': 0,
    '55+ ans': 0,
  }
  let totalWithAge = 0
  displayedApplications.forEach((app) => {
    // @ts-ignore - age might not be strictly typed everywhere yet
    const age = app.age
    if (age !== undefined && age !== null) {
      totalWithAge++
      if (age < 18) ageBrackets['< 18 ans']++
      else if (age <= 24) ageBrackets['18-24 ans']++
      else if (age <= 34) ageBrackets['25-34 ans']++
      else if (age <= 44) ageBrackets['35-44 ans']++
      else if (age <= 54) ageBrackets['45-54 ans']++
      else ageBrackets['55+ ans']++
    }
  })

  // Bloc "caracteristiques de l'offre" (statut/contrat/lieu/cadre/
  // remuneration/date de fin/candidatures/publiee le/description) — ajoute
  // par la maquette Claude Design, absent de la page avant cette mission.
  // Toutes les donnees existent deja sur `offer`/`applications` (aucune
  // ecriture, aucun nouvel appel serveur). Candidatures/nouvelles comptees
  // sur les candidatures NON archivees uniquement (measure de la campagne
  // active).
  const activeApplicationsForOffer = applications.filter((a) => !a.is_archived)
  const totalApplicationsCount = activeApplicationsForOffer.length
  const newApplicationsCount = activeApplicationsForOffer.filter((a) => a.status === 'new').length
  const compensationAmountLabel =
    offer.compensation_amount && offer.compensation_type
      ? formatCompensationAmount(offer.compensation_amount, offer.compensation_type)
      : null
  const compensationUnit = compensationUnitLabel(offer.compensation_frequency ?? null)
  const offerExcerpt = offer.blocks
    ? entityDetailExcerpt({ content_blocks: offer.blocks as HistoryBlock[] })
    : ''

  return (
    <div className="talent-page flex flex-col gap-6">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-2.5">
          <Link
            href="/dashboard/talent"
            className="mt-1 inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-field text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
              {offer.title}
            </h1>
            <p className="text-sm text-neutral-500 mt-1.5">
              Gérez les détails de l&apos;offre et les candidatures reçues.
            </p>
          </div>
        </div>
        {/* Ancre position:relative de taille fixe pour .job-row__admin
            (position:absolute top:10/right:10 sur 32px, voir
            JobOfferAdminMenu.tsx) hors du contexte carte — voir
            .talent-page__admin-menu-anchor, talent-styles.css. */}
        <div className="talent-page__admin-menu-anchor">
          <JobOfferAdminMenu
            title={offer.title}
            onEdit={() => setIsEditOpen(true)}
            onDelete={async () => {
              if (
                window.confirm(
                  'Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.',
                )
              ) {
                await deleteJobOfferAction(entityId, offer.id)
                router.push('/dashboard/talent')
              }
            }}
          />
        </div>
      </div>

      {/* CARACTERISTIQUES DE L'OFFRE */}
      <div className="bg-surface border border-border rounded-card p-5">
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-tint px-2.5 py-1 text-[11.5px] font-bold text-accent-hover">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {offer.status === 'active' ? 'En ligne' : 'Hors ligne'}
          </span>
          <span className="rounded-pill bg-neutral-900 px-2.5 py-1 text-[11px] font-bold text-surface">
            {contractLabel(offer.contract_type)}
          </span>
          {locationTags(offer.location_type, offer.location_text).map((tag) => (
            <span
              key={tag}
              className="rounded-pill bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600"
            >
              {tag}
            </span>
          ))}
          {offer.is_cadre && (
            <span className="rounded-pill border border-border px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
              Cadre
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 profile:grid-cols-4 gap-4 border-t border-neutral-100 pt-3.5">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
              Rémunération
            </div>
            <div className="text-base font-bold tabular-nums">
              {compensationAmountLabel ?? '—'}
              {compensationUnit && (
                <span className="ml-1 text-xs font-medium text-neutral-400">
                  {compensationUnit}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
              Date de fin
            </div>
            <div className="text-base font-bold">
              {offer.end_date ? formatShortDate(offer.end_date) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
              Candidatures
            </div>
            <div className="text-base font-bold">
              {totalApplicationsCount}
              {newApplicationsCount > 0 && (
                <span className="ml-1 text-xs font-semibold text-accent-hover">
                  · {newApplicationsCount} nouvelle{newApplicationsCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
              Publiée le
            </div>
            <div className="text-base font-bold">{formatShortDate(offer.created_at)}</div>
          </div>
        </div>
        {offerExcerpt && (
          <p className="mt-3.5 max-w-[70ch] text-sm leading-relaxed text-neutral-500">
            {offerExcerpt}
          </p>
        )}
      </div>

      {/* ANALYTICS DASHBOARD */}
      <div className="grid grid-cols-1 profile:grid-cols-3 gap-5">
        <div className="bg-surface rounded-card border border-border p-[18px]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-[18px] h-[18px] text-neutral-400" />
            <h3 className="text-[15px] font-bold text-neutral-900">Localisation</h3>
          </div>
          {Object.keys(locations).length === 0 ? (
            <p className="text-neutral-500 text-sm">Pas de données.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(locations)
                .sort((a, b) => b[1] - a[1])
                .map(([loc, count]) => (
                  <div key={loc} className="flex items-center gap-2.5">
                    <div
                      className="w-24 shrink-0 truncate text-[13px] text-neutral-600"
                      title={loc}
                    >
                      {loc}
                    </div>
                    <div className="flex-1 bg-neutral-100 h-2 rounded-pill overflow-hidden">
                      <div
                        className="bg-accent h-full rounded-pill transition-all"
                        style={{
                          width: `${(count / Math.max(...Object.values(locations))) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="w-[22px] shrink-0 text-right text-[12.5px] font-bold tabular-nums text-neutral-900">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-card border border-border p-[18px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Users2 className="w-[18px] h-[18px] text-neutral-400" />
            <h3 className="text-[15px] font-bold text-neutral-900">Répartition par sexe</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="relative w-40 h-40 shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    totalWithGender === 0
                      ? 'var(--color-neutral-100)'
                      : `conic-gradient(var(--color-accent) 0% ${femalePct}%, var(--color-neutral-900) ${femalePct}% ${femalePct + malePct}%, var(--color-neutral-300) ${femalePct + malePct}% 100%)`,
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-3xl font-bold leading-none text-neutral-900">
                  {totalWithGender}
                </div>
                <div className="text-[10px] tracking-[0.1em] text-neutral-400 mt-1">TOTAL</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <span className="h-[7px] w-[7px] rounded-full bg-accent" />
                  Femme
                </div>
                <div className="text-sm font-bold mt-0.5 tabular-nums text-neutral-900">
                  {femalePct}%
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <span className="h-[7px] w-[7px] rounded-full bg-neutral-900" />
                  Homme
                </div>
                <div className="text-sm font-bold mt-0.5 tabular-nums text-neutral-900">
                  {malePct}%
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                  <span className="h-[7px] w-[7px] rounded-full bg-neutral-300" />
                  LGBT+
                </div>
                <div className="text-sm font-bold mt-0.5 tabular-nums text-neutral-900">
                  {lgbtPct}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-card border border-border p-[18px]">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-[18px] h-[18px] text-neutral-400" />
            <h3 className="text-[15px] font-bold text-neutral-900">Répartition par âge</h3>
          </div>
          <div className="space-y-2.5">
            {Object.entries(ageBrackets).map(([bracket, count]) => {
              const pct = totalWithAge > 0 ? Math.round((count / totalWithAge) * 100) : 0
              return (
                <div key={bracket} className="flex items-center gap-2.5">
                  <div className="w-[74px] shrink-0 text-[13px] text-neutral-600">{bracket}</div>
                  <div className="flex-1 bg-neutral-100 h-2 rounded-pill overflow-hidden">
                    <div
                      className="bg-accent h-full rounded-pill transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-[34px] shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-neutral-600">
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* APPLICATIONS LIST & DETAILS */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Liste des candidatures
          </h2>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'new', label: STATUS_META.new.label, count: statusCounts.new },
              {
                id: 'shortlisted',
                label: STATUS_META.shortlisted.label,
                count: statusCounts.shortlisted,
              },
              {
                id: 'interviewing',
                label: STATUS_META.interviewing.label,
                count: statusCounts.interviewing,
              },
              { id: 'hired', label: STATUS_META.hired.label, count: statusCounts.hired },
              { id: 'rejected', label: STATUS_META.rejected.label, count: statusCounts.rejected },
              { id: 'all', label: 'Toutes', count: baseApplications.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterStatus(tab.id)
                  setSelectedAppId(null) // reset selection on filter change
                }}
                className={`shrink-0 h-[34px] px-3.5 text-[13px] font-semibold rounded-pill whitespace-nowrap transition-colors ${
                  filterStatus === tab.id
                    ? 'bg-accent text-surface'
                    : 'bg-surface text-neutral-600 border border-border hover:bg-panel-2'
                }`}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
        </div>

        {displayedApplications.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm border border-border p-12 text-center text-neutral-500 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-900">Aucune candidature</p>
            <p className="text-sm mt-1">Aucune candidature ne correspond à cette vue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 profile:grid-cols-[352px_1fr] gap-[18px] items-start">
            {/* LEFT COLUMN: List (hauteur libre, pas de plafond — decision
                explicite de Killian, la maquette proposait 600px desktop/
                340px mobile mais la consigne recue est de n'en garder
                aucune). */}
            <div className="flex flex-col gap-2.5 min-w-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un candidat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full h-[38px] rounded-field border border-border bg-surface pl-9 pr-3 text-[13.5px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-accent"
                />
              </div>
              <div className="bg-surface border border-border rounded-card p-1.5 flex flex-col gap-1">
                {displayedApplications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`w-full text-left p-3 rounded-field flex items-center justify-between gap-2.5 transition-colors ${
                      selectedApp?.id === app.id
                        ? 'bg-neutral-100 shadow-[inset_3px_0_0_var(--color-accent)]'
                        : 'hover:bg-panel'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[14.5px] text-neutral-900 truncate">
                        {app.first_name} {app.last_name}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {new Date(app.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <StatusBadge status={app.status as ApplicationStatus} />
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Profile Detail */}
            <div className="min-w-0">
              {selectedApp ? (
                <div className="bg-surface rounded-card shadow-sm border border-border p-5">
                  <div className="mb-6">
                    <div className="mb-2.5">
                      <StatusBadge status={selectedApp.status as ApplicationStatus} size="lg" />
                    </div>
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-bold tracking-tight text-neutral-900 mt-2.5 mb-1.5">
                          {selectedApp.first_name} {selectedApp.last_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-neutral-500">
                          <span>{selectedApp.email}</span>
                          {selectedApp.phone && (
                            <>
                              <span className="text-neutral-300">·</span>
                              <span>{selectedApp.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-neutral-100 my-[18px]" />

                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'shortlisted', label: 'Retenue' },
                        { id: 'interviewing', label: 'Rencontre' },
                      ].map((status) => (
                        <button
                          key={status.id}
                          onClick={() => handleStatusChange(selectedApp.id, status.id)}
                          className="h-9 px-3.5 rounded-field border border-border bg-surface text-[13px] font-semibold text-neutral-900 transition-colors hover:bg-panel-2 disabled:opacity-50"
                        >
                          {status.label}
                        </button>
                      ))}
                      <button
                        onClick={() => handleStatusChange(selectedApp.id, 'hired')}
                        className="h-9 px-3.5 rounded-field bg-neutral-900 text-[13px] font-semibold text-surface transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        Validée
                      </button>
                      <button
                        disabled={selectedApp.status === 'rejected'}
                        onClick={() => handleStatusChange(selectedApp.id, 'rejected')}
                        className="h-9 px-3.5 rounded-field border border-neutral-300 bg-surface text-[13px] font-semibold text-neutral-600 transition-colors hover:bg-panel-2 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Refuser la candidature
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 profile:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-panel rounded-tile">
                      <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
                        Âge
                      </div>
                      <div className="text-[14.5px] font-bold text-neutral-900">
                        {/* @ts-ignore */}
                        {selectedApp.age !== undefined && selectedApp.age !== null
                          ? `${selectedApp.age} ans`
                          : 'Non renseigné'}
                      </div>
                    </div>
                    <div className="p-3 bg-panel rounded-tile">
                      <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
                        Genre
                      </div>
                      <div className="text-[14.5px] font-bold text-neutral-900">
                        {selectedApp.gender || 'Non renseigné'}
                      </div>
                    </div>
                    <div className="p-3 bg-panel rounded-tile">
                      <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
                        Localisation
                      </div>
                      <div
                        className="text-[14.5px] font-bold text-neutral-900 truncate"
                        title={selectedApp.location || ''}
                      >
                        {selectedApp.location || 'Non renseigné'}
                      </div>
                    </div>
                    <div className="p-3 bg-panel rounded-tile">
                      <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1">
                        Candidature le
                      </div>
                      <div className="text-[14.5px] font-bold text-neutral-900">
                        {new Date(selectedApp.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  {selectedApp.message && (
                    <div className="mt-[18px]">
                      <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 mb-1.5">
                        Message
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-600 whitespace-pre-wrap">
                        {selectedApp.message}
                      </p>
                    </div>
                  )}

                  {selectedApp.resume_url && (
                    <div className="mt-[18px]">
                      <a
                        href={selectedApp.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-field border border-border bg-surface text-[13.5px] font-semibold text-neutral-900 transition-colors hover:bg-panel-2"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger le CV
                      </a>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <JobOfferDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        entityId={entityId}
        offer={offer}
      />
    </div>
  )
}
