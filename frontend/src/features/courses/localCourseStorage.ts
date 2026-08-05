/**
 * 내 코스 — 기기 로컬 저장
 * 키: ddareung_my_courses_v1
 *
 * - 주행 기록에서 저장 (savedFrom=ride)
 * - 추천코스 담기 (savedFrom=official, originCourseId)
 * - category: leisure | commute | other
 */
import type {
  Course,
  CourseCategory,
  LocalCourseRecord,
} from './types'

const KEY = 'ddareung_my_courses_v1'
const MAX_COURSES = 50
const LOCAL_ID_BASE = 100_000

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizeCategory(raw: unknown): CourseCategory {
  if (raw === 'leisure' || raw === 'commute' || raw === 'other') return raw
  return 'other'
}

function normalizeRecord(raw: unknown): LocalCourseRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<LocalCourseRecord>
  if (typeof o.course_id !== 'number' || typeof o.title !== 'string') return null
  if (!Array.isArray(o.path) || o.path.length < 2) return null

  const now = Date.now()
  return {
    course_id: o.course_id,
    title: o.title,
    distance_km: Number(o.distance_km) || 0,
    duration_min: Number(o.duration_min) || 0,
    difficulty: o.difficulty || 'beginner',
    tags: Array.isArray(o.tags) ? o.tags : [],
    rating: o.rating ?? null,
    description: o.description ?? null,
    path: o.path as number[][],
    source: 'local',
    visibility: o.visibility ?? 'private',
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : now,
    fromRideId: o.fromRideId ?? null,
    serverId: o.serverId ?? null,
    authorLabel: o.authorLabel ?? '나',
    category: normalizeCategory(o.category),
    savedFrom:
      o.savedFrom === 'ride' ||
      o.savedFrom === 'official' ||
      o.savedFrom === 'custom'
        ? o.savedFrom
        : o.fromRideId
          ? 'ride'
          : o.originCourseId != null
            ? 'official'
            : 'custom',
    originCourseId:
      typeof o.originCourseId === 'number' ? o.originCourseId : null,
  }
}

export function listLocalCourses(): LocalCourseRecord[] {
  const data = safeParse<unknown[]>(localStorage.getItem(KEY))
  if (!Array.isArray(data)) return []
  return data
    .map(normalizeRecord)
    .filter((c): c is LocalCourseRecord => c != null)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getLocalCourse(id: number): LocalCourseRecord | null {
  return listLocalCourses().find((c) => c.course_id === id) ?? null
}

function persistAll(list: LocalCourseRecord[]): void {
  const trimmed = list.slice(0, MAX_COURSES)
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    const slim = trimmed.slice(0, Math.max(5, Math.floor(trimmed.length / 2)))
    try {
      localStorage.setItem(KEY, JSON.stringify(slim))
    } catch {
      /* give up */
    }
  }
}

export function saveLocalCourse(course: LocalCourseRecord): LocalCourseRecord {
  const normalized: LocalCourseRecord = {
    ...course,
    source: 'local',
    category: normalizeCategory(course.category),
    savedFrom: course.savedFrom ?? 'custom',
    updatedAt: course.updatedAt || Date.now(),
    createdAt: course.createdAt || Date.now(),
  }
  const list = listLocalCourses().filter(
    (c) => c.course_id !== normalized.course_id,
  )
  list.unshift(normalized)
  persistAll(list)
  return normalized
}

export function deleteLocalCourse(id: number): boolean {
  const list = listLocalCourses()
  const next = list.filter((c) => c.course_id !== id)
  if (next.length === list.length) return false
  persistAll(next)
  return true
}

export function updateLocalCourseCategory(
  id: number,
  category: CourseCategory,
): LocalCourseRecord | null {
  const cur = getLocalCourse(id)
  if (!cur) return null
  return saveLocalCourse({
    ...cur,
    category,
    updatedAt: Date.now(),
  })
}

export function countLocalCourses(): number {
  return listLocalCourses().length
}

export function newLocalCourseId(): number {
  const existing = new Set(listLocalCourses().map((c) => c.course_id))
  let id = LOCAL_ID_BASE + (Date.now() % 1_000_000_000)
  while (existing.has(id)) id += 1
  return id
}

/** 이미 내 코스에 담은 추천(원본 id)인지 */
export function findSavedOfficial(originCourseId: number): LocalCourseRecord | null {
  return (
    listLocalCourses().find((c) => c.originCourseId === originCourseId) ?? null
  )
}

/**
 * 추천코스 → 내 코스에 담기
 * 동일 origin 이 있으면 카테고리만 갱신
 */
export function saveOfficialToMyCourses(
  course: Course,
  category: CourseCategory = 'leisure',
): LocalCourseRecord {
  const existing = findSavedOfficial(course.course_id)
  if (existing) {
    return saveLocalCourse({
      ...existing,
      category,
      title: course.title,
      description: course.description,
      distance_km: course.distance_km,
      duration_min: course.duration_min,
      difficulty: course.difficulty,
      tags: course.tags,
      path: (course.path ?? existing.path) as number[][],
      updatedAt: Date.now(),
    })
  }

  if (!course.path || course.path.length < 2) {
    throw new Error('경로가 없어 저장할 수 없습니다.')
  }

  const now = Date.now()
  const tags = [...(course.tags ?? [])]
  if (!tags.some((t) => t.includes('내코스'))) tags.push('#내코스')
  if (!tags.some((t) => t.includes('추천'))) tags.push('#추천저장')

  return saveLocalCourse({
    course_id: newLocalCourseId(),
    title: course.title,
    distance_km: course.distance_km,
    duration_min: course.duration_min,
    difficulty: course.difficulty,
    tags,
    rating: course.rating,
    description: course.description ?? `추천코스에서 저장 · ${course.title}`,
    path: course.path.map((p) => [Number(p[0]), Number(p[1])]),
    source: 'local',
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
    fromRideId: null,
    serverId: null,
    authorLabel: '나',
    category,
    savedFrom: 'official',
    originCourseId: course.course_id,
  })
}

/** 홈 추천 목록: 공식만 (내 코스는 /my-courses) */
export function withOfficialSource(official: Course[]): Course[] {
  return official.map((c) => ({
    ...c,
    source: (c.source ?? 'official') as Course['source'],
  }))
}

/** @deprecated 홈 병합 대신 내 코스 탭 사용. 호환용 */
export function mergeCoursesWithLocal(official: Course[]): Course[] {
  const local = listLocalCourses() as Course[]
  const localIds = new Set(local.map((c) => c.course_id))
  const rest = withOfficialSource(official).filter(
    (c) => !localIds.has(c.course_id),
  )
  return [...local, ...rest]
}

export function isLocalCourse(course: Course): boolean {
  return course.source === 'local' || course.course_id >= LOCAL_ID_BASE
}

export function isSavedInMyCourses(course: Course): boolean {
  if (isLocalCourse(course)) return true
  return findSavedOfficial(course.course_id) != null
}
