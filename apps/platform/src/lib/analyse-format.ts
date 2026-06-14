export function formatMetricNumber(value: number) {
  return value.toLocaleString('fr-FR')
}

export function formatMetricPercent(value: number, digits = 1) {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`
}

export function formatMetricCurrency(cents: number) {
  const euros = cents / 100
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(euros)
}

export function formatRankingPercent(count: number, total: number) {
  if (total <= 0) return '0 %'
  return `${Math.round((count / total) * 100)} %`
}

export function formatUnavailableMetric() {
  return '—'
}
