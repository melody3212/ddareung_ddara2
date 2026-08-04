import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import type { BikeRoadLine } from '../../bike-roads'
import { elevationApi, type ElevationProfile } from '../../elevation'
import { getDistanceMeters } from '../../../shared/geo'
import {
  SLOPE_MAX_ROADS,
  SLOPE_MIN_PATH_POINTS,
  SLOPE_NEAR_M,
} from '../lib/constants'

type MapStatus = 'loading' | 'ready' | 'error'
type LatLng = { lat: number; lng: number }

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  showSlope: boolean
  bikeRoads: BikeRoadLine[] | null
  centerRef: MutableRefObject<LatLng>
  slopeTick: number
  slopeLinesRef: MutableRefObject<kakao.maps.Polyline[]>
}

/** 경사도 레이어 — 지도 중심 근처 도로 고도 분석 */
export function useSlopeLayer({
  mapRef,
  status,
  showSlope,
  bikeRoads,
  centerRef,
  slopeTick,
  slopeLinesRef,
}: Args) {
  const slopeCacheRef = useRef<Map<number, ElevationProfile>>(new Map())
  const [slopeHint, setSlopeHint] = useState<string | null>(null)
  const [slopeLoading, setSlopeLoading] = useState(false)

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const clear = () => {
      slopeLinesRef.current.forEach((p) => p.setMap(null))
      slopeLinesRef.current = []
    }

    clear()
    if (!showSlope || !bikeRoads?.length) {
      setSlopeHint(null)
      setSlopeLoading(false)
      return
    }

    let cancelled = false
    const { lat: cLat, lng: cLng } = centerRef.current

    type Cand = { index: number; road: BikeRoadLine; dist: number }
    const cands: Cand[] = []
    for (let idx = 0; idx < bikeRoads.length; idx++) {
      const road = bikeRoads[idx]
      if (!road.path || road.path.length < SLOPE_MIN_PATH_POINTS) continue
      const mid = road.path[Math.floor(road.path.length / 2)] ?? road.path[0]
      const dist = getDistanceMeters({ lat: cLat, lng: cLng }, mid)
      if (dist > SLOPE_NEAR_M) continue
      cands.push({ index: idx, road, dist })
    }
    cands.sort((a, b) => a.dist - b.dist)
    const picked = cands.slice(0, SLOPE_MAX_ROADS)

    if (!picked.length) {
      setSlopeHint('이 위치 근처 도로 없음 · 지도를 이동해 보세요')
      return
    }

    const uncached = picked.filter((p) => !slopeCacheRef.current.has(p.index))

    async function run() {
      setSlopeLoading(true)
      try {
        if (uncached.length) {
          const paths = uncached.map((p) => ({
            path_id: p.index,
            coordinates: p.road.path.map((pt) => [pt.lng, pt.lat]),
          }))
          const res = await elevationApi.batch(paths, 12)
          if (cancelled) return
          for (const profile of res.profiles) {
            const id = Number(profile.path_id)
            if (Number.isFinite(id)) slopeCacheRef.current.set(id, profile)
          }
        }
        if (cancelled || !mapRef.current || !window.kakao?.maps) return

        const maps = window.kakao.maps
        clear()
        let steepSegs = 0
        let maxGrade = 0
        let drawn = 0

        for (const { index } of picked) {
          const profile = slopeCacheRef.current.get(index)
          if (!profile?.segments?.length) continue
          for (const seg of profile.segments) {
            if (!seg.path || seg.path.length < 2) continue
            maxGrade = Math.max(maxGrade, seg.abs_grade_pct ?? 0)
            if (seg.is_steep) steepSegs += 1
            const pathLatLng = seg.path.map(
              ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
            )
            const line = new maps.Polyline({
              map: mapRef.current!,
              path: pathLatLng,
              strokeWeight: seg.is_steep ? 7 : 5,
              strokeColor: seg.color || '#ef4444',
              strokeOpacity: seg.is_steep ? 0.95 : 0.75,
              strokeStyle: 'solid',
              zIndex: seg.is_steep ? 4 : 3,
            })
            slopeLinesRef.current.push(line)
            drawn += 1
          }
        }

        setSlopeHint(
          `경사 분석 ${picked.length}개 도로 · 급경사 구간 ${steepSegs} · 최대 ${maxGrade.toFixed(1)}%` +
            (drawn ? '' : ' · 데이터 없음'),
        )
      } catch (e) {
        if (!cancelled) {
          setSlopeHint(
            `경사 불러오기 실패 — 백엔드 확인 (${e instanceof Error ? e.message.slice(0, 80) : 'error'})`,
          )
        }
      } finally {
        if (!cancelled) setSlopeLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
      clear()
    }
  }, [mapRef, status, showSlope, bikeRoads, centerRef, slopeTick, slopeLinesRef])

  return { slopeHint, slopeLoading }
}
