export type HomeWidget = {
  id: string
  type: string
  position: number
  config: Record<string, unknown>
}

export type PickerProduct = {
  id: string
  title: string
  tags: string[]
  category_id?: string | null
}

export type PickerCategory = { id: string; name: string }

export type PickerService = {
  id: string
  title: string
  tags: string[]
}

export type PickerEvent = { id: string; title: string }

export type PickerPublication = { id: string; title: string; tags: string[] }

export type WidgetPickerData = {
  products: PickerProduct[]
  categories: PickerCategory[]
  services: PickerService[]
  events: PickerEvent[]
  publications: PickerPublication[]
}
