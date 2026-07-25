type TicketOption = {
  id: string
  priceCents: number
}

type ActivityOption = {
  id: string
  statusAvailable: boolean
  ticketTypes: TicketOption[]
}

export type DefaultEventRegistration = {
  activityId: string | null
  ticketTypeId: string | null
  needsPayment: boolean
}

/** Sélection automatique activité + billet (même logique que l’ancien formulaire). */
export function resolveDefaultEventRegistration(
  hasActivities: boolean,
  activities: ActivityOption[],
  ticketTypes: TicketOption[],
): DefaultEventRegistration | null {
  if (hasActivities) {
    const activity = activities.find((a) => a.statusAvailable && a.ticketTypes.length > 0)
    if (!activity) return null
    const free = activity.ticketTypes.find((t) => t.priceCents <= 0)
    const ticket = free ?? activity.ticketTypes[0]
    if (!ticket) return null
    return {
      activityId: activity.id,
      ticketTypeId: ticket.id,
      needsPayment: ticket.priceCents > 0,
    }
  }

  if (ticketTypes.length > 0) {
    const free = ticketTypes.find((t) => t.priceCents <= 0)
    const ticket = free ?? ticketTypes[0]
    return {
      activityId: null,
      ticketTypeId: ticket.id,
      needsPayment: ticket.priceCents > 0,
    }
  }

  return {
    activityId: null,
    ticketTypeId: null,
    needsPayment: false,
  }
}
