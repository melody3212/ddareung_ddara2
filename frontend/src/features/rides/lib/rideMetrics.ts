import { getDistanceMeters } from '../../../shared/geo'
import type { RidePoint } from '../types'

/** GPS 노이즈·점프 필터 후 거리 증가분(m). 무시하면 0 */
export function deltaDistanceM(
  prev: RidePoint | null,
  next: RidePoint,
  opts?: { maxAccuracyM?: number; minStepM?: number; maxJumpM?: number },
): number {
  const maxAcc = opts?.maxAccuracyM ?? 55
  const minStep = opts?.minStepM ?? 2.5
  const maxJump = opts?.maxJumpM ?? 80

  if (next.accuracy != null && next.accuracy > maxAcc) return 0
  if (!prev) return 0

  const dist = getDistanceMeters(
    { lat: prev.lat, lng: prev.lng },
    { lat: next.lat, lng: next.lng },
  )
  if (dist < minStep) return 0

  const dt = Math.max(0, next.t - prev.t) / 1000
  // 비정상 점프 (순간 이동)
  if (dt > 0 && dist > maxJump && dist / dt > 25) return 0 // > 90km/h 급점프
  if (dist > maxJump * 1.5) return 0

  return dist
}

/** 구간 순간 속도 km/h */
export function segmentSpeedKmh(prev: RidePoint, next: RidePoint, distM: number): number {
  const dtH = (next.t - prev.t) / 3_600_000
  if (dtH <= 0 || distM <= 0) return 0
  return distM / 1000 / dtH
}

export function pointsToPath(points: RidePoint[]): number[][] {
  return points.map((p) => [p.lng, p.lat])
}

/** 포인트가 너무 많으면 균등 샘플 */
export function samplePoints(points: RidePoint[], max = 800): RidePoint[] {
  if (points.length <= max) return points
  const out: RidePoint[] = []
  const step = (points.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) {
    out.push(points[Math.round(i * step)])
  }
  return out
}

export function avgSpeedKmh(distanceM: number, movingMs: number): number {
  if (movingMs <= 0 || distanceM <= 0) return 0
  return distanceM / 1000 / (movingMs / 3_600_000)
}

/**
 * 소모 칼로리 추정 (자전거)
 * - 기본: MET 방식 — moderate cycling ≈ 6.8 MET
 * - 이동 시간이 있으면 MET×체중×시간, 없으면 거리 보정
 * kcal ≈ MET × weight_kg × hours
 */
export function estimateCaloriesKcal(
  distanceM: number,
  weightKg: number,
  movingMs?: number,
): number {
  const kg = weightKg > 0 ? weightKg : 70
  const km = Math.max(0, distanceM) / 1000
  const hours =
    movingMs != null && movingMs > 0 ? movingMs / 3_600_000 : km > 0 ? km / 15 : 0 // 15km/h 가정

  // 평균 속도에 따라 MET 조정
  const speed = hours > 0 ? km / hours : 15
  let met = 6.8
  if (speed < 12) met = 5.8
  else if (speed < 16) met = 6.8
  else if (speed < 20) met = 8.0
  else met = 10.0

  const fromMet = met * kg * hours
  // 거리가 거의 없으면 0
  if (km < 0.02 && hours < 1 / 60) return 0
  return Math.max(0, fromMet)
}

export function newRideId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ride-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
