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
