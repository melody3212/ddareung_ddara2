const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export type Station = {
  station_id: string
  name: string
  lat: number
  lng: number
  bike_count: number | null
  rack_tot_cnt?: number | null
  shared?: number | null
}

export type StationsMeta = {
  source: string
  count: number
  configured: boolean
  cache_ttl_sec: number
  note: string
  docs_url: string
  api_example: string
}

export type Course = {
  course_id: number
  title: string
  distance_km: number
  duration_min: number
  difficulty: string
  tags: string[]
  rating: number | null
  description: string | null
  path: number[][] | null
}

export type Weather = {
  lat: number
  lng: number
  temp_c: number
  feels_like_c: number
  precip_prob: number
  humidity: number
  wind_ms: number
  pm10_grade: number
  pm10_label: string
  score: number
  message: string
  source: string
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

export const api = {
  health: () => request<{ status: string; app: string }>('/health'),
  stations: () => request<Station[]>('/stations'),
  stationsMeta: () => request<StationsMeta>('/stations/meta'),
  courses: (difficulty?: string) =>
    request<Course[]>(difficulty ? `/courses?difficulty=${difficulty}` : '/courses'),
  course: (id: number) => request<Course>(`/courses/${id}`),
  weather: (lat?: number, lng?: number) => {
    const q = new URLSearchParams()
    if (lat != null) q.set('lat', String(lat))
    if (lng != null) q.set('lng', String(lng))
    const qs = q.toString()
    return request<Weather>(`/weather${qs ? `?${qs}` : ''}`)
  },
  bikePaths: () => request<BikePath[]>('/bike-paths'),
  bikePathsMeta: () => request<BikePathMeta>('/bike-paths/meta'),
  /** Safemap WMS 프록시 PNG URL (현재 지도 bbox용) */
  bikePathsWmsUrl: (bbox: {
    minx: number
    miny: number
    maxx: number
    maxy: number
    width?: number
    height?: number
  }) => {
    const q = new URLSearchParams({
      minx: String(bbox.minx),
      miny: String(bbox.miny),
      maxx: String(bbox.maxx),
      maxy: String(bbox.maxy),
      width: String(bbox.width ?? 768),
      height: String(bbox.height ?? 768),
    })
    // cache-bust so pan/zoom always refreshes
    q.set('_', String(Date.now()))
    return `${BASE}/bike-paths/wms?${q.toString()}`
  },
}
