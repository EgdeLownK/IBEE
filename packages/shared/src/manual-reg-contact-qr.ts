export type ParsedContactQr = {
  name: string
  email: string
  phone: string
}

const IBEE_CONTACT_PREFIX = 'ibee:contact:'

export function parseContactFromQr(raw: string): ParsedContactQr | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const payload =
      url.searchParams.get('contact') ?? url.searchParams.get('c') ?? url.hash.replace(/^#/, '')
    if (payload) {
      const parsed = parseIbeeContactJson(decodeURIComponent(payload))
      if (parsed) return parsed
    }
  } catch {
    // Not a URL.
  }

  if (trimmed.startsWith(IBEE_CONTACT_PREFIX)) {
    return parseIbeeContactJson(trimmed.slice(IBEE_CONTACT_PREFIX.length))
  }

  if (trimmed.startsWith('BEGIN:VCARD')) {
    return parseVCard(trimmed)
  }

  if (trimmed.startsWith('MECARD:')) {
    return parseMecard(trimmed)
  }

  if (trimmed.startsWith('{')) {
    return parseIbeeContactJson(trimmed)
  }

  if (trimmed.startsWith('mailto:')) {
    const email = trimmed.slice(7).split('?')[0]?.trim() ?? ''
    if (email.includes('@')) {
      return { name: '', email, phone: '' }
    }
  }

  return null
}

function parseIbeeContactJson(raw: string): ParsedContactQr | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const name = pickString(data, ['name', 'fullName', 'full_name', 'fn'])
    const email = pickString(data, ['email', 'mail'])
    const phone = pickString(data, ['phone', 'tel', 'telephone', 'mobile'])

    if (!name && !email && !phone) return null
    return { name, email, phone }
  } catch {
    return null
  }
}

function pickString(data: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function parseVCard(raw: string): ParsedContactQr | null {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  let name = ''
  let email = ''
  let phone = ''

  for (const line of lines) {
    const upper = line.toUpperCase()
    const value = line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : ''

    if (upper.startsWith('FN:')) {
      name = value
      continue
    }
    if (upper.startsWith('N:') && !name) {
      const parts = value.split(';')
      const family = parts[0]?.trim() ?? ''
      const given = parts[1]?.trim() ?? ''
      name = [given, family].filter(Boolean).join(' ')
      continue
    }
    if (upper.startsWith('EMAIL')) {
      email = stripMailto(value)
      continue
    }
    if (upper.startsWith('TEL')) {
      phone = value
    }
  }

  if (!name && !email && !phone) return null
  return { name, email, phone }
}

function parseMecard(raw: string): ParsedContactQr | null {
  const body = raw.slice('MECARD:'.length)
  const parts = body.split(';')
  let name = ''
  let email = ''
  let phone = ''

  for (const part of parts) {
    const [key, ...rest] = part.split(':')
    const value = rest.join(':').trim()
    if (!key || !value) continue

    switch (key.toUpperCase()) {
      case 'N': {
        const nameParts = value.split(',')
        const family = nameParts[0]?.trim() ?? ''
        const given = nameParts[1]?.trim() ?? ''
        name = [given, family].filter(Boolean).join(' ')
        break
      }
      case 'FN':
        name = value
        break
      case 'EMAIL':
        email = stripMailto(value)
        break
      case 'TEL':
        phone = value
        break
      default:
        break
    }
  }

  if (!name && !email && !phone) return null
  return { name, email, phone }
}

function stripMailto(value: string): string {
  return value.replace(/^mailto:/i, '').trim()
}
