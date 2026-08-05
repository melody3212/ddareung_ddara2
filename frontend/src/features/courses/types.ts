export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced' | string

/**
 * 코스 출처
 * - official: 서버 mock/공식 추천
 * - local: 내 코스 탭에 저장된 항목 (주행 저장·추천 북마크)
 * - community: 나중에 타인 공유 코스
 */
export type CourseSource = 'official' | 'local' | 'community'

/**
 * 공개 범위 (확장용)
 */
export type CourseVisibility = 'private' | 'shared' | 'public'

/**
 * 내 코스 분류 (여가 / 출퇴근 / 기타)
 */
export type CourseCategory = 'leisure' | 'commute' | 'other'

export type CourseSavedFrom = 'ride' | 'official' | 'custom'

export type Course = {
  course_id: number
  title: string
  distance_km: number
  duration_min: number
  difficulty: CourseDifficulty
  tags: string[]
  rating: number | null
  description: string | null
  /** [lng, lat][] */
  path: number[][] | null
  source?: CourseSource
  visibility?: CourseVisibility
  createdAt?: number
  updatedAt?: number
  fromRideId?: string | null
  serverId?: string | null
  authorLabel?: string | null
  /** 내 코스 폴더 분류 */
  category?: CourseCategory
  /** 어떻게 저장됐는지 */
  savedFrom?: CourseSavedFrom
  /** 추천코스에서 담은 경우 원본 course_id */
  originCourseId?: number | null
}

export type CourseFilter = {
  difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced'
  tag: string | null
  category?: 'all' | CourseCategory
}

/** 로컬(내 코스) 저장 레코드 */
export type LocalCourseRecord = Course & {
  source: 'local'
  visibility: CourseVisibility
  createdAt: number
  updatedAt: number
  path: number[][]
  category: CourseCategory
  savedFrom: CourseSavedFrom
}

export const COURSE_CATEGORIES: Array<{
  key: CourseCategory
  label: string
}> = [
  { key: 'leisure', label: '여가' },
  { key: 'commute', label: '출퇴근' },
  { key: 'other', label: '기타' },
]

export function categoryLabel(c?: CourseCategory | null): string {
  switch (c) {
    case 'leisure':
      return '여가'
    case 'commute':
      return '출퇴근'
    case 'other':
      return '기타'
    default:
      return '기타'
  }
}
