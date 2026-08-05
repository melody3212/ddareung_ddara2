import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveCourseForRide } from '../courseSession'
import { courseToRouteSearchQuery } from '../labels'
import type { Course } from '../types'

/** 코스 → 길찾기 / 주행 시작 */
export function useCourseActions() {
  const navigate = useNavigate()

  const startRoute = useCallback(
    (course: Course) => {
      const qs = courseToRouteSearchQuery(course)
      if (!qs) {
        alert('이 코스에는 경로 좌표가 없습니다.')
        return
      }
      navigate(`/search-route?${qs}`)
    },
    [navigate],
  )

  const startRide = useCallback(
    (course: Course) => {
      if (!course.path || course.path.length < 2) {
        alert('이 코스에는 경로 좌표가 없습니다.')
        return
      }
      saveCourseForRide(course)
      navigate('/riding')
    },
    [navigate],
  )

  return { startRoute, startRide }
}
