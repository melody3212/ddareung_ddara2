import { useEffect, type MutableRefObject, type RefObject } from 'react'
import type { GradeSegment } from '../../elevation'

type MapStatus = 'loading' | 'ready' | 'error'

export type RouteOverlayLeg = {
  kind: 'walk' | 'bike'
  path: number[][]
}

export type RouteOverlay = {
  path: number[][]
  segments?: GradeSegment[]
  /** 있으면 도보=점선 회색, 자전거=경사 색으로 구분 */
  legs?: RouteOverlayLeg[]
  fitBounds?: boolean
  follow?: { lat: number; lng: number; level?: number } | null
}

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  routeOverlay?: RouteOverlay | null
  routeLinesRef: MutableRefObject<kakao.maps.Polyline[]>
  routeMarkersRef: MutableRefObject<kakao.maps.Marker[]>
}

/** 길찾기 결과 경로·경사 세그먼트 오버레이 */
export function useRouteOverlay({
  mapRef,
  status,
  routeOverlay,
  routeLinesRef,
  routeMarkersRef,
}: Args) {
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    const clear = () => {
      routeLinesRef.current.forEach((p) => p.setMap(null))
      routeLinesRef.current = []
      routeMarkersRef.current.forEach((m) => m.setMap(null))
      routeMarkersRef.current = []
    }

    clear()
    if (!routeOverlay?.path?.length) return

    const path = routeOverlay.path
    const segments = routeOverlay.segments
    const legs = routeOverlay.legs

    // 따릉이: 레그 단위로 도보(점선) / 자전거(실선·경사색) 구분
    if (legs && legs.length > 0) {
      for (const leg of legs) {
        if (!leg.path || leg.path.length < 2) continue
        if (leg.kind === 'walk') {
          const pathLatLng = leg.path.map(
            ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
          )
          const line = new maps.Polyline({
            map,
            path: pathLatLng,
            strokeWeight: 5,
            strokeColor: '#64748b',
            strokeOpacity: 0.95,
            strokeStyle: 'shortdash',
            zIndex: 4,
          })
          routeLinesRef.current.push(line)
        } else if (segments?.length) {
          // 자전거 구간만 경사 세그먼트 중 겹치는 부분 근사: 전체 segments 중 leg 범위는 단순화해 전체 bike path에 색 입힘
          // 세그먼트가 전체 path 기준이면 bike leg path에 대해 한 줄 단색 + steep 강조 대신 segments 필터 없이 path 사용
          const pathLatLng = leg.path.map(
            ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
          )
          const line = new maps.Polyline({
            map,
            path: pathLatLng,
            strokeWeight: 6,
            strokeColor: '#10b981',
            strokeOpacity: 0.9,
            strokeStyle: 'solid',
            zIndex: 5,
          })
          routeLinesRef.current.push(line)
        } else {
          const pathLatLng = leg.path.map(
            ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
          )
          const line = new maps.Polyline({
            map,
            path: pathLatLng,
            strokeWeight: 6,
            strokeColor: '#10b981',
            strokeOpacity: 0.9,
            strokeStyle: 'solid',
            zIndex: 5,
          })
          routeLinesRef.current.push(line)
        }
      }

      // 자전거 구간에 경사 색 세그먼트 오버레이 (있을 때)
      if (segments?.length) {
        for (const seg of segments) {
          if (!seg.path || seg.path.length < 2) continue
          // 도보 구간과 겹치면 흐리게 그리지 않도록 is_steep 위주 강조
          const pathLatLng = seg.path.map(
            ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
          )
          const line = new maps.Polyline({
            map,
            path: pathLatLng,
            strokeWeight: seg.is_steep ? 7 : 4,
            strokeColor: seg.color || '#10b981',
            strokeOpacity: seg.is_steep ? 0.95 : 0.55,
            strokeStyle: 'solid',
            zIndex: seg.is_steep ? 6 : 5,
          })
          routeLinesRef.current.push(line)
        }
      }
    } else if (segments?.length) {
      for (const seg of segments) {
        if (!seg.path || seg.path.length < 2) continue
        const pathLatLng = seg.path.map(
          ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
        )
        const line = new maps.Polyline({
          map,
          path: pathLatLng,
          strokeWeight: seg.is_steep ? 8 : 6,
          strokeColor: seg.color || '#3b82f6',
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
          zIndex: 5,
        })
        routeLinesRef.current.push(line)
      }
    } else {
      const pathLatLng = path.map(
        ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
      )
      const line = new maps.Polyline({
        map,
        path: pathLatLng,
        strokeWeight: 6,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
        zIndex: 5,
      })
      routeLinesRef.current.push(line)
    }

    // 출발·도착 마커
    const start = path[0]
    const end = path[path.length - 1]
    if (start) {
      const m = new maps.Marker({
        map,
        position: new maps.LatLng(Number(start[1]), Number(start[0])),
        title: '출발',
        zIndex: 6,
      })
      routeMarkersRef.current.push(m)
    }
    if (end) {
      const m = new maps.Marker({
        map,
        position: new maps.LatLng(Number(end[1]), Number(end[0])),
        title: '도착',
        zIndex: 6,
      })
      routeMarkersRef.current.push(m)
    }

    // 대여/반납 지점 (walk→bike 전환점)
    if (legs && legs.length >= 2) {
      for (let i = 0; i < legs.length - 1; i++) {
        const cur = legs[i]
        const next = legs[i + 1]
        if (cur.kind === 'walk' && next.kind === 'bike' && cur.path.length) {
          const p = cur.path[cur.path.length - 1]
          const m = new maps.Marker({
            map,
            position: new maps.LatLng(Number(p[1]), Number(p[0])),
            title: '대여',
            zIndex: 7,
          })
          routeMarkersRef.current.push(m)
        }
        if (cur.kind === 'bike' && next.kind === 'walk' && cur.path.length) {
          const p = cur.path[cur.path.length - 1]
          const m = new maps.Marker({
            map,
            position: new maps.LatLng(Number(p[1]), Number(p[0])),
            title: '반납',
            zIndex: 7,
          })
          routeMarkersRef.current.push(m)
        }
      }
    }

    if (routeOverlay.fitBounds !== false && path.length >= 2) {
      const bounds = new maps.LatLngBounds()
      path.forEach(([lng, lat]) => {
        bounds.extend(new maps.LatLng(Number(lat), Number(lng)))
      })
      map.setBounds(bounds)
    }

    return () => clear()
  }, [mapRef, status, routeOverlay, routeLinesRef, routeMarkersRef])
}
