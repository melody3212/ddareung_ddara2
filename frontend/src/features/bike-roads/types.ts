export type CourseType = '하천/공원형' | '도로변형' | '기타'

export type BikeRoadLine = {
  path: { lat: number; lng: number }[]
  type: CourseType
  rawType?: string
}

export type BikePath = {
  path_id: number
  name: string | null
  grade: string | null
  coordinates: number[][]
  is_disconnected: boolean
}

export type BikePathMeta = {
  source: 'safemap_wms' | 'mock' | string
  configured: boolean
  layer: string | null
  note: string
  docs_url: string
}
