const DIGITAL_PRODUCT_FORMATS = ['pdf', 'epub', 'mp4', 'mp3', 'zip'] as const

function fileExtension(name: string): string {
  return (name.split('.').pop() || '').toLowerCase()
}

export function digitalFormatFromName(name: string): string {
  const ext = fileExtension(name)
  return (DIGITAL_PRODUCT_FORMATS as readonly string[]).includes(ext) ? ext : 'other'
}
