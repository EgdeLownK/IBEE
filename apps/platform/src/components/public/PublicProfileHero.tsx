'use client'

import { Share, UserMinus, UserPlus, Plus, Pencil } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Props {
  displayName: string
  role: string | null
  bio: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  entityId: string
  entitySlug: string
  ownerId: string | null
  followersCount: number
  isAuthenticated: boolean
  isFollowing: boolean
  loginUrl?: string
}

function formatFollowers(count: number) {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count)
}

export function PublicProfileHero({
  displayName,
  role,
  bio,
  avatarUrl,
  bannerUrl,
  entityId,
  entitySlug,
  ownerId,
  followersCount: initialFollowersCount,
  isAuthenticated,
  isFollowing: initialIsFollowing,
  loginUrl = '/login',
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [busy, setBusy] = useState(false)
  const [isAuthStateLoaded, setIsAuthStateLoaded] = useState(false)
  const [isAuthed, setIsAuthed] = useState(isAuthenticated)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch(
          `/api/profile-state?entityId=${entityId}${ownerId ? `&ownerId=${ownerId}` : ''}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const data = await res.json()
          setIsAuthed(data.isAuthenticated)
          setIsFollowing(data.isFollowing)
          setIsOwner(data.isOwner)
        }
      } catch (err) {
        console.error('[auth-state]', err)
      } finally {
        setIsAuthStateLoaded(true)
      }
    }
    fetchState()
  }, [entityId, ownerId])

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

  async function toggleFollow() {
    if (busy) return
    setBusy(true)
    try {
      const endpoint = isFollowing ? '/api/unfollow' : '/api/follow'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, slug: entitySlug }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { is_following: boolean; followers_count: number }
      setIsFollowing(data.is_following)
      setFollowersCount(data.followers_count ?? 0)
    } catch (err) {
      console.error('[follow]', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <header>
      <div className="relative">
        <div className="profile-banner">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              className="profile-banner__img"
              width={800}
              height={172}
              priority
            />
          ) : (
            <div className="profile-banner__placeholder" aria-hidden="true">
              <span className="profile-banner__label">BANNER IMAGE 800×172</span>
            </div>
          )}
        </div>
        <button type="button" className="iconbtn profile-share" aria-label="Partager le profil">
          <Share className="h-[17px] w-[17px]" aria-hidden="true" />
        </button>
      </div>

      <div className="px-[22px]">
        <div className="mt-6 flex items-center gap-4">
          <div className="profile-avatar">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                width={172}
                height={172}
                priority
              />
            ) : (
              <span className="font-display text-[30px] font-semibold text-accent">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate font-display text-[22px] font-semibold leading-tight text-neutral-900">
              {displayName}
            </h1>
            {role && <p className="mb-0 mt-0.5 text-[13.5px] text-neutral-500">{role}</p>}
          </div>
        </div>

        {followersCount > 0 && (
          <p className="mb-0 mt-4 text-[13.5px] text-neutral-600">
            <b className="font-display font-bold text-neutral-900">
              {formatFollowers(followersCount)}
            </b>{' '}
            abonnés
          </p>
        )}

        {bio && <p className="mb-0 mt-3 text-[13.5px] leading-normal text-neutral-600">{bio}</p>}

        <div className="mb-1 mt-5 flex items-center gap-2.5">
          {!isAuthStateLoaded ? (
            <div className="btn btn--accent opacity-50 cursor-wait">
              <span className="opacity-0">Suivre</span>
            </div>
          ) : isOwner ? (
            <>
              <Link
                href="/dashboard/site"
                className="btn btn--dark flex-1 text-center justify-center"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Passer en mode édition
              </Link>
            </>
          ) : isAuthed ? (
            <button
              type="button"
              className={`btn btn--accent${isFollowing ? ' btn--ghost' : ''}`}
              disabled={busy}
              onClick={toggleFollow}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                  Abonné
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Suivre
                </>
              )}
            </button>
          ) : (
            <Link href={loginUrl} className="btn btn--accent">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Suivre
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
