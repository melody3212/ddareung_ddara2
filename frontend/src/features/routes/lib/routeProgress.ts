import { getDistanceMeters } from '../../../shared/geo'
import type { NavStep } from '../types'

export type LatLng = { lat: number; lng: number }

/** 경로 [[lng,lat]] 누적 거리 테이블 */
export function buildCumulative(path: number[][]): number[] {
  const cum = [0]
  for (let i = 1; i < path.length; i++) {
    const a = { lng: path[i - 1][0], lat: path[i - 1][1] }
    const b = { lng: path[i][0], lat: path[i][1] }
    cum.push(cum[i - 1] + getDistanceMeters(a, b))
  }
  return cum
}

/** 현재 위치가 경로 상 어디에 가까운지 → 진행 거리(m) */
export function projectOnRoute(
  pos: LatLng,
  path: number[][],
  cum: number[],
): { along_m: number; dist_to_route_m: number; nearest: LatLng } {
  let bestDist = Infinity
  let bestAlong = 0
  let bestPt = { lat: path[0]?.[1] ?? pos.lat, lng: path[0]?.[0] ?? pos.lng }

  for (let i = 1; i < path.length; i++) {
    const a = { lng: path[i - 1][0], lat: path[i - 1][1] }
    const b = { lng: path[i][0], lat: path[i][1] }
    const abx = b.lng - a.lng
    const aby = b.lat - a.lat
    const apx = pos.lng - a.lng
    const apy = pos.lat - a.lat
    const ab2 = abx * abx + aby * aby
    let t = ab2 <= 0 ? 0 : (apx * abx + apy * aby) / ab2
    t = Math.max(0, Math.min(1, t))
    const cx = a.lng + abx * t
    const cy = a.lat + aby * t
    const d = getDistanceMeters(pos, { lat: cy, lng: cx })
    if (d < bestDist) {
      bestDist = d
      const segLen = cum[i] - cum[i - 1]
      bestAlong = cum[i - 1] + segLen * t
      bestPt = { lat: cy, lng: cx }
    }
  }

  return { along_m: bestAlong, dist_to_route_m: bestDist, nearest: bestPt }
}

/** 현재 진행 거리 기준 다음 안내 스텝 */
export function findNextStep(
  steps: NavStep[],
  along_m: number,
  lookahead_m = 15,
): { current: NavStep | null; next: NavStep | null; index: number } {
  if (!steps.length) return { current: null, next: null, index: -1 }

  // along 이 지나간 마지막 스텝 + 다음 스텝
  let idx = 0
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].distance_along_m <= along_m + lookahead_m) {
      idx = i
    } else {
      break
    }
  }

  const current = steps[idx] ?? null
  const next = steps[idx + 1] ?? null
  return { current, next, index: idx }
}

export function remainingDistance(total_m: number, along_m: number): number {
  return Math.max(0, total_m - along_m)
}

export function iconEmoji(icon: string): string {
  switch (icon) {
    case 'left':
      return '↰'
    case 'right':
      return '↱'
    case 'uturn':
      return '↩'
    case 'finish':
      return '🏁'
    case 'start':
      return '▶'
    case 'roundabout':
      return '⟳'
    default:
      return '↑'
  }
}
