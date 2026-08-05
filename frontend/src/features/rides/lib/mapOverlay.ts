/**
 * 주행 지도 오버레이 조합
 */
import type { Course } from '../../courses'
import type { RouteOverlay } from '../../map'

export function buildLiveRouteOverlay(
  isActive: boolean,
  path: number[][],
  position: { lat: number; lng: number } | null,
): RouteOverlay | null {
  if (!isActive) return null
  if (path.length >= 2) {
    return { path, fitBounds: path.length < 4 }
  }
  if (position) {
    return {
      path: [[position.lng, position.lat]],
      fitBounds: false,
    }
  }
  return null
}

export function buildGuideRouteOverlay(
  guide: Course | null,
  isActive: boolean,
  livePathLen: number,
): RouteOverlay | null {
  const path = guide?.path
  if (!path || path.length < 2) return null
  if (isActive && livePathLen >= 2) return null
  return { path, fitBounds: !isActive, variant: 'course' }
}

export function pickRideMapOverlay(
  live: RouteOverlay | null,
  guide: RouteOverlay | null,
): RouteOverlay | null {
  return live ?? guide
}
