/**
 * 길안내 세션 — sessionStorage 에 선택 경로 저장
 */
import type { RouteSearchResult } from './types'

const KEY = 'ddareung_nav_route_v1'

export type NavSessionMeta = {
  originName?: string
  destinationName?: string
  savedAt: number
}

export type NavSession = {
  route: RouteSearchResult
  meta: NavSessionMeta
}

export function saveNavSession(
  route: RouteSearchResult,
  meta?: Partial<NavSessionMeta>,
): void {
  const payload: NavSession = {
    route,
    meta: {
      originName: meta?.originName,
      destinationName: meta?.destinationName,
      savedAt: Date.now(),
    },
  }
  sessionStorage.setItem(KEY, JSON.stringify(payload))
}

export function loadNavSession(): NavSession | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as NavSession
    if (!data?.route?.path?.length) return null
    return data
  } catch {
    return null
  }
}

export function clearNavSession(): void {
  sessionStorage.removeItem(KEY)
}
