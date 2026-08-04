/**
 * 경로 대비 자전거 도로 점유율 분석
 * public bikeload.geojson (BikeRoadLine) 기준, 경로 샘플이 자전거 도로 근처면 "자전거 도로 위"
 */
import { getDistanceMeters } from '../../shared/geo'
import type { BikeRoadLine, CourseType } from './types'

export type BikeRoadCoverage = {
  /** 0–100 */
  on_bike_road_pct: number
  /** 0–100 */
  off_bike_road_pct: number
  on_bike_road_m: number
  off_bike_road_m: number
  /** 자전거 도로 중 하천/공원형(전용 등) 비율 0–100 (전체 경로 대비) */
  dedicated_pct: number
  /** 자전거 도로 중 도로변형(우선도로 등) 비율 0–100 (전체 경로 대비) */
  shared_road_pct: number
  sample_count: number
  threshold_m: number
}

const DEFAULT_THRESHOLD_M = 28
const SAMPLE_STEP_M = 30

function distPointToSegmentM(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  // 평면 근사 (서울 규모 짧은 세그먼트)
  const ax = a.lng
  const ay = a.lat
  const bx = b.lng
  const by = b.lat
  const px = p.lng
  const py = p.lat
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  let t = ab2 <= 0 ? 0 : (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + abx * t
  const cy = ay + aby * t
  return getDistanceMeters(p, { lat: cy, lng: cx })
}

function minDistToRoads(
  p: { lat: number; lng: number },
  roads: BikeRoadLine[],
): { dist: number; type: CourseType | null } {
  let best = Infinity
  let bestType: CourseType | null = null
  for (const road of roads) {
    const path = road.path
    for (let i = 1; i < path.length; i++) {
      const d = distPointToSegmentM(p, path[i - 1], path[i])
      if (d < best) {
        best = d
        bestType = road.type
      }
    }
  }
  return { dist: best, type: bestType }
}

/** 경로 [[lng,lat]] 를 step_m 간격으로 리샘플 + 구간 길이 */
function resamplePath(
  path: number[][],
  stepM: number,
): Array<{ lat: number; lng: number; seg_m: number }> {
  const pts: { lat: number; lng: number }[] = []
  for (const c of path) {
    if (c.length < 2) continue
    pts.push({ lng: Number(c[0]), lat: Number(c[1]) })
  }
  if (pts.length < 2) return []

  const out: Array<{ lat: number; lng: number; seg_m: number }> = []
  let carry = 0
  out.push({ ...pts[0], seg_m: 0 })

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    let rem = getDistanceMeters(a, b)
    if (rem < 0.5) continue
    let used = 0
    while (carry + (rem - used) >= stepM) {
      const need = stepM - carry
      const t = (used + need) / rem
      const lat = a.lat + (b.lat - a.lat) * t
      const lng = a.lng + (b.lng - a.lng) * t
      out.push({ lat, lng, seg_m: stepM })
      used += need
      carry = 0
    }
    carry += rem - used
  }
  // 남은 꼬리
  if (carry > 1) {
    const last = pts[pts.length - 1]
    out.push({ ...last, seg_m: carry })
  }
  return out
}

/** bbox로 후보 도로 축소 */
function filterRoadsNearPath(path: number[][], roads: BikeRoadLine[], padDeg = 0.008): BikeRoadLine[] {
  let minLat = 90
  let maxLat = -90
  let minLng = 180
  let maxLng = -180
  for (const c of path) {
    if (c.length < 2) continue
    const lng = Number(c[0])
    const lat = Number(c[1])
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }
  minLat -= padDeg
  maxLat += padDeg
  minLng -= padDeg
  maxLng += padDeg

  return roads.filter((r) => {
    for (const p of r.path) {
      if (p.lat >= minLat && p.lat <= maxLat && p.lng >= minLng && p.lng <= maxLng) {
        return true
      }
    }
    return false
  })
}

/**
 * path: 전체 또는 자전거 구간 [[lng, lat]]
 */
export function analyzeBikeRoadCoverage(
  path: number[][],
  roads: BikeRoadLine[],
  opts?: { thresholdM?: number; stepM?: number },
): BikeRoadCoverage {
  const thresholdM = opts?.thresholdM ?? DEFAULT_THRESHOLD_M
  const stepM = opts?.stepM ?? SAMPLE_STEP_M

  const empty: BikeRoadCoverage = {
    on_bike_road_pct: 0,
    off_bike_road_pct: 100,
    on_bike_road_m: 0,
    off_bike_road_m: 0,
    dedicated_pct: 0,
    shared_road_pct: 0,
    sample_count: 0,
    threshold_m: thresholdM,
  }

  if (!path || path.length < 2 || !roads.length) return empty

  const nearRoads = filterRoadsNearPath(path, roads)
  const samples = resamplePath(path, stepM)
  if (samples.length < 2) return empty

  let onM = 0
  let offM = 0
  let dedicatedM = 0
  let sharedM = 0
  let n = 0

  for (const s of samples) {
    if (s.seg_m <= 0) continue
    n += 1
    const { dist, type } = minDistToRoads(s, nearRoads.length ? nearRoads : roads)
    if (dist <= thresholdM) {
      onM += s.seg_m
      if (type === '하천/공원형') dedicatedM += s.seg_m
      else if (type === '도로변형') sharedM += s.seg_m
      else {
        // 기타 자전거 관련도 자전거 도로로 카운트
        sharedM += s.seg_m * 0 // 기타는 dedicated/shared에 안 넣음, onM만
      }
    } else {
      offM += s.seg_m
    }
  }

  const total = onM + offM || 1
  return {
    on_bike_road_pct: Math.round((onM / total) * 1000) / 10,
    off_bike_road_pct: Math.round((offM / total) * 1000) / 10,
    on_bike_road_m: Math.round(onM),
    off_bike_road_m: Math.round(offM),
    dedicated_pct: Math.round((dedicatedM / total) * 1000) / 10,
    shared_road_pct: Math.round((sharedM / total) * 1000) / 10,
    sample_count: n,
    threshold_m: thresholdM,
  }
}
