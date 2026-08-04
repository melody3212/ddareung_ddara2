export type PlaceItem = {
  id: string
  name: string
  address?: string | null
  road_address?: string | null
  category?: string | null
  phone?: string | null
  lat: number
  lng: number
  source: string
}

export type PlaceSearchResponse = {
  query: string
  places: PlaceItem[]
  source: string
  note?: string | null
}

export type PlaceMeta = {
  configured: boolean
  source: string
  note: string
  docs_url: string
}

/** 길찾기 출발/도착 선택 상태 */
export type SelectedPlace = {
  name: string
  lat: number
  lng: number
  address?: string | null
}
