/**
 * 주행 GPS 추적 — 시작 / 일시정지 / 재개 / 종료
 * 순수 로직: lib/sessionMath, lib/gpsUpdate
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyGpsToSession } from '../lib/gpsUpdate'
import { pointsToPath, newRideId } from '../lib/rideMetrics'
import { compressImageFile, MAX_RIDE_PHOTOS, newPhotoId } from '../lib/photoCompress'
import {
  createEmptySession,
  finalizeSessionToRecord,
  isRideTooShort,
  pauseSession,
  resumeSession,
  sessionMovingMs,
} from '../lib/sessionMath'
import { saveRideRecordWithQuota } from '../lib/saveRideWithQuota'
import {
  clearActiveRideSession,
  loadActiveRideSession,
  saveActiveRideSession,
} from '../storage'
import { getRiderWeightKg } from '../../profile/preferencesStorage'
import {
  DEFAULT_RIDER_WEIGHT_KG,
  type ActiveRideSession,
  type RidePhoto,
  type RidePoint,
  type RideRecord,
  type RideStatus,
} from '../types'

export type RideTrackerApi = {
  status: RideStatus
  isActive: boolean
  distanceM: number
  movingMs: number
  maxSpeedKmh: number
  currentSpeedKmh: number
  points: RidePoint[]
  path: number[][]
  position: { lat: number; lng: number } | null
  accuracy: number | null
  errorMsg: string | null
  startedAt: number | null
  locating: boolean
  photos: RidePhoto[]
  photoBusy: boolean
  photoError: string | null
  maxPhotos: number
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => RideRecord | null
  discard: () => void
  addPhotoFromFile: (file: File) => Promise<boolean>
  removePhoto: (photoId: string) => void
}

function resetUiState(setters: {
  setStatus: (s: RideStatus) => void
  setDistanceM: (n: number) => void
  setMovingMs: (n: number) => void
  setMaxSpeedKmh: (n: number) => void
  setCurrentSpeedKmh: (n: number) => void
  setPoints: (p: RidePoint[]) => void
  setPhotos: (p: RidePhoto[]) => void
  setPhotoError: (e: string | null) => void
  setStartedAt: (t: number | null) => void
  setPosition: (p: { lat: number; lng: number } | null) => void
  setAccuracy: (a: number | null) => void
  setErrorMsg: (e: string | null) => void
}) {
  setters.setStatus('idle')
  setters.setDistanceM(0)
  setters.setMovingMs(0)
  setters.setMaxSpeedKmh(0)
  setters.setCurrentSpeedKmh(0)
  setters.setPoints([])
  setters.setPhotos([])
  setters.setPhotoError(null)
  setters.setStartedAt(null)
  setters.setPosition(null)
  setters.setAccuracy(null)
  setters.setErrorMsg(null)
}

export function useRideTracker(): RideTrackerApi {
  const [status, setStatus] = useState<RideStatus>('idle')
  const [distanceM, setDistanceM] = useState(0)
  const [movingMs, setMovingMs] = useState(0)
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0)
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0)
  const [points, setPoints] = useState<RidePoint[]>([])
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  )
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

  const uiReset = useCallback(() => {
    resetUiState({
      setStatus,
      setDistanceM,
      setMovingMs,
      setMaxSpeedKmh,
      setCurrentSpeedKmh,
      setPoints,
      setPhotos,
      setPhotoError,
      setStartedAt,
      setPosition,
      setAccuracy,
      setErrorMsg,
    })
  }, [])

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
    setStatus(s.status)
    setDistanceM(s.distanceM)
    setMovingMs(sessionMovingMs(s, now))
    setMaxSpeedKmh(s.maxSpeedKmh)
    setPoints(s.points)
    setStartedAt(s.startedAt)
    setPhotos(s.photos ?? [])
    if (s.lastPoint) {
      setPosition({ lat: s.lastPoint.lat, lng: s.lastPoint.lng })
    }
  }, [])

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
      const result = applyGpsToSession(
        sessionRef.current,
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        },
        timestamp,
      )

      if (result.kind === 'skip') {
        if (result.reason === 'noise' || result.reason === 'stationary') {
          setCurrentSpeedKmh(0)
        }
        return
      }

      setPosition(result.position)
      setAccuracy(result.accuracy)
      setLocating(false)
      setErrorMsg(null)
      persistSession(result.session)
      setDistanceM(result.session.distanceM)
      setMaxSpeedKmh(result.session.maxSpeedKmh)
      setPoints(result.session.points)
      setCurrentSpeedKmh(result.speedKmh)
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

  useEffect(() => {
    if (status === 'recording') {
      startWatch()
      return () => stopWatch()
    }
    stopWatch()
  }, [status, startWatch, stopWatch])

  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') return
    const id = window.setInterval(() => setTick((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    const s = sessionRef.current
    if (!s) return
    if (status !== 'recording' && status !== 'paused') return
    setMovingMs(sessionMovingMs(s))
  }, [tick, status, distanceM, points.length])

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }
    const now = Date.now()
    const session = createEmptySession(
      newRideId(),
      now,
      getRiderWeightKg() || DEFAULT_RIDER_WEIGHT_KG,
    )
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
    const next = pauseSession(s)
    persistSession(next)
    setStatus('paused')
    setMovingMs(next.accumulatedMovingMs)
    setCurrentSpeedKmh(0)
  }, [persistSession])

  const resume = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.status !== 'paused') return
    const next = resumeSession(s)
    persistSession(next)
    setStatus('recording')
    setErrorMsg(null)
  }, [persistSession])

  const discard = useCallback(() => {
    stopWatch()
    clearActiveRideSession()
    sessionRef.current = null
    uiReset()
  }, [stopWatch, uiReset])

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

  const stop = useCallback((): RideRecord | null => {
    const s = sessionRef.current
    if (!s) return null

    const now = Date.now()
    const moving = sessionMovingMs(s, now)
    const photoCount = (s.photos ?? []).length
    if (isRideTooShort(s.distanceM, moving, photoCount)) {
      discard()
      return null
    }

    const record = saveRideRecordWithQuota(finalizeSessionToRecord(s, now))

    stopWatch()
    clearActiveRideSession()
    sessionRef.current = null
    uiReset()
    return record
  }, [discard, stopWatch, uiReset])

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
