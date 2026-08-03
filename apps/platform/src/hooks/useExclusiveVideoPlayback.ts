'use client'

import { useEffect, useRef } from 'react'

// Etat partage process-wide (une seule page ouverte cote client a la
// fois) : au plus une vignette video en lecture simultanee sur toute la
// page, quelle que soit la surface (liste publique, studio, pilotage
// talent -- plusieurs instances de JobOfferRow independantes). Un simple
// singleton suffit ; pas besoin de Context/Provider pour un etat runtime
// navigateur qui n'a rien a voir avec l'arbre de composants.
let currentlyPlaying: HTMLVideoElement | null = null

function stop(video: HTMLVideoElement) {
  video.pause()
  video.currentTime = 0
  if (currentlyPlaying === video) currentlyPlaying = null
}

function play(video: HTMLVideoElement) {
  if (currentlyPlaying && currentlyPlaying !== video) stop(currentlyPlaying)
  currentlyPlaying = video
  // Autoplay peut etre bloque par le navigateur malgre muted+playsInline
  // (rare, mais pas impossible) -- pas d'action de repli, la vignette
  // reste simplement sur sa premiere frame.
  video.play().catch(() => {})
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Un seul IntersectionObserver pour toute la page (pas un par carte) :
// a chaque callback, ne retient que la vignette la plus visible parmi
// celles au-dessus du seuil, pour departager le cas "deux cartes video
// visibles en meme temps" sur mobile (pas de survol pour trancher).
let sharedObserver: IntersectionObserver | null = null
const observedVideos = new Map<Element, HTMLVideoElement>()

function getSharedObserver(threshold: number) {
  if (sharedObserver) return sharedObserver
  sharedObserver = new IntersectionObserver(
    (entries) => {
      let best: { video: HTMLVideoElement; ratio: number } | null = null
      for (const entry of entries) {
        const video = observedVideos.get(entry.target)
        if (!video) continue
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { video, ratio: entry.intersectionRatio }
          }
        } else if (currentlyPlaying === video) {
          stop(video)
        }
      }
      if (best && currentlyPlaying !== best.video) play(best.video)
    },
    { threshold: [0, threshold, 1] },
  )
  return sharedObserver
}

/**
 * Lecture video "vignette" exclusive (job-row__media) : survol sur
 * desktop, visibilite a l'ecran (seuil `threshold`) sur mobile -- jamais
 * deux vignettes en lecture en meme temps sur la page, jamais de son
 * (l'appelant doit rendre <video muted>), jamais de lecture si
 * prefers-reduced-motion. Le hook decide QUAND jouer ; il ne rend rien.
 */
export function useExclusiveVideoPlayback(threshold = 0.6) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cardRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const card = cardRef.current
    const video = videoRef.current
    if (!card || !video) return
    if (reducedMotion()) return
    // Desktop (survol disponible) : la lecture est pilotee par
    // onMouseEnter/onMouseLeave, pas par la visibilite -- sans cette
    // garde, faire defiler la page suffirait a lancer la lecture meme
    // sur un pointeur souris.
    if (window.matchMedia('(hover: hover)').matches) return

    const observer = getSharedObserver(threshold)
    observedVideos.set(card, video)
    observer.observe(card)

    return () => {
      observer.unobserve(card)
      observedVideos.delete(card)
      if (currentlyPlaying === video) stop(video)
    }
  }, [threshold])

  function onMouseEnter() {
    const video = videoRef.current
    if (!video || reducedMotion()) return
    play(video)
  }

  function onMouseLeave() {
    const video = videoRef.current
    if (video) stop(video)
  }

  return { videoRef, cardRef, onMouseEnter, onMouseLeave }
}
