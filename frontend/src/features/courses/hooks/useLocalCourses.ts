import { useCallback, useEffect, useState } from 'react'
import { listLocalCourses } from '../localCourseStorage'
import type { Course, LocalCourseRecord } from '../types'

/** 내 코스 localStorage 목록 + 포커스/스토리지 변경 시 갱신 */
export function useLocalCourses() {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener('focus', bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener('focus', bump)
      window.removeEventListener('storage', bump)
    }
  }, [])

  const courses: LocalCourseRecord[] = (() => {
    void tick
    return listLocalCourses()
  })()

  return {
    courses: courses as Course[],
    records: courses,
    refresh,
    count: courses.length,
  }
}
