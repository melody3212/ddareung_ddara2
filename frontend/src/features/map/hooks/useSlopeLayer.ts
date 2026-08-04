import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import type { BikeRoadLine } from '../../bike-roads'
import { elevationApi, type ElevationProfile } from '../../elevation'
import { request } from '../../../shared/api/client'
import { getDistanceMeters } from '../../../shared/geo'
import {
  SLOPE_MAX_ROADS,
  SLOPE_MIN_PATH_POINTS,
  SLOPE_NEAR_M,
} from '../lib/constants'

type MapStatus = 'loading' | 'ready' | 'error'
type LatLng = { lat: number; lng: number }

type OsmRoad = {
  path_id: string
  coordinates: number[][]
  highway: string
  name?: string | null
}

type SlopePath = {
  key: string
  coordinates: number[][] // [[lng,lat]]
  kind: 'bike' | 'osm'
}

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  showSlope: boolean
  bikeRoads: BikeRoadLine[] | null
  centerRef: MutableRefObject<LatLng>
  slopeTick: number
  slopeLinesRef: MutableRefObject<kakao.maps.Polyline[]>
}

/**
 * 경사도 레이어
 * - 자전거 도로(bikeload) + OSM 일반 도로(Overpass)
 * - 길찾기에 일반도로가 섞여도 홈에서 지형 경사를 같이 볼 수 있음
 */
export function useSlopeLayer({
  mapRef,
  status,
  showSlope,
  bikeRoads,
  centerRef,
  slopeTick,
  slopeLinesRef,
}: Args) {
  const slopeCacheRef = useRef<Map<string, ElevationProfile>>(new Map())
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
    if (!showSlope) {
      setSlopeHint(null)
      setSlopeLoading(false)
      return
    }

    let cancelled = false
    const { lat: cLat, lng: cLng } = centerRef.current

    async function run() {
      setSlopeLoading(true)
      try {
        const paths: SlopePath[] = []

        // 1) 자전거 도로 (근처)
        if (bikeRoads?.length) {
          type Cand = { key: string; road: BikeRoadLine; dist: number }
          const cands: Cand[] = []
          for (let idx = 0; idx < bikeRoads.length; idx++) {
            const road = bikeRoads[idx]
            if (!road.path || road.path.length < SLOPE_MIN_PATH_POINTS) continue
            const mid = road.path[Math.floor(road.path.length / 2)] ?? road.path[0]
            const dist = getDistanceMeters({ lat: cLat, lng: cLng }, mid)
            if (dist > SLOPE_NEAR_M) continue
            cands.push({ key: `bike-${idx}`, road, dist })
          }
          cands.sort((a, b) => a.dist - b.dist)
          for (const c of cands.slice(0, Math.floor(SLOPE_MAX_ROADS * 0.55))) {
            paths.push({
              key: c.key,
              coordinates: c.road.path.map((pt) => [pt.lng, pt.lat]),
              kind: 'bike',
            })
          }
        }

        // 2) OSM 일반 도로 (뷰포트 bbox)
        let osmNote = ''
        try {
          const m = mapRef.current
          if (!m) throw new Error('map null')
          const bounds = m.getBounds()
          const sw = bounds.getSouthWest()
          const ne = bounds.getNorthEast()
          // 너무 넓으면 중심 박스만
          let minLat = sw.getLat()
          let minLng = sw.getLng()
          let maxLat = ne.getLat()
          let maxLng = ne.getLng()
          if (maxLat - minLat > 0.04 || maxLng - minLng > 0.05) {
            minLat = cLat - 0.012
            maxLat = cLat + 0.012
            minLng = cLng - 0.014
            maxLng = cLng + 0.014
          }
          const q = new URLSearchParams({
            min_lat: String(minLat),
            min_lng: String(minLng),
            max_lat: String(maxLat),
            max_lng: String(maxLng),
            limit: String(Math.floor(SLOPE_MAX_ROADS * 0.7)),
          })
          const osm = await request<{ roads: OsmRoad[] }>(`/osm-roads?${q}`)
          if (cancelled) return
          for (const r of osm.roads ?? []) {
            if (!r.coordinates || r.coordinates.length < 2) continue
            paths.push({
              key: String(r.path_id),
              coordinates: r.coordinates,
              kind: 'osm',
            })
          }
        } catch {
          // Overpass 실패 시 DEM 격자 폴백
          osmNote = ' · OSM 실패→지형격자'
        }

        // 3) 일반도로가 거의 없으면 DEM 격자 경로 (길찾기에 쓰이는 일반도로 구간 대비)
        const osmSoFar = paths.filter((p) => p.kind === 'osm').length
        if (osmSoFar < 8) {
          const span = 0.012
          const n = 5
          for (let i = 0; i <= n; i++) {
            const t = i / n
            const lat = cLat - span + t * 2 * span
            const lng = cLng - span + t * 2 * span
            // 가로선
            paths.push({
              key: `grid-h-${i}`,
              coordinates: [
                [cLng - span, lat],
                [cLng + span, lat],
              ],
              kind: 'osm',
            })
            // 세로선
            paths.push({
              key: `grid-v-${i}`,
              coordinates: [
                [lng, cLat - span],
                [lng, cLat + span],
              ],
              kind: 'osm',
            })
          }
          if (!osmNote) osmNote = ' · 일반도로+지형격자'
        }

        // 중복 키 제거 · 상한
        const seen = new Set<string>()
        const unique = paths.filter((p) => {
          if (seen.has(p.key)) return false
          seen.add(p.key)
          return true
        }).slice(0, SLOPE_MAX_ROADS + 20)

        if (!unique.length) {
          setSlopeHint('이 위치 근처 도로 없음 · 지도를 이동해 보세요')
          return
        }

        const uncached = unique.filter((p) => !slopeCacheRef.current.has(p.key))
        if (uncached.length) {
          // batch 한도 40
          for (let i = 0; i < uncached.length; i += 36) {
            const chunk = uncached.slice(i, i + 36)
            const res = await elevationApi.batch(
              chunk.map((p) => ({
                path_id: p.key,
                coordinates: p.coordinates,
              })),
              10,
            )
            if (cancelled) return
            for (const profile of res.profiles) {
              const id = String(profile.path_id ?? '')
              if (id) slopeCacheRef.current.set(id, profile)
            }
          }
        }

        if (cancelled || !mapRef.current || !window.kakao?.maps) return
        const maps = window.kakao.maps
        clear()

        let steepSegs = 0
        let maxGrade = 0
        let drawn = 0
        let bikeCount = 0
        let osmCount = 0

        for (const p of unique) {
          if (p.kind === 'bike') bikeCount += 1
          else osmCount += 1
          const profile = slopeCacheRef.current.get(p.key)
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
              strokeWeight: seg.is_steep ? 7 : p.kind === 'bike' ? 5 : 4,
              strokeColor: seg.color || '#ef4444',
              strokeOpacity: seg.is_steep ? 0.95 : p.kind === 'bike' ? 0.8 : 0.7,
              strokeStyle: 'solid',
              zIndex: seg.is_steep ? 5 : p.kind === 'bike' ? 4 : 3,
            })
            slopeLinesRef.current.push(line)
            drawn += 1
          }
        }

        setSlopeHint(
          `경사: 자전거도로 ${bikeCount} · 일반도로 ${osmCount} · 급경사 ${steepSegs} · 최대 ${maxGrade.toFixed(1)}%` +
            (drawn ? '' : ' · 데이터 없음') +
            osmNote,
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
