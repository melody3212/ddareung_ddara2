/** 경사 구간 (지도 색상·길찾기 결과 공통) */
export type GradeSegment = {
  from_idx: number
  to_idx: number
  path: number[][]
  distance_m: number
  elevation_delta_m: number
  grade_pct: number
  abs_grade_pct: number
  band: 'flat' | 'gentle' | 'moderate' | 'steep' | 'very_steep' | string
  color: string
  is_steep: boolean
}

export type ElevationSummary = {
  distance_m: number
  elevation_gain_m: number
  elevation_loss_m: number
  max_grade_pct: number
  avg_abs_grade_pct: number
  steep_distance_m: number
  steep_ratio: number
}

export type ElevationProfile = {
  source: string
  path_id?: string | number | null
  points: Array<{
    lat: number | null
    lng: number | null
    elevation_m: number | null
    distance_m: number
  }>
  segments: GradeSegment[]
  summary: ElevationSummary
}

export type ElevationBatchResponse = {
  source: string
  profiles: ElevationProfile[]
  note: string
}

export type ElevationMeta = {
  source: string
  bands: Record<string, string>
  colors: Record<string, string>
  steep_threshold_pct: number
  note: string
}
