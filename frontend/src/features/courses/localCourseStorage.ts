/**
 * 내 코스 — 기기 로컬 저장
 * 키: ddareung_my_courses_v1
 *
 * 나중 확장:
 * - 로그인 시 serverId 부여 후 POST /api/courses
 * - visibility: private → shared/public
 * - 커뮤니티 탭에서 source=community 목록
 */
import type { Course, LocalCourseRecord } from './types'

const KEY = 'ddareung_my_courses_v1'
const MAX_COURSES = 50
/** 서버 mock(1~99)과 안 겹치게 */
const LOCAL_ID_BASE = 100_000

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isValidLocal(c: unknown): c is LocalCourseRecord {
  if (!c || typeof c !== 'object') return false
  const o = c as LocalCourseRecord
  return (
    typeof o.course_id === 'number' &&
    typeof o.title === 'string' &&
    Array.isArray(o.path) &&
    o.path.length >= 2 &&
    o.source === 'local'
  )
}

export function listLocalCourses(): LocalCourseRecord[] {
  const data = safeParse<unknown[]>(localStorage.getItem(KEY))
  if (!Array.isArray(data)) return []
  return data
    .filter(isValidLocal)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getLocalCourse(id: number): LocalCourseRecord | null {
  return listLocalCourses().find((c) => c.course_id === id) ?? null
}

export function saveLocalCourse(course: LocalCourseRecord): LocalCourseRecord {
  const list = listLocalCourses().filter((c) => c.course_id !== course.course_id)
  list.unshift(course)
  const trimmed = list.slice(0, MAX_COURSES)
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    // quota: 오래된 것부터 제거 후 재시도
    const slim = trimmed.slice(0, Math.max(5, Math.floor(trimmed.length / 2)))
    try {
      localStorage.setItem(KEY, JSON.stringify([course, ...slim.filter((c) => c.course_id !== course.course_id)]))
    } catch {
      /* give up */
    }
  }
  return course
}

export function deleteLocalCourse(id: number): boolean {
  const list = listLocalCourses()
  const next = list.filter((c) => c.course_id !== id)
  if (next.length === list.length) return false
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    return false
  }
  return true
}

export function countLocalCourses(): number {
  return listLocalCourses().length
}

/** 새 로컬 course_id */
export function newLocalCourseId(): number {
  const existing = new Set(listLocalCourses().map((c) => c.course_id))
  let id = LOCAL_ID_BASE + (Date.now() % 1_000_000_000)
  while (existing.has(id)) id += 1
  return id
}

/** 공식 + 내 코스 병합 (내 코스 먼저) */
export function mergeCoursesWithLocal(official: Course[]): Course[] {
  const local = listLocalCourses() as Course[]
  const localIds = new Set(local.map((c) => c.course_id))
  const rest = official
    .filter((c) => !localIds.has(c.course_id))
    .map((c) => ({
      ...c,
      source: (c.source ?? 'official') as Course['source'],
    }))
  return [...local, ...rest]
}

export function isLocalCourse(course: Course): boolean {
  return course.source === 'local' || course.course_id >= LOCAL_ID_BASE
}
