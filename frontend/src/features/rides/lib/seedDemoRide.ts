/**
 * 실외 이동 없이 UI 테스트용 데모 주행 기록
 * - 여의도 한강 근처 샘플 path
 * - localStorage 에 저장 후 상세 → 코스로 저장 테스트 가능
 */
import { saveRideRecord } from '../storage'
import type { RidePoint, RideRecord } from '../types'
import { estimateCaloriesKcal, newRideId } from './rideMetrics'

/** 여의도~샛강 쪽 대략 경로 [lng, lat] */
const DEMO_PATH: number[][] = [
  [126.9245, 37.5219],
  [126.9265, 37.5235],
  [126.9288, 37.5250],
  [126.9310, 37.5262],
  [126.9335, 37.5272],
  [126.9360, 37.5280],
  [126.9385, 37.5288],
  [126.9410, 37.5295],
  [126.9435, 37.5290],
  [126.9455, 37.5275],
  [126.9470, 37.5258],
  [126.9450, 37.5240],
  [126.9420, 37.5225],
  [126.9385, 37.5215],
  [126.9350, 37.5208],
  [126.9310, 37.5205],
  [126.9275, 37.5210],
  [126.9245, 37.5219],
]

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLng = toR(b.lng - a.lng)
  const la1 = toR(a.lat)
  const la2 = toR(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * 데모 주행 1건 저장
 * @returns 저장된 기록 (상세 URL: /riding/{id})
 */
export function seedDemoRideRecord(): RideRecord {
  const now = Date.now()
  const startedAt = now - 42 * 60_000 // 42분 전 시작
  const points: RidePoint[] = DEMO_PATH.map((pt, i) => ({
    lng: Number(pt[0]),
    lat: Number(pt[1]),
    t: startedAt + i * 90_000, // 점마다 1.5분
    accuracy: 8,
  }))

  let distanceM = 0
  for (let i = 1; i < points.length; i++) {
    distanceM += haversineM(points[i - 1], points[i])
  }
  distanceM = Math.round(distanceM)

  const movingMs = Math.max(5 * 60_000, points.length * 90_000 * 0.7)
  const hours = movingMs / 3_600_000
  const avgSpeedKmh =
    hours > 0 ? Math.round((distanceM / 1000 / hours) * 10) / 10 : 12
  const maxSpeedKmh = Math.round((avgSpeedKmh + 4) * 10) / 10
  const caloriesKcal = Math.round(
    estimateCaloriesKcal(distanceM, 70, movingMs),
  )

  const record: RideRecord = {
    id: newRideId(),
    startedAt,
    endedAt: now,
    movingMs,
    distanceM,
    avgSpeedKmh,
    maxSpeedKmh,
    caloriesKcal,
    path: DEMO_PATH.map((p) => [Number(p[0]), Number(p[1])]),
    points,
    photos: [],
    weatherSnapshot: { temp_c: 18, condition: '맑음', score: 82 },
    note: '[데모] 실외 이동 없이 추가한 테스트 기록입니다.',
    userId: null,
  }

  saveRideRecord(record)
  return record
}
