/**
 * 길찾기 — personal=내 자전거 / ddareung=따릉이
 */
import type { ElevationSummary, GradeSegment } from '../elevation/types'

export type RouteMode = 'personal' | 'ddareung'
export type RoutePreference = 'safe' | 'fast' | 'scenic'

export type LatLng = {
  lat: number
  lng: number
}

export type RouteSearchRequest = {
  origin: LatLng
  destination: LatLng
  mode: RouteMode
  preference?: RoutePreference
  via?: number[][]
}

export type NavStep = {
  instruction: string
  maneuver_type: string
  modifier?: string | null
  road_name?: string | null
  distance_m: number
  duration_s: number
  lat: number
  lng: number
  distance_along_m: number
  leg_kind: 'walk' | 'bike'
  icon: string
}

export type RouteLeg = {
  kind: 'walk' | 'bike'
  from_label: string
  to_label: string
  path: number[][]
  distance_m: number
  duration_min?: number | null
  grade_summary?: ElevationSummary | null
  steps?: NavStep[]
}

/** 경로 중 자전거 도로 점유율 (프론트 bikeload 분석) */
export type BikeRoadShare = {
  on_bike_road_pct: number
  off_bike_road_pct: number
  on_bike_road_m: number
  off_bike_road_m: number
  dedicated_pct: number
  shared_road_pct: number
}

export type RouteSearchResult = {
  route_id: string
  mode: RouteMode
  preference: string
  distance_m: number
  duration_min: number
  path: number[][]
  elevation: ElevationSummary
  segments: GradeSegment[]
  legs: RouteLeg[]
  /** 전체 경로 턴 바이 턴 (길안내) */
  steps?: NavStep[]
  walk_distance_m?: number | null
  bike_distance_m?: number | null
  walk_duration_min?: number | null
  bike_duration_min?: number | null
  /** 라이딩 구간 기준 자전거 도로 비율 */
  bike_road_share?: BikeRoadShare | null
  notes: string[]
  is_stub: boolean
}

export type RouteSearchResponse = {
  routes: RouteSearchResult[]
  source: string
}

export type RouteMeta = {
  modes: Record<string, string>
  preferences: string[]
  status: string
  note: string
  elevation: string
}

/** 거리 표시: 도보는 m 우선, 자전거는 km */
export function formatLegDistance(meters: number, kind: 'walk' | 'bike'): string {
  if (kind === 'walk' || meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}
