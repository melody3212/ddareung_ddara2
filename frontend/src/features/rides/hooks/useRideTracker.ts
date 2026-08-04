/**
 * 주행 GPS 추적 — 시작 / 일시정지 / 재개 / 종료
 * 진행 중 세션은 localStorage 에 주기적으로 저장
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  avgSpeedKmh,
  deltaDistanceM,
  estimateCaloriesKcal,
  newRideId,
  pointsToPath,
  samplePoints,
  segmentSpeedKmh,
} from '../lib/rideMetrics'
import { compressImageFile, MAX_RIDE_PHOTOS, newPhotoId } from '../lib/photoCompress'
import {
  clearActiveRideSession,
  loadActiveRideSession,
  saveActiveRideSession,
  saveRideRecord,
} from '../storage'
import {
  DEFAULT_RIDER_WEIGHT_KG,
  type ActiveRideSession,
  type RidePhoto,
  type RidePoint,
  type RideRecord,
  type RideStatus,
} from '../types'

export type RideTrackerState = {
  status: RideStatus
  distanceM: number
  /** 일시정지 제외 이동 시간(ms) — 매 tick 갱신 */
  movingMs: number
  maxSpeedKmh: number
  currentSpeedKmh: number
  points: RidePoint[]
  path: number[][]
  position: { lat: number; lng: number } | null
  accuracy: number | null
  errorMsg: string | null
  startedAt: number | null
  /** GPS watch 수신 중 */
  locating: boolean
}

type FinishResult = RideRecord | null

function sessionToState(s: ActiveRideSession, now: number): Pick<
  RideTrackerState,
  'status' | 'distanceM' | 'movingMs' | 'maxSpeedKmh' | 'points' | 'path' | 'startedAt'
> {
  let movingMs = s.accumulatedMovingMs
  if (s.status === 'recording' && s.segmentStartedAt != null) {
    movingMs += Math.max(0, now - s.segmentStartedAt)
  }
  return {
    status: s.status,
    distanceM: s.distanceM,
    movingMs,
    maxSpeedKmh: s.maxSpeedKmh,
    points: s.points,
    path: pointsToPath(s.points),
    startedAt: s.startedAt,
  }
}

export function useRideTracker() {
  const [status, setStatus] = useState<RideStatus>('idle')
  const [distanceM, setDistanceM] = useState(0)
  const [movingMs, setMovingMs] = useState(0)
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0)
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0)
  const [points, setPoints] = useState<RidePoint[]>([])
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [tick, setTick] = useState(0)
  const [photos, setPhotos] = useState<RidePhoto[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const sessionRef = useRef<ActiveRideSession | null>(null)
  const watchId = useRef<number | null>(null)
  const restoredRef = useRef(false)

  const stopWatch = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setLocating(false)
  }, [])

  const persistSession = useCallback((s: ActiveRideSession) => {
    sessionRef.current = s
    saveActiveRideSession(s)
  }, [])

  const applyLiveFromSession = useCallback((s: ActiveRideSession) => {
    const now = Date.now()
    const live = sessionToState(s, now)
    setStatus(live.status)
    setDistanceM(live.distanceM)
    setMovingMs(live.movingMs)
    setMaxSpeedKmh(live.maxSpeedKmh)
    setPoints(live.points)
    setStartedAt(live.startedAt)
    setPhotos(s.photos ?? [])
    if (s.lastPoint) {
      setPosition({ lat: s.lastPoint.lat, lng: s.lastPoint.lng })
    }
  }, [])

  // 앱 재진입 시 진행 중 세션 복구
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const saved = loadActiveRideSession()
    if (!saved) return
    const normalized: ActiveRideSession = {
      ...saved,
      photos: saved.photos ?? [],
    }
    sessionRef.current = normalized
    applyLiveFromSession(normalized)
  }, [applyLiveFromSession])

  const onGps = useCallback(
    (coords: GeolocationCoordinates, timestamp: number) => {
      const s = sessionRef.current
      if (!s || s.status !== 'recording') return

      const pt: RidePoint = {
        lat: coords.latitude,
        lng: coords.longitude,
        t: timestamp || Date.now(),
        accuracy: coords.accuracy ?? null,
      }

      setPosition({ lat: pt.lat, lng: pt.lng })
      setAccuracy(pt.accuracy ?? null)
      setLocating(false)
      setErrorMsg(null)

      const delta = deltaDistanceM(s.lastPoint, pt)
      let speed = 0
      if (s.lastPoint && delta > 0) {
        speed = segmentSpeedKmh(s.lastPoint, pt, delta)
        // 비정상 속도 무시 (시속 60 초과 순간값)
        if (speed > 55) speed = 0
      }

      const next: ActiveRideSession = {
        ...s,
        distanceM: s.distanceM + delta,
        maxSpeedKmh: speed > 0 ? Math.max(s.maxSpeedKmh, speed) : s.maxSpeedKmh,
        points: [...s.points, pt],
        lastPoint: delta > 0 || !s.lastPoint ? pt : s.lastPoint,
      }
      // 첫 점이거나 유효 이동이면 lastPoint 갱신; 노이즈만이면 점만 스킵 가능
      if (delta > 0 || !s.lastPoint) {
        // keep
      } else if (s.lastPoint && delta === 0) {
        // accuracy 불량 시 포인트 자체를 안 넣을 수도 있음 — 가끔 위치 표시용으로만 갱신
        if (pt.accuracy != null && pt.accuracy > 55) {
          setCurrentSpeedKmh(0)
          return
        }
        // 정지 상태: 속도 0, 점은 가끔만
        if (s.points.length > 0 && pt.t - s.points[s.points.length - 1].t < 4000) {
          setCurrentSpeedKmh(0)
          return
        }
        next.points = [...s.points, pt]
        next.lastPoint = pt
      }

      persistSession(next)
      setDistanceM(next.distanceM)
      setMaxSpeedKmh(next.maxSpeedKmh)
      setPoints(next.points)
      setCurrentSpeedKmh(speed)
    },
    [persistSession],
  )

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }
    stopWatch()
    setLocating(true)
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => onGps(pos.coords, pos.timestamp),
      (err) => {
        setLocating(false)
        setErrorMsg(err.message || '위치 수신 실패 — 권한을 확인해 주세요.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1500,
        timeout: 20000,
      },
    )
  }, [onGps, stopWatch])

  // recording 중이면 watch 유지
  useEffect(() => {
    if (status === 'recording') {
      startWatch()
      return () => stopWatch()
    }
    stopWatch()
  }, [status, startWatch, stopWatch])

  // 이동 시간 표시 tick
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return
    const id = window.setInterval(() => setTick((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    const s = sessionRef.current
    if (!s) return
    if (status !== 'recording' && status !== 'paused') return
    let ms = s.accumulatedMovingMs
    if (s.status === 'recording' && s.segmentStartedAt != null) {
      ms += Math.max(0, Date.now() - s.segmentStartedAt)
    }
    setMovingMs(ms)
  }, [tick, status, distanceM, points.length])

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }
    const now = Date.now()
    const session: ActiveRideSession = {
      id: newRideId(),
      status: 'recording',
      startedAt: now,
      segmentStartedAt: now,
      accumulatedMovingMs: 0,
      distanceM: 0,
      maxSpeedKmh: 0,
      points: [],
      lastPoint: null,
      weightKg: DEFAULT_RIDER_WEIGHT_KG,
      photos: [],
    }
    persistSession(session)
    setStatus('recording')
    setDistanceM(0)
    setMovingMs(0)
    setMaxSpeedKmh(0)
    setCurrentSpeedKmh(0)
    setPoints([])
    setPhotos([])
    setPhotoError(null)
    setStartedAt(now)
    setErrorMsg(null)
    setAccuracy(null)
  }, [persistSession])

  const pause = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.status !== 'recording') return
    const now = Date.now()
    let acc = s.accumulatedMovingMs
    if (s.segmentStartedAt != null) {
      acc += Math.max(0, now - s.segmentStartedAt)
    }
    const next: ActiveRideSession = {
      ...s,
      status: 'paused',
      accumulatedMovingMs: acc,
      segmentStartedAt: null,
    }
    persistSession(next)
    setStatus('paused')
    setMovingMs(acc)
    setCurrentSpeedKmh(0)
  }, [persistSession])

  const resume = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.status !== 'paused') return
    const now = Date.now()
    const next: ActiveRideSession = {
      ...s,
      status: 'recording',
      segmentStartedAt: now,
    }
    persistSession(next)
    setStatus('recording')
    setErrorMsg(null)
  }, [persistSession])

  const discard = useCallback(() => {
    stopWatch()
    clearActiveRideSession()
    sessionRef.current = null
    setStatus('idle')
    setDistanceM(0)
    setMovingMs(0)
    setMaxSpeedKmh(0)
    setCurrentSpeedKmh(0)
    setPoints([])
    setPhotos([])
    setPhotoError(null)
    setStartedAt(null)
    setPosition(null)
    setAccuracy(null)
    setErrorMsg(null)
  }, [stopWatch])

  const addPhotoFromFile = useCallback(
    async (file: File): Promise<boolean> => {
      const s = sessionRef.current
      if (!s || (s.status !== 'recording' && s.status !== 'paused')) {
        setPhotoError('주행 중에만 사진을 추가할 수 있습니다.')
        return false
      }
      const current = s.photos ?? []
      if (current.length >= MAX_RIDE_PHOTOS) {
        setPhotoError(`사진은 최대 ${MAX_RIDE_PHOTOS}장까지입니다.`)
        return false
      }
      setPhotoBusy(true)
      setPhotoError(null)
      try {
        const dataUrl = await compressImageFile(file)
        const photo: RidePhoto = {
          id: newPhotoId(),
          dataUrl,
          takenAt: Date.now(),
          lat: position?.lat ?? s.lastPoint?.lat ?? null,
          lng: position?.lng ?? s.lastPoint?.lng ?? null,
        }
        const next: ActiveRideSession = {
          ...s,
          photos: [...current, photo],
        }
        try {
          persistSession(next)
        } catch {
          setPhotoError('저장 공간이 부족합니다. 사진을 줄여 주세요.')
          return false
        }
        setPhotos(next.photos)
        return true
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : '사진 추가 실패')
        return false
      } finally {
        setPhotoBusy(false)
      }
    },
    [persistSession, position],
  )

  const removePhoto = useCallback(
    (photoId: string) => {
      const s = sessionRef.current
      if (!s) return
      const next: ActiveRideSession = {
        ...s,
        photos: (s.photos ?? []).filter((p) => p.id !== photoId),
      }
      persistSession(next)
      setPhotos(next.photos)
      setPhotoError(null)
    },
    [persistSession],
  )

  const stop = useCallback((): FinishResult => {
    const s = sessionRef.current
    if (!s) return null

    const now = Date.now()
    let moving = s.accumulatedMovingMs
    if (s.status === 'recording' && s.segmentStartedAt != null) {
      moving += Math.max(0, now - s.segmentStartedAt)
    }

    const ridePhotos = (s.photos ?? []).slice(0, MAX_RIDE_PHOTOS)
    // 거리 짧아도 사진이 있으면 추억 기록으로 저장
    const tooShort = s.distanceM < 20 && moving < 30_000 && ridePhotos.length === 0
    if (tooShort) {
      discard()
      return null
    }

    const sampled = samplePoints(s.points, 800)
    const path = pointsToPath(sampled)
    const avg = avgSpeedKmh(s.distanceM, moving)
    const kcal = estimateCaloriesKcal(s.distanceM, s.weightKg, moving)

    const record: RideRecord = {
      id: s.id,
      startedAt: s.startedAt,
      endedAt: now,
      movingMs: moving,
      distanceM: s.distanceM,
      avgSpeedKmh: Math.round(avg * 10) / 10,
      maxSpeedKmh: Math.round(s.maxSpeedKmh * 10) / 10,
      caloriesKcal: Math.round(kcal),
      path,
      points: sampled,
      photos: ridePhotos,
      weatherSnapshot: null,
      note: null,
      userId: null,
    }

    try {
      saveRideRecord(record)
    } catch {
      // 사진 없이 재시도
      const slim = { ...record, photos: ridePhotos.slice(0, 1) }
      try {
        saveRideRecord(slim)
        Object.assign(record, slim)
      } catch {
        saveRideRecord({ ...record, photos: [] })
        record.photos = []
      }
    }
    stopWatch()
    clearActiveRideSession()
    sessionRef.current = null
    setStatus('idle')
    setDistanceM(0)
    setMovingMs(0)
    setMaxSpeedKmh(0)
    setCurrentSpeedKmh(0)
    setPoints([])
    setPhotos([])
    setPhotoError(null)
    setStartedAt(null)
    setPosition(null)
    setErrorMsg(null)
    return record
  }, [discard, stopWatch])

  const path = pointsToPath(points)
  const isActive = status === 'recording' || status === 'paused'

  return {
    status,
    isActive,
    distanceM,
    movingMs,
    maxSpeedKmh,
    currentSpeedKmh,
    points,
    path,
    position,
    accuracy,
    errorMsg,
    startedAt,
    locating,
    photos,
    photoBusy,
    photoError,
    maxPhotos: MAX_RIDE_PHOTOS,
    start,
    pause,
    resume,
    stop,
    discard,
    addPhotoFromFile,
    removePhoto,
  }
}
