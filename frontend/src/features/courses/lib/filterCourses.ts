/**
 * 코스 목록 필터 (순수)
 */
import type { Course, CourseCategory, CourseFilter } from '../types'

export type CourseListMode = 'recommend' | 'library'

export type CourseListFilterState = {
  difficulty: CourseFilter['difficulty']
  tag: string | null
  category: 'all' | CourseCategory
}

export const DEFAULT_COURSE_FILTER: CourseListFilterState = {
  difficulty: 'all',
  tag: null,
  category: 'all',
}

export function filterCourses(
  courses: Course[],
  mode: CourseListMode,
  f: CourseListFilterState,
): Course[] {
  return courses.filter((c) => {
    if (f.difficulty !== 'all' && c.difficulty !== f.difficulty) return false
    if (mode === 'library' && f.category !== 'all') {
      if ((c.category ?? 'other') !== f.category) return false
    }
    if (mode === 'recommend' && f.tag) {
      const needle = f.tag.toLowerCase()
      if (!c.tags.some((t) => t.toLowerCase().includes(needle))) return false
    }
    return true
  })
}

export const DIFFICULTY_FILTERS: Array<{
  key: CourseFilter['difficulty']
  label: string
}> = [
  { key: 'all', label: '전체' },
  { key: 'beginner', label: '초급' },
  { key: 'intermediate', label: '중급' },
  { key: 'advanced', label: '고급' },
]

export const RECOMMEND_TAG_CHIPS: Array<{
  key: string | null
  label: string
}> = [
  { key: null, label: '전체' },
  { key: '한강', label: '한강' },
  { key: '평지', label: '평지' },
  { key: '언덕', label: '언덕' },
  { key: '장거리', label: '장거리' },
  { key: '야경', label: '야경' },
]
