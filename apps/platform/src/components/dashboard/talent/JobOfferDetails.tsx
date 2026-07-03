'use client'

import { useState } from 'react'
import { JobOffer, JobApplication } from '@ibee/supabase'
import { Edit, MapPin, Eye, Download, Users, Archive, ArchiveRestore, Users2, CalendarDays, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { JobOfferDialog } from './JobOfferDialog'
import { updateApplicationStatusAction } from '../../../app/dashboard/talent/talent-actions'

export function JobOfferDetails({ entityId, offer, applications }: { entityId: string; offer: JobOffer; applications: JobApplication[] }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [showArchives, setShowArchives] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('new')

  const handleStatusChange = async (appId: string, newStatus: any) => {
    await updateApplicationStatusAction(appId, newStatus, offer.id)
  }

  const displayedApplications = applications.filter(a => {
    if (Boolean(a.is_archived) !== showArchives) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    return true
  })
  
  const selectedApp = displayedApplications.find(a => a.id === selectedAppId) || displayedApplications[0] || null

  // --- Analytics Logic ---
  const kpis = {
    total: displayedApplications.length,
    new: displayedApplications.filter(a => a.status === 'new').length,
    shortlisted: displayedApplications.filter(a => a.status === 'shortlisted').length,
    interviewing: displayedApplications.filter(a => a.status === 'interviewing').length,
    hired: displayedApplications.filter(a => a.status === 'hired').length,
    rejected: displayedApplications.filter(a => a.status === 'rejected').length,
  }

  const locations = displayedApplications.reduce((acc, app) => {
    const loc = app.location || 'Non renseigné'
    acc[loc] = (acc[loc] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Gender calculation
  const totalWithGender = displayedApplications.filter(a => a.gender === 'Homme' || a.gender === 'Femme' || a.gender === 'LGBT+').length
  const males = displayedApplications.filter(a => a.gender === 'Homme').length
  const females = displayedApplications.filter(a => a.gender === 'Femme').length
  const lgbt = displayedApplications.filter(a => a.gender === 'LGBT+').length

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
  displayedApplications.forEach(app => {
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

  const archivedCount = applications.filter(a => Boolean(a.is_archived)).length

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto w-full">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talent" className="inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-semibold text-neutral-900">{offer.title}</h1>
            <p className="text-sm text-neutral-500 mt-1">Gérez les détails de l'offre et les candidatures reçues.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchives(!showArchives)}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border h-10 px-4 shadow-sm ${
                showArchives 
                  ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800' 
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {showArchives ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
              {showArchives ? "Retour à la campagne active" : `Voir l'historique (${archivedCount})`}
            </button>
          )}
          <button 
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-900 h-10 px-4 shadow-sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier l'offre
          </button>
        </div>
      </div>

      {showArchives && (
        <div className="bg-neutral-900 text-white p-4 rounded-xl shadow-sm text-sm font-medium flex items-center justify-center gap-2">
          <Archive className="w-4 h-4 text-neutral-400" />
          Vous consultez actuellement l'historique des candidatures des campagnes précédentes.
        </div>
      )}

      {/* ANALYTICS DASHBOARD */}
      <div className="flex flex-col gap-6">

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-neutral-400" />
              <h3 className="text-base font-semibold text-neutral-900">Localisation</h3>
            </div>
            {Object.keys(locations).length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas de données.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(locations).sort((a, b) => b[1] - a[1]).map(([loc, count]) => (
                  <div key={loc} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-neutral-600 truncate" title={loc}>{loc}</div>
                    <div className="flex-1 bg-neutral-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-neutral-900 h-full rounded-full transition-all" style={{ width: `${(count / Math.max(...Object.values(locations))) * 100}%` }} />
                    </div>
                    <div className="w-8 text-sm font-medium text-right text-neutral-900">{count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Users2 className="w-5 h-5 text-neutral-400" />
              <h3 className="text-base font-semibold text-neutral-900">Répartition par sexe</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="relative w-32 h-32 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                   style={{
                     background: totalWithGender === 0 
                       ? '#f5f5f5' 
                       : `conic-gradient(#f472b6 0% ${femalePct}%, #3b82f6 ${femalePct}% ${femalePct + malePct}%, #a855f7 ${femalePct + malePct}% 100%)`
                   }}>
                <div className="absolute inset-0 rounded-full border border-black/5" />
                <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm relative z-10 border border-neutral-100">
                  <div className="text-2xl font-bold text-neutral-900">{totalWithGender}</div>
                  <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">Total</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-4 w-full">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-pink-400" />
                    <span className="text-xs font-medium text-neutral-500">Femme</span>
                  </div>
                  <div className="text-base font-bold text-neutral-900">{femalePct}%</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-neutral-500">Homme</span>
                  </div>
                  <div className="text-base font-bold text-neutral-900">{malePct}%</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-medium text-neutral-500">LGBT+</span>
                  </div>
                  <div className="text-base font-bold text-neutral-900">{lgbtPct}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays className="w-5 h-5 text-neutral-400" />
              <h3 className="text-base font-semibold text-neutral-900">Répartition par âge</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(ageBrackets).map(([bracket, count]) => {
                const pct = totalWithAge > 0 ? Math.round((count / totalWithAge) * 100) : 0
                return (
                  <div key={bracket} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-neutral-600 truncate">{bracket}</div>
                    <div className="flex-1 bg-neutral-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-neutral-900 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-8 text-sm font-medium text-right text-neutral-900">{pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* APPLICATIONS LIST & DETAILS */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-neutral-900">Liste des Candidatures {showArchives ? "(Archive)" : ""}</h2>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {[
              { id: 'new', label: 'Nouvelles' },
              { id: 'shortlisted', label: 'Retenues' },
              { id: 'interviewing', label: 'Rencontres' },
              { id: 'hired', label: 'Validées' },
              { id: 'rejected', label: 'Refusées' },
              { id: 'all', label: 'Toutes' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterStatus(tab.id)
                  setSelectedAppId(null) // reset selection on filter change
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  filterStatus === tab.id 
                    ? 'bg-neutral-900 text-white' 
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {displayedApplications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center text-neutral-500 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-900">Aucune candidature</p>
            <p className="text-sm mt-1">Aucune candidature ne correspond à cette vue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Scrollable List */}
            <div className="col-span-1 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col h-[600px]">
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {displayedApplications.map(app => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`w-full text-left p-3 rounded-lg flex flex-col gap-2 transition-colors ${selectedApp?.id === app.id ? 'bg-neutral-100 ring-1 ring-neutral-200' : 'hover:bg-neutral-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-neutral-900 truncate pr-2">{app.first_name} {app.last_name}</div>
                      <div className="text-xs text-neutral-400 whitespace-nowrap">{new Date(app.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs rounded-md px-2 py-1 font-medium ${
                        app.status === 'new' ? 'bg-blue-50 text-blue-700' :
                        app.status === 'shortlisted' ? 'bg-yellow-50 text-yellow-800' :
                        app.status === 'interviewing' ? 'bg-indigo-50 text-indigo-700' :
                        app.status === 'hired' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {app.status === 'new' ? 'Nouvelle' :
                         app.status === 'shortlisted' ? 'Retenue' :
                         app.status === 'interviewing' ? 'Rencontre' :
                         app.status === 'hired' ? 'Validée' : 'Refusée'}
                      </span>
                      {app.location && (
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <MapPin className="h-3 w-3" /> <span className="truncate max-w-[100px]">{app.location}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Profile Detail (Fixed) */}
            <div className="col-span-2">
              {selectedApp ? (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 sticky top-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-900">{selectedApp.first_name} {selectedApp.last_name}</h3>
                      <div className="text-neutral-500 mt-1">{selectedApp.email} {selectedApp.phone ? ` • ${selectedApp.phone}` : ''}</div>
                    </div>
                    <select 
                      value={selectedApp.status}
                      disabled={showArchives}
                      onChange={(e) => handleStatusChange(selectedApp.id, e.target.value)}
                      className={`text-sm rounded-lg border-0 py-2 pl-3 pr-8 font-medium ring-1 ring-inset focus:ring-2 focus:ring-inset disabled:opacity-50 ${
                        selectedApp.status === 'new' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 focus:ring-blue-600' :
                        selectedApp.status === 'shortlisted' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20 focus:ring-yellow-600' :
                        selectedApp.status === 'interviewing' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 focus:ring-indigo-600' :
                        selectedApp.status === 'hired' ? 'bg-green-50 text-green-700 ring-green-600/20 focus:ring-green-600' :
                        'bg-red-50 text-red-700 ring-red-600/20 focus:ring-red-600'
                      }`}
                    >
                      <option value="new">Nouvelle</option>
                      <option value="shortlisted">Retenue</option>
                      <option value="interviewing">Rencontre</option>
                      <option value="hired">Validée</option>
                      <option value="rejected">Refusée</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Âge</div>
                      <div className="font-medium text-neutral-900">
                        {/* @ts-ignore */}
                        {selectedApp.age !== undefined && selectedApp.age !== null ? `${selectedApp.age} ans` : 'Non renseigné'}
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Genre</div>
                      <div className="font-medium text-neutral-900">{selectedApp.gender || 'Non renseigné'}</div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Localisation</div>
                      <div className="font-medium text-neutral-900 truncate" title={selectedApp.location || ''}>{selectedApp.location || 'Non renseigné'}</div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="text-xs text-neutral-500 mb-1">Candidature le</div>
                      <div className="font-medium text-neutral-900">{new Date(selectedApp.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>

                  {selectedApp.message && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-2">Message du candidat</h4>
                      <div className="p-4 bg-neutral-50 rounded-lg text-sm text-neutral-700 whitespace-pre-wrap">
                        {selectedApp.message}
                      </div>
                    </div>
                  )}

                  {selectedApp.resume_url && (
                    <div>
                      <a href={selectedApp.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium">
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
