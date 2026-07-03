export function isMissingColumnError(error: unknown, column?: string): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''
  if (code === '42703') {
    return column ? message.includes(column) : true
  }
  return (
    message.includes('does not exist') &&
    message.includes('column') &&
    (!column || message.includes(column))
  )
}
