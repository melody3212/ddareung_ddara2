/**
 * 코스 선택 시 지도 오버레이 옵션
 */
import type { RouteOverlay } from '../../map'
import type { Course } from '../types'

const DEFAULT_PAD: [number, number, number, number] = [72, 40, 160, 40]

export function buildCourseMapOverlay(
  course: Course | null,
  focusKey: number,
  boundsPadding: [number, number, number, number] = DEFAULT_PAD,
): RouteOverlay | null {
  const path = course?.path
  if (!path || path.length < 2) return null
  return {
    path,
    fitBounds: true,
    variant: 'course',
    focusKey,
    boundsPadding,
  }
}
