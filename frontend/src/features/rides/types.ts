/**
 * 주행 기록 — 비회원 로컬 저장용 스키마
 * 나중에 회원 동기화 시 user_id / server_id 확장
 */

export type RidePoint = {
  lat: number
  lng: number
  /** Unix ms */
  t: number
  /** 정확도(m), 있으면 */
  accuracy?: number | null
}

export type RideStatus = 'idle' | 'recording' | 'paused' | 'finished'

/** 주행 중/완료 기록에 붙는 추억 사진 (압축 data URL) */
export type RidePhoto = {
  id: string
  /** image/jpeg data URL */
  dataUrl: string
  /** 촬영·추가 시각 Unix ms */
  takenAt: number
  lat?: number | null
  lng?: number | null
}

/** 완료된 주행 한 건 (목록·상세) */
export type RideRecord = {
  id: string
  /** 시작 시각 Unix ms */
  startedAt: number
  /** 종료 시각 Unix ms */
  endedAt: number
  /** 일시정지 제외 실제 이동 시간(ms) */
  movingMs: number
  /** 누적 거리(m) */
  distanceM: number
  /** 평균 속도 km/h (moving 기준) */
  avgSpeedKmh: number
  /** 최고 순간 속도 km/h */
  maxSpeedKmh: number
  /** 추정 칼로리 kcal */
  caloriesKcal: number
  /** 경로 점 [[lng, lat], ...] 지도용 — 저장 시 샘플링 가능 */
  path: number[][]
  /** 원본 포인트 (상세·재계산용, 길면 샘플링) */
  points: RidePoint[]
  /** 추억 사진 1~5장 */
  photos?: RidePhoto[]
  /** 시작 시점 날씨 스냅샷 (선택) */
  weatherSnapshot?: {
    temp_c?: number
    condition?: string
    score?: number
  } | null
  note?: string | null
  /** 회원 연동 시 사용 (현재 비회원 null) */
  userId?: string | null
}

/** 진행 중 세션 (새로고침 복구용) */
export type ActiveRideSession = {
  id: string
  status: 'recording' | 'paused'
  startedAt: number
  /** 현재 구간 시작(재개) 시각 — movingMs 계산용 */
  segmentStartedAt: number | null
  /** 지금까지 확정된 이동 시간(ms), 일시정지 시 합산 */
  accumulatedMovingMs: number
  distanceM: number
  maxSpeedKmh: number
  points: RidePoint[]
  /** 마지막 유효 점 (거리 누적용) */
  lastPoint: RidePoint | null
  weightKg: number
  /** 주행 중 찍은 사진 */
  photos: RidePhoto[]
}

export const DEFAULT_RIDER_WEIGHT_KG = 70
export { MAX_RIDE_PHOTOS } from './lib/photoCompress'
