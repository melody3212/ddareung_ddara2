/**
 * GPS 1회 수신 → 세션 갱신 (순수)
 * skip: 노이즈/과도한 정확도 불량으로 반영 안 함
 */
import { deltaDistanceM, segmentSpeedKmh } from './rideMetrics'
import type { ActiveRideSession, RidePoint } from '../types'

export type GpsApplyResult =
  | { kind: 'skip'; reason: 'not_recording' | 'noise' | 'stationary' }
  | {
      kind: 'apply'
      session: ActiveRideSession
      speedKmh: number
      position: { lat: number; lng: number }
      accuracy: number | null
    }

export function applyGpsToSession(
  s: ActiveRideSession | null,
  coords: {
    latitude: number
    longitude: number
    accuracy?: number | null
  },
  timestamp: number,
): GpsApplyResult {
  if (!s || s.status !== 'recording') {
    return { kind: 'skip', reason: 'not_recording' }
  }

  const pt: RidePoint = {
    lat: coords.latitude,
    lng: coords.longitude,
    t: timestamp || Date.now(),
    accuracy: coords.accuracy ?? null,
  }

  const position = { lat: pt.lat, lng: pt.lng }
  const accuracy = pt.accuracy ?? null
  const delta = deltaDistanceM(s.lastPoint, pt)

  let speed = 0
  if (s.lastPoint && delta > 0) {
    speed = segmentSpeedKmh(s.lastPoint, pt, delta)
    if (speed > 55) speed = 0
  }

  // 유효 이동 또는 첫 점
  if (delta > 0 || !s.lastPoint) {
    const next: ActiveRideSession = {
      ...s,
      distanceM: s.distanceM + delta,
      maxSpeedKmh: speed > 0 ? Math.max(s.maxSpeedKmh, speed) : s.maxSpeedKmh,
      points: [...s.points, pt],
      lastPoint: pt,
    }
    return { kind: 'apply', session: next, speedKmh: speed, position, accuracy }
  }

  // 이동 없음 — 정확도 불량이면 스킵
  if (pt.accuracy != null && pt.accuracy > 55) {
    return { kind: 'skip', reason: 'noise' }
  }

  // 정지: 4초 미만 중복 점 스킵
  const lastStored = s.points[s.points.length - 1]
  if (lastStored && pt.t - lastStored.t < 4000) {
    return { kind: 'skip', reason: 'stationary' }
  }

  const next: ActiveRideSession = {
    ...s,
    points: [...s.points, pt],
    lastPoint: pt,
  }
  return { kind: 'apply', session: next, speedKmh: 0, position, accuracy }
}
