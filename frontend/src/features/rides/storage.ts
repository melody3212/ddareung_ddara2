/**
 * 주행 기록 로컬 저장소
 * - 완료 기록: localStorage 목록
 * - 진행 중 세션: 별도 키 (앱 재진입 시 복구)
 * 나중에 ApiRideStore 로 교체 가능하도록 함수 단위로 분리
 */
import type { ActiveRideSession, RideRecord } from './types'

const RECORDS_KEY = 'ddareung_ride_records_v1'
const ACTIVE_KEY = 'ddareung_ride_active_v1'
const MAX_RECORDS = 100

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** 완료 기록 전체 (최신순) */
export function listRideRecords(): RideRecord[] {
  const data = safeParse<RideRecord[]>(localStorage.getItem(RECORDS_KEY))
  if (!Array.isArray(data)) return []
  return [...data].sort((a, b) => b.startedAt - a.startedAt)
}

export function getRideRecord(id: string): RideRecord | null {
  return listRideRecords().find((r) => r.id === id) ?? null
}

export function saveRideRecord(record: RideRecord): void {
  const list = listRideRecords().filter((r) => r.id !== record.id)
  list.unshift(record)
  const trimmed = list.slice(0, MAX_RECORDS)
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(trimmed))
  } catch {
    // Quota: 오래된 기록부터 사진 제거 후 재시도
    const stripped = trimmed.map((r, i) =>
      i < 5 ? r : { ...r, photos: r.photos?.length ? r.photos.slice(0, 1) : r.photos },
    )
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(stripped))
    } catch {
      const noPhotos = trimmed.map((r) =>
        r.id === record.id ? record : { ...r, photos: [] },
      )
      // 최신 기록 사진만 유지
      noPhotos[0] = record
      localStorage.setItem(RECORDS_KEY, JSON.stringify(noPhotos.slice(0, 40)))
    }
  }
}

export function deleteRideRecord(id: string): boolean {
  const list = listRideRecords()
  const next = list.filter((r) => r.id !== id)
  if (next.length === list.length) return false
  localStorage.setItem(RECORDS_KEY, JSON.stringify(next))
  return true
}

export function clearAllRideRecords(): void {
  localStorage.removeItem(RECORDS_KEY)
}

export function loadActiveRideSession(): ActiveRideSession | null {
  const data = safeParse<ActiveRideSession>(localStorage.getItem(ACTIVE_KEY))
  if (!data?.id || !data.startedAt) return null
  if (data.status !== 'recording' && data.status !== 'paused') return null
  return data
}

export function saveActiveRideSession(session: ActiveRideSession): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(session))
  } catch {
    // 사진이 크면 마지막 사진 제외 후 재시도
    const slim: ActiveRideSession = {
      ...session,
      photos: (session.photos ?? []).slice(0, Math.max(0, (session.photos?.length ?? 1) - 1)),
    }
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(slim))
    throw new Error('storage_quota')
  }
}

export function clearActiveRideSession(): void {
  localStorage.removeItem(ACTIVE_KEY)
}

export function countRideRecords(): number {
  return listRideRecords().length
}
