import type { RouteMode } from '../routes/types'

export type UserPreferences = {
  nickname: string
  weightKg: number
  /** 알림 — UI 자리 (푸시 미연동) */
  notifyWeather: boolean
  notifyGoals: boolean
  /** 홈 지도 기본 레이어 */
  defaultShowStations: boolean
  defaultShowBikePaths: boolean
  defaultShowSlope: boolean
  /** 길찾기 기본 모드 */
  defaultRouteMode: RouteMode
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  nickname: '게스트',
  weightKg: 70,
  notifyWeather: false,
  notifyGoals: false,
  defaultShowStations: true,
  defaultShowBikePaths: true,
  defaultShowSlope: false,
  defaultRouteMode: 'personal',
}
