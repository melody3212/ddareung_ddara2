/**
 * 주행 세션 순수 계산 — 훅/UI 비의존
 */
import {
  avgSpeedKmh,
  estimateCaloriesKcal,
  pointsToPath,
  samplePoints,
} from './rideMetrics'
import { MAX_RIDE_PHOTOS } from './photoCompress'
import type { ActiveRideSession, RidePoint, RideRecord } from '../types'

/** 일시정지 제외 이동 시간(ms) */
export function sessionMovingMs(
  s: Pick<
    ActiveRideSession,
    'status' | 'accumulatedMovingMs' | 'segmentStartedAt'
  >,
  now = Date.now(),
): number {
  let ms = s.accumulatedMovingMs
  if (s.status === 'recording' && s.segmentStartedAt != null) {
    ms += Math.max(0, now - s.segmentStartedAt)
  }
  return ms
}

/** 저장할 만큼 이동했는지 (사진은 예외로 허용) */
export function isRideTooShort(
  distanceM: number,
  movingMs: number,
  photoCount: number,
): boolean {
  return distanceM < 20 && movingMs < 30_000 && photoCount === 0
}

/** lastPoint 가 points 끝에 없으면 보강 */
export function ensureLastPointInList(
  points: RidePoint[],
  lastPoint: RidePoint | null,
): RidePoint[] {
  if (!lastPoint) return points
  const last = points[points.length - 1]
  if (
    !last ||
    last.lat !== lastPoint.lat ||
    last.lng !== lastPoint.lng ||
    last.t !== lastPoint.t
  ) {
    return [...points, lastPoint]
  }
  return points
}

/** 활성 세션 → 완료 기록 (저장 전 객체) */
export function finalizeSessionToRecord(
  s: ActiveRideSession,
  now = Date.now(),
): RideRecord {
  const moving = sessionMovingMs(s, now)
  const ridePhotos = (s.photos ?? []).slice(0, MAX_RIDE_PHOTOS)
  const rawPoints = ensureLastPointInList(s.points ?? [], s.lastPoint)
  const sampled = samplePoints(rawPoints, 800)
  const path = pointsToPath(sampled)
  const avg = avgSpeedKmh(s.distanceM, moving)
  const kcal = estimateCaloriesKcal(s.distanceM, s.weightKg, moving)

  return {
    id: s.id,
    startedAt: s.startedAt,
    endedAt: now,
    movingMs: moving,
    distanceM: s.distanceM,
    avgSpeedKmh: Math.round(avg * 10) / 10,
    maxSpeedKmh: Math.round(s.maxSpeedKmh * 10) / 10,
    caloriesKcal: Math.round(kcal),
    path,
    points: sampled,
    photos: ridePhotos,
    weatherSnapshot: null,
    note: null,
    userId: null,
  }
}

export function createEmptySession(
  id: string,
  now: number,
  weightKg: number,
): ActiveRideSession {
  return {
    id,
    status: 'recording',
    startedAt: now,
    segmentStartedAt: now,
    accumulatedMovingMs: 0,
    distanceM: 0,
    maxSpeedKmh: 0,
    points: [],
    lastPoint: null,
    weightKg,
    photos: [],
  }
}

export function pauseSession(
  s: ActiveRideSession,
  now = Date.now(),
): ActiveRideSession {
  let acc = s.accumulatedMovingMs
  if (s.segmentStartedAt != null) {
    acc += Math.max(0, now - s.segmentStartedAt)
  }
  return {
    ...s,
    status: 'paused',
    accumulatedMovingMs: acc,
    segmentStartedAt: null,
  }
}

export function resumeSession(
  s: ActiveRideSession,
  now = Date.now(),
): ActiveRideSession {
  return {
    ...s,
    status: 'recording',
    segmentStartedAt: now,
  }
}
