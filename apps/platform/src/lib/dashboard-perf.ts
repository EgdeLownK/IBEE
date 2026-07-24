import 'server-only'

export type DashboardPerfBudgetKey =
  'shell' | 'analyse' | 'analyse-action' | 'site-shell' | 'site-playlists' | 'equipe'

/** Budgets cibles en prod (ms) — voir docs/plans/2026-06-10-dashboard-performance-globale.md */
export const DASHBOARD_PERF_BUDGETS_MS: Record<DashboardPerfBudgetKey, number> = {
  shell: 300,
  analyse: 800,
  'analyse-action': 600,
  'site-shell': 400,
  'site-playlists': 1200,
  equipe: 500,
}

export function isDashboardPerfDebug(): boolean {
  const flag = process.env.NEXT_DEBUG
  return flag === '1' || flag === 'true'
}

function budgetFor(label: string): number | undefined {
  if (label.includes('shell') && !label.includes('site-shell')) {
    return DASHBOARD_PERF_BUDGETS_MS.shell
  }
  if (label.startsWith('page:analyse')) return DASHBOARD_PERF_BUDGETS_MS.analyse
  if (label.startsWith('action:analyse')) return DASHBOARD_PERF_BUDGETS_MS['analyse-action']
  if (label.startsWith('page:site-shell')) return DASHBOARD_PERF_BUDGETS_MS['site-shell']
  if (label.startsWith('page:site-playlists')) return DASHBOARD_PERF_BUDGETS_MS['site-playlists']
  if (label.startsWith('page:equipe')) return DASHBOARD_PERF_BUDGETS_MS.equipe
  if (label.startsWith('context:')) return DASHBOARD_PERF_BUDGETS_MS.shell
  return undefined
}

export function logDashboardPerf(
  label: string,
  durationMs: number,
  meta?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!isDashboardPerfDebug()) return

  const rounded = Math.round(durationMs * 10) / 10
  const budget = budgetFor(label)
  const overBudget = budget != null && rounded > budget
  const prefix = overBudget ? '[dashboard:perf:OVER]' : '[dashboard:perf]'
  const budgetHint = budget != null ? ` (budget ${budget} ms)` : ''
  const metaSuffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''

  console.info(`${prefix} ${label} ${rounded} ms${budgetHint}${metaSuffix}`)
}

export async function measureDashboardLoad<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  if (!isDashboardPerfDebug()) return fn()

  const start = performance.now()
  try {
    return await fn()
  } finally {
    logDashboardPerf(label, performance.now() - start, meta)
  }
}
