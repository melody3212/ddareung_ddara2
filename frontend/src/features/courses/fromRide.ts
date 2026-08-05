/**
 * 주행 기록 → 내 코스 변환
 */
import type { RideRecord } from '../rides/types'
import { newLocalCourseId } from './localCourseStorage'
import type { CourseDifficulty, LocalCourseRecord } from './types'

const MAX_PATH_POINTS = 400

function samplePath(path: number[][], max = MAX_PATH_POINTS): number[][] {
  if (path.length <= max) return path.map((p) => [Number(p[0]), Number(p[1])])
  const out: number[][] = []
  const step = (path.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) {
    const idx = Math.min(path.length - 1, Math.round(i * step))
    const p = path[idx]
    out.push([Number(p[0]), Number(p[1])])
  }
  return out
}

function guessDifficulty(distanceKm: number): CourseDifficulty {
  if (distanceKm < 8) return 'beginner'
  if (distanceKm < 18) return 'intermediate'
  return 'advanced'
}

function defaultTitle(startedAt: number): string {
  const d = new Date(startedAt)
  const mm = d.getMonth() + 1
  const dd = d.getDate()
  return `내 라이딩 ${mm}/${dd}`
}

export type SaveCourseFromRideInput = {
  ride: RideRecord
  title?: string
  description?: string
  /** 기본 private — 나중에 shared/public 공유 */
  visibility?: LocalCourseRecord['visibility']
  /** 여가 / 출퇴근 / 기타 */
  category?: LocalCourseRecord['category']
}

/** 코스 저장용 path 추출 (path / points 모두 시도) */
export function extractRidePath(ride: RideRecord): number[][] {
  const fromPath = Array.isArray(ride.path)
    ? ride.path
        .filter((p) => Array.isArray(p) && p.length >= 2)
        .map((p) => [Number(p[0]), Number(p[1])])
    : []
  if (fromPath.length >= 2) return fromPath

  const fromPoints = (ride.points ?? [])
    .filter((p) => p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => [Number(p.lng), Number(p.lat)])
  return fromPoints
}

/**
 * 주행 기록으로 LocalCourseRecord 생성 (저장은 호출측)
 */
export function buildCourseFromRide(
  input: SaveCourseFromRideInput,
): LocalCourseRecord | null {
  const { ride } = input
  const rawPath = extractRidePath(ride)

  if (rawPath.length < 2) return null

  const path = samplePath(rawPath)
  const distance_km = Math.round((ride.distanceM / 1000) * 10) / 10
  const duration_min = Math.max(1, Math.round(ride.movingMs / 60_000))
  const difficulty = guessDifficulty(distance_km)
  const now = Date.now()

  const tags = ['#내코스', '#로컬']
  if (distance_km >= 20) tags.push('#장거리')
  else if (distance_km < 8) tags.push('#단거리')

  return {
    course_id: newLocalCourseId(),
    title: (input.title?.trim() || defaultTitle(ride.startedAt)).slice(0, 40),
    distance_km,
    duration_min,
    difficulty,
    tags,
    rating: null,
    description:
      input.description?.trim() ||
      `주행 기록에서 저장 · ${distance_km}km · ${duration_min}분` +
        (ride.note ? ` · ${ride.note}` : ''),
    path,
    source: 'local',
    visibility: input.visibility ?? 'private',
    createdAt: now,
    updatedAt: now,
    fromRideId: ride.id,
    serverId: null,
    authorLabel: '나',
    category: input.category ?? 'leisure',
    savedFrom: 'ride',
    originCourseId: null,
  }
}
