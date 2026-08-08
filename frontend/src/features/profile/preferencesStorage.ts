/**
 * 마이페이지 · 앱 설정 — 로컬 선호
 * 키: ddareung_user_prefs_v1
 */
import { DEFAULT_PREFERENCES, type UserPreferences } from './types'

const KEY = 'ddareung_user_prefs_v1'

function safeParse(raw: string | null): Partial<UserPreferences> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Partial<UserPreferences>
  } catch {
    return null
  }
}

function clampWeight(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.weightKg
  return Math.min(200, Math.max(30, Math.round(n * 10) / 10))
}

export function loadPreferences(): UserPreferences {
  const raw = safeParse(localStorage.getItem(KEY))
  if (!raw) return { ...DEFAULT_PREFERENCES }
  return {
    nickname:
      typeof raw.nickname === 'string' && raw.nickname.trim()
        ? raw.nickname.trim().slice(0, 20)
        : DEFAULT_PREFERENCES.nickname,
    weightKg: clampWeight(Number(raw.weightKg)),
    notifyWeather: Boolean(raw.notifyWeather),
    notifyGoals: Boolean(raw.notifyGoals),
    defaultShowStations:
      raw.defaultShowStations ?? DEFAULT_PREFERENCES.defaultShowStations,
    defaultShowBikePaths:
      raw.defaultShowBikePaths ?? DEFAULT_PREFERENCES.defaultShowBikePaths,
    defaultShowSlope:
      raw.defaultShowSlope ?? DEFAULT_PREFERENCES.defaultShowSlope,
    defaultRouteMode:
      raw.defaultRouteMode === 'ddareung' ? 'ddareung' : 'personal',
  }
}

export function savePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const next = { ...loadPreferences(), ...partial }
  if (partial.nickname != null) {
    next.nickname = partial.nickname.trim().slice(0, 20) || '게스트'
  }
  if (partial.weightKg != null) {
    next.weightKg = clampWeight(partial.weightKg)
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  return next
}

export function getRiderWeightKg(): number {
  return loadPreferences().weightKg
}

export function getNickname(): string {
  return loadPreferences().nickname
}
