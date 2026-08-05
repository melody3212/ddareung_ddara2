import type { Course } from './types'

const KEY = 'ddareung_selected_course_v1'

/** 추천코스 → 주행 탭 연동용 (세션, 기기 로컬) */
export function saveCourseForRide(course: Course): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(course))
  } catch {
    /* quota / private mode */
  }
}

export function loadCourseForRide(): Course | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Course
    if (!c || typeof c.course_id !== 'number' || !c.title) return null
    return c
  } catch {
    return null
  }
}

export function clearCourseForRide(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
