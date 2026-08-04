import { useEffect, useMemo, useRef, useState } from 'react'
import type { NavStep, RouteSearchResult } from '../types'
import {
  buildCumulative,
  findNextStep,
  projectOnRoute,
  remainingDistance,
  type LatLng,
} from '../lib/routeProgress'

export type NavStatus = 'idle' | 'locating' | 'navigating' | 'offroute' | 'arrived' | 'error'

type Args = {
  route: RouteSearchResult | null
  enabled: boolean
}

export function useRouteNavigation({ route, enabled }: Args) {
  const [status, setStatus] = useState<NavStatus>('idle')
  const [position, setPosition] = useState<LatLng | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [along_m, setAlongM] = useState(0)
  const [distToRoute, setDistToRoute] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)

  const path = route?.path ?? []
  const cum = useMemo(() => (path.length >= 2 ? buildCumulative(path) : [0]), [path])
  const total_m = route?.distance_m ?? cum[cum.length - 1] ?? 0
  const steps: NavStep[] = route?.steps?.length
    ? route.steps
    : (route?.legs ?? []).flatMap((l) => l.steps ?? [])

  const remaining_m = remainingDistance(total_m, along_m)
  const progress = total_m > 0 ? Math.min(1, along_m / total_m) : 0

  const { current, next, index } = useMemo(
    () => findNextStep(steps, along_m),
    [steps, along_m],
  )

  // 다음 지시까지 남은 거리 (대략)
  const distToNextM = useMemo(() => {
    if (!next) return remaining_m
    return Math.max(0, next.distance_along_m - along_m)
  }, [next, along_m, remaining_m])

  useEffect(() => {
    if (!enabled || !route) {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      setStatus('idle')
      return
    }

    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMsg('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }

    setStatus('locating')
    setErrorMsg(null)

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setPosition(p)
        setAccuracy(pos.coords.accuracy ?? null)

        if (path.length < 2) return

        const proj = projectOnRoute(p, path, cum)
        setAlongM(proj.along_m)
        setDistToRoute(proj.dist_to_route_m)

        if (proj.dist_to_route_m > 80) {
          setStatus('offroute')
        } else if (remainingDistance(total_m, proj.along_m) < 35) {
          setStatus('arrived')
        } else {
          setStatus('navigating')
        }
      },
      (err) => {
        setStatus('error')
        setErrorMsg(err.message || '위치 수신 실패')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      },
    )

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [enabled, route, path, cum, total_m])

  return {
    status,
    position,
    accuracy,
    along_m,
    remaining_m,
    progress,
    distToRoute,
    currentStep: current,
    nextStep: next,
    stepIndex: index,
    distToNextM,
    steps,
    total_m,
    errorMsg,
  }
}
