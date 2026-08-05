import type { Course, CourseDifficulty } from './types'

export function difficultyLabel(d: CourseDifficulty): string {
  switch (d) {
    case 'beginner':
      return '초급'
    case 'intermediate':
      return '중급'
    case 'advanced':
      return '고급'
    default:
      return String(d)
  }
}

export function difficultyBadgeClass(d: CourseDifficulty): string {
  switch (d) {
    case 'beginner':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'intermediate':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'advanced':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function almostSamePoint(
  a: number[],
  b: number[],
  eps = 1e-5,
): boolean {
  return (
    Math.abs(Number(a[0]) - Number(b[0])) < eps &&
    Math.abs(Number(a[1]) - Number(b[1])) < eps
  )
}

/** 출발점에서 가장 먼 path 점 (루프 코스 길찾기용 도착점) */
function farthestPointFromStart(path: number[][]): number[] {
  const start = path[0]
  let best = path[Math.floor(path.length / 2)] ?? path[path.length - 1]
  let bestD = -1
  for (let i = 1; i < path.length; i++) {
    const p = path[i]
    const dLng = Number(p[0]) - Number(start[0])
    const dLat = Number(p[1]) - Number(start[1])
    const d = dLng * dLng + dLat * dLat
    if (d > bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

/** path 첫·끝점으로 출발/도착 라벨 (루프면 먼 점을 도착으로) */
export function courseEndpoints(course: Course): {
  origin: { name: string; lat: number; lng: number }
  destination: { name: string; lat: number; lng: number }
  isLoop: boolean
} | null {
  const path = course.path
  if (!path || path.length < 2) return null
  const start = path[0]
  let end = path[path.length - 1]
  if (!start || !end || start.length < 2 || end.length < 2) return null

  let isLoop = almostSamePoint(start, end)
  if (isLoop && path.length >= 3) {
    end = farthestPointFromStart(path)
    // 여전히 같으면 중간점
    if (almostSamePoint(start, end)) {
      end = path[Math.floor(path.length / 2)]
      isLoop = true
    }
  }

  return {
    origin: {
      name: `${course.title} 출발`,
      lng: Number(start[0]),
      lat: Number(start[1]),
    },
    destination: {
      name: isLoop ? `${course.title} 반환점` : `${course.title} 도착`,
      lng: Number(end[0]),
      lat: Number(end[1]),
    },
    isLoop,
  }
}

/** 길찾기 쿼리 문자열 */
export function courseToRouteSearchQuery(course: Course): string | null {
  const ep = courseEndpoints(course)
  if (!ep) return null
  const q = new URLSearchParams({
    olat: String(ep.origin.lat),
    olng: String(ep.origin.lng),
    oname: ep.origin.name,
    dlat: String(ep.destination.lat),
    dlng: String(ep.destination.lng),
    dname: ep.destination.name,
    courseId: String(course.course_id),
    autosearch: '1',
  })
  if (ep.isLoop) q.set('loop', '1')
  return q.toString()
}
