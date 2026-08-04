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

/**
 * 길찾기 경로 오버레이
 * - 경사 세그먼트가 있으면 **전체 경로(일반도로 포함)** 를 경사 색으로 표시
 * - 도보 레그는 점선, 자전거 레그는 실선 베이스 위에 경사 색
 */
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

    // 1) 베이스 라인 (도보=점선 회색, 자전거=얇은 베이스)
    if (legs && legs.length > 0) {
      for (const leg of legs) {
        if (!leg.path || leg.path.length < 2) continue
        const pathLatLng = leg.path.map(
          ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
        )
        const isWalk = leg.kind === 'walk'
        const line = new maps.Polyline({
          map,
          path: pathLatLng,
          strokeWeight: isWalk ? 5 : 5,
          strokeColor: isWalk ? '#64748b' : '#94a3b8',
          strokeOpacity: isWalk ? 0.85 : 0.45,
          strokeStyle: isWalk ? 'shortdash' : 'solid',
          zIndex: 4,
        })
        routeLinesRef.current.push(line)
      }
    } else if (!segments?.length) {
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

    // 2) 경사 색 — 전체 경로 세그먼트 (자전거 도로 여부 무관, 일반도로 포함)
    if (segments?.length) {
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
          strokeOpacity: seg.is_steep ? 0.98 : 0.92,
          strokeStyle: 'solid',
          zIndex: seg.is_steep ? 7 : 6,
        })
        routeLinesRef.current.push(line)
      }
    }

    // 출발·도착 마커
    const start = path[0]
    const end = path[path.length - 1]
    if (start) {
      routeMarkersRef.current.push(
        new maps.Marker({
          map,
          position: new maps.LatLng(Number(start[1]), Number(start[0])),
          title: '출발',
          zIndex: 8,
        }),
      )
    }
    if (end) {
      routeMarkersRef.current.push(
        new maps.Marker({
          map,
          position: new maps.LatLng(Number(end[1]), Number(end[0])),
          title: '도착',
          zIndex: 8,
        }),
      )
    }

    // 대여/반납 전환점
    if (legs && legs.length >= 2) {
      for (let i = 0; i < legs.length - 1; i++) {
        const cur = legs[i]
        const next = legs[i + 1]
        if (cur.kind === 'walk' && next.kind === 'bike' && cur.path.length) {
          const p = cur.path[cur.path.length - 1]
          routeMarkersRef.current.push(
            new maps.Marker({
              map,
              position: new maps.LatLng(Number(p[1]), Number(p[0])),
              title: '대여',
              zIndex: 9,
            }),
          )
        }
        if (cur.kind === 'bike' && next.kind === 'walk' && cur.path.length) {
          const p = cur.path[cur.path.length - 1]
          routeMarkersRef.current.push(
            new maps.Marker({
              map,
              position: new maps.LatLng(Number(p[1]), Number(p[0])),
              title: '반납',
              zIndex: 9,
            }),
          )
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
