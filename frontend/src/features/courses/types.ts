export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced' | string

/**
 * 코스 출처
 * - official: 서버 mock/공식 추천
 * - local: 이 기기에서 주행 기록으로 저장 (현재)
 * - community: 나중에 타인 공유 코스
 */
export type CourseSource = 'official' | 'local' | 'community'

/**
 * 공개 범위 (확장용)
 * - private: 나만 (로컬 기본)
 * - shared: 링크/친구 공유 (미구현)
 * - public: 커뮤니티 공개 (미구현)
 */
export type CourseVisibility = 'private' | 'shared' | 'public'

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
  /** 없으면 official 로 취급 */
  source?: CourseSource
  visibility?: CourseVisibility
  createdAt?: number
  updatedAt?: number
  /** 원본 주행 기록 id (로컬 저장 시) */
  fromRideId?: string | null
  /** 서버 동기화 후 id (나중 공유 API) */
  serverId?: string | null
  /** 작성자 표시명 (공유 시) */
  authorLabel?: string | null
}

export type CourseFilter = {
  difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced'
  tag: string | null
}

/** 로컬 코스 전용 저장 레코드 (Course 와 동일 + 필수 메타) */
export type LocalCourseRecord = Course & {
  source: 'local'
  visibility: CourseVisibility
  createdAt: number
  updatedAt: number
  path: number[][]
}
