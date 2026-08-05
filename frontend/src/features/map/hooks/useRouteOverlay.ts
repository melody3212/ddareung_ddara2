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
  /**
   * course: 추천코스 강조 (굵은 외곽선 + 선명 색)
   * default: 길찾기 결과
   */
  variant?: 'default' | 'course'
  /** setBounds 패딩 [top, right, bottom, left] px — 바텀시트 가림 보정 */
  boundsPadding?: [number, number, number, number]
  /** 같은 코스 재클릭 시 지도 재포커스 */
  focusKey?: number
}

type Args = {
  mapRef: RefObject<kakao.maps.Map | null>
  status: MapStatus
  routeOverlay?: RouteOverlay | null
  routeLinesRef: MutableRefObject<kakao.maps.Polyline[]>
  routeMarkersRef: MutableRefObject<kakao.maps.Marker[]>
}

/**
 * 길찾기·추천코스 경로 오버레이
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
    const overlays: kakao.maps.CustomOverlay[] = []

    const clear = () => {
      routeLinesRef.current.forEach((p) => p.setMap(null))
      routeLinesRef.current = []
      routeMarkersRef.current.forEach((m) => m.setMap(null))
      routeMarkersRef.current = []
      overlays.forEach((o) => o.setMap(null))
      overlays.length = 0
    }

    clear()
    if (!routeOverlay?.path?.length) return

    const path = routeOverlay.path
    const segments = routeOverlay.segments
    const legs = routeOverlay.legs
    const isCourse = routeOverlay.variant === 'course'

    // ── 추천코스: 흰 외곽선 + 주황 강조선 (자전거도로·추천 파란선과 구분) ──
    if (isCourse) {
      const pathLatLng = path.map(
        ([lng, lat]) => new maps.LatLng(Number(lat), Number(lng)),
      )

      const outline = new maps.Polyline({
        map,
        path: pathLatLng,
        strokeWeight: 14,
        strokeColor: '#ffffff',
        strokeOpacity: 0.95,
        strokeStyle: 'solid',
        zIndex: 12,
      })
      const main = new maps.Polyline({
        map,
        path: pathLatLng,
        strokeWeight: 8,
        strokeColor: '#f97316',
        strokeOpacity: 1,
        strokeStyle: 'solid',
        zIndex: 13,
      })
      routeLinesRef.current.push(outline, main)

      const start = path[0]
      const end = path[path.length - 1]
      if (start) {
        overlays.push(
          makeLabelOverlay(
            maps,
            map,
            Number(start[1]),
            Number(start[0]),
            '출발',
            '#16a34a',
          ),
        )
      }
      if (end) {
        const same =
          start &&
          Number(start[0]) === Number(end[0]) &&
          Number(start[1]) === Number(end[1])
        overlays.push(
          makeLabelOverlay(
            maps,
            map,
            Number(end[1]),
            Number(end[0]),
            same ? '출발=도착' : '도착',
            same ? '#2563eb' : '#dc2626',
          ),
        )
      }
    } else if (legs && legs.length > 0) {
      // 1) 베이스 라인 (도보=점선 회색, 자전거=얇은 베이스)
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

    // 2) 경사 색 — 길찾기용
    if (!isCourse && segments?.length) {
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

    // 출발·도착 마커 (길찾기)
    if (!isCourse) {
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
    }

    // 대여/반납 전환점
    if (!isCourse && legs && legs.length >= 2) {
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

    // fitBounds — 시트 애니메이션·relayout 후 패딩 적용 (경로가 시트 아래로 안 들어가게)
    let timer1: number | undefined
    let timer2: number | undefined
    if (routeOverlay.fitBounds !== false && path.length >= 2) {
      const pad = routeOverlay.boundsPadding ?? (
        isCourse ? ([48, 36, 140, 36] as [number, number, number, number]) : undefined
      )

      const applyBounds = () => {
        const m = mapRef.current
        if (!m || !window.kakao?.maps) return
        try {
          m.relayout()
        } catch {
          /* ignore */
        }
        const bounds = new window.kakao.maps.LatLngBounds()
        path.forEach(([lng, lat]) => {
          bounds.extend(
            new window.kakao.maps.LatLng(Number(lat), Number(lng)),
          )
        })
        if (pad) {
          m.setBounds(bounds, pad[0], pad[1], pad[2], pad[3])
        } else {
          m.setBounds(bounds)
        }
      }

      // 즉시 1회 + 시트 접힘 애니메이션(300ms) 후 재적용
      applyBounds()
      timer1 = window.setTimeout(applyBounds, 80)
      timer2 = window.setTimeout(applyBounds, 360)
    }

    return () => {
      if (timer1) window.clearTimeout(timer1)
      if (timer2) window.clearTimeout(timer2)
      clear()
    }
  }, [
    mapRef,
    status,
    routeOverlay,
    routeLinesRef,
    routeMarkersRef,
    routeOverlay?.focusKey,
    routeOverlay?.variant,
    routeOverlay?.path,
  ])
}

function makeLabelOverlay(
  maps: typeof kakao.maps,
  map: kakao.maps.Map,
  lat: number,
  lng: number,
  text: string,
  color: string,
): kakao.maps.CustomOverlay {
  const el = document.createElement('div')
  el.style.cssText = [
    'padding:3px 8px',
    'border-radius:999px',
    'font-size:11px',
    'font-weight:700',
    'color:#fff',
    `background:${color}`,
    'box-shadow:0 2px 8px rgba(0,0,0,.25)',
    'white-space:nowrap',
    'border:2px solid #fff',
  ].join(';')
  el.textContent = text
  return new maps.CustomOverlay({
    map,
    position: new maps.LatLng(lat, lng),
    content: el,
    yAnchor: 1.4,
    zIndex: 20,
  })
}
