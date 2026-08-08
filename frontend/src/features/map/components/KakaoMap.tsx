/**
 * 지도 본체 — 레이어 훅 조합
 */
import { useEffect, useRef, useState } from 'react'
import markerImgUrl from '../../../assets/images/ddareungMarker.png'
import { loadBikeRoads, type BikeRoadLine } from '../../bike-roads'
import type { Station } from '../../stations'
import { useBikeRoadPolylines } from '../hooks/useBikeRoadPolylines'
import { useRecommendPath } from '../hooks/useRecommendPath'
import {
  useRouteOverlay,
  type RouteOverlay,
} from '../hooks/useRouteOverlay'
import { useSlopeLayer } from '../hooks/useSlopeLayer'
import { useStationMarkers } from '../hooks/useStationMarkers'
import { SEOUL_CENTER } from '../lib/constants'
import { loadKakaoMaps } from '../lib/loadKakaoMap'
import { MapStatusOverlay } from './MapStatusOverlay'

type Props = {
  showStations: boolean
  showBikePaths: boolean
  showSlope?: boolean
  stations?: Station[]
  className?: string
  locationRequestId?: number
  /** 길찾기 결과 경로 오버레이 */
  routeOverlay?: RouteOverlay | null
  /** 홈 추천 파란선 등 부가 레이어 숨김 */
  compact?: boolean
  /** 길안내 중 현재 위치로 지도 추적 */
  followPosition?: { lat: number; lng: number } | null
}

export function KakaoMap({
  showStations,
  showBikePaths,
  showSlope = false,
  stations = [],
  className,
  locationRequestId = 0,
  routeOverlay = null,
  compact = false,
  followPosition = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const slopeLinesRef = useRef<kakao.maps.Polyline[]>([])
  const routeLinesRef = useRef<kakao.maps.Polyline[]>([])
  const routeMarkersRef = useRef<kakao.maps.Marker[]>([])
  const recommendLineRef = useRef<kakao.maps.Polyline | null>(null)
  const myLocMarkerRef = useRef<kakao.maps.Marker | null>(null)
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)
  const markerImageRef = useRef<kakao.maps.MarkerImage | null>(null)
  const centerRef = useRef(SEOUL_CENTER)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bikeRoads, setBikeRoads] = useState<BikeRoadLine[] | null>(null)
  const [roadError, setRoadError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(4)
  const [recommendHint, setRecommendHint] = useState<string | null>(null)
  const [slopeTick, setSlopeTick] = useState(0)

  // Init map — StrictMode 이중 마운트 대비: 컨테이너 비우고 재생성
  useEffect(() => {
    let cancelled = false
    let idleTimer: number | undefined

    function teardownOverlays() {
      try {
        clustererRef.current?.clear()
      } catch {
        /* ignore */
      }
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      polylinesRef.current.forEach((p) => p.setMap(null))
      polylinesRef.current = []
      slopeLinesRef.current.forEach((p) => p.setMap(null))
      slopeLinesRef.current = []
      routeLinesRef.current.forEach((p) => p.setMap(null))
      routeLinesRef.current = []
      routeMarkersRef.current.forEach((m) => m.setMap(null))
      routeMarkersRef.current = []
      recommendLineRef.current?.setMap(null)
      recommendLineRef.current = null
      myLocMarkerRef.current?.setMap(null)
      myLocMarkerRef.current = null
      infoRef.current?.close()
      clustererRef.current?.setMap(null)
      clustererRef.current = null
      mapRef.current = null
    }

    async function init() {
      try {
        setStatus('loading')
        setErrorMsg(null)
        const maps = await loadKakaoMaps()
        if (cancelled || !containerRef.current) return

        // 이전 Map DOM 잔여물 제거 (React StrictMode 필수)
        const el = containerRef.current
        el.innerHTML = ''

        // 레이아웃 확정 대기 (높이 0이면 카카오 맵 실패)
        await new Promise<void>((r) => requestAnimationFrame(() => r()))
        if (cancelled || !containerRef.current) return
        if (el.clientWidth < 10 || el.clientHeight < 10) {
          // 한 프레임 더 대기
          await new Promise<void>((r) => setTimeout(r, 50))
        }
        if (cancelled || !containerRef.current) return

        const center = new maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
        const map = new maps.Map(el, {
          center,
          level: 4,
        })
        if (cancelled) {
          el.innerHTML = ''
          return
        }

        mapRef.current = map
        // removable: 닫기 버튼 · 대여소 카드 팝업용
        infoRef.current = new maps.InfoWindow({
          zIndex: 12,
          removable: true,
        })

        try {
          markerImageRef.current = new maps.MarkerImage(
            markerImgUrl,
            new maps.Size(25, 20),
            { offset: new maps.Point(12, 12) },
          )
        } catch {
          markerImageRef.current = null
        }

        try {
          if (typeof maps.MarkerClusterer === 'function') {
            clustererRef.current = new maps.MarkerClusterer({
              map,
              averageCenter: true,
              minLevel: 6,
              gridSize: 60,
            })
          }
        } catch {
          clustererRef.current = null
        }

        myLocMarkerRef.current = new maps.Marker({
          map,
          position: center,
          zIndex: 2,
        })

        maps.event.addListener(map, 'zoom_changed', () => {
          if (!cancelled && mapRef.current) setZoomLevel(map.getLevel())
        })
        maps.event.addListener(map, 'center_changed', () => {
          if (cancelled || !mapRef.current) return
          const c = map.getCenter()
          centerRef.current = { lat: c.getLat(), lng: c.getLng() }
        })
        maps.event.addListener(map, 'click', () => {
          infoRef.current?.close()
        })
        maps.event.addListener(map, 'idle', () => {
          window.clearTimeout(idleTimer)
          idleTimer = window.setTimeout(() => {
            if (!cancelled) setSlopeTick((n) => n + 1)
          }, 450)
        })

        setZoomLevel(map.getLevel())
        setStatus('ready')
        requestAnimationFrame(() => {
          try {
            map.relayout()
            map.setCenter(center)
          } catch {
            /* ignore */
          }
        })
        window.setTimeout(() => {
          try {
            map.relayout()
          } catch {
            /* ignore */
          }
        }, 200)
      } catch (e) {
        if (cancelled) return
        console.error('[KakaoMap] init failed', e)
        setStatus('error')
        setErrorMsg(e instanceof Error ? e.message : String(e))
      }
    }

    void init()
    return () => {
      cancelled = true
      window.clearTimeout(idleTimer)
      teardownOverlays()
      // 카카오 맵이 컨테이너에 남긴 노드 제거
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  // GeoJSON 자전거도로
  useEffect(() => {
    let cancelled = false
    loadBikeRoads()
      .then((lines) => {
        if (!cancelled) {
          setBikeRoads(lines)
          setRoadError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setBikeRoads([])
          setRoadError(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { updateRecommendedPath } = useRecommendPath({
    mapRef,
    status,
    bikeRoads: compact ? null : bikeRoads,
    centerRef,
    recommendLineRef,
    setRecommendHint,
  })

  // 내 위치
  useEffect(() => {
    if (!locationRequestId || status !== 'ready' || !mapRef.current) return
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map || !window.kakao?.maps) return
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        centerRef.current = { lat, lng }
        const ll = new window.kakao.maps.LatLng(lat, lng)
        map.setCenter(ll)
        myLocMarkerRef.current?.setMap(null)
        myLocMarkerRef.current = new window.kakao.maps.Marker({
          map,
          position: ll,
          zIndex: 2,
        })
        updateRecommendedPath(lat, lng)
      },
      (err) => {
        console.error(err)
        alert('위치 정보를 불러올 수 없습니다.')
      },
    )
  }, [locationRequestId, status, updateRecommendedPath])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const t = window.setTimeout(() => map.relayout(), 100)
    return () => window.clearTimeout(t)
  }, [status, className])

  useStationMarkers({
    mapRef,
    status,
    showStations,
    stations,
    clustererRef,
    markersRef,
    markerImageRef,
    infoRef,
  })

  useBikeRoadPolylines({
    mapRef,
    status,
    showBikePaths,
    showSlope,
    bikeRoads,
    polylinesRef,
  })

  const { slopeHint, slopeLoading } = useSlopeLayer({
    mapRef,
    status,
    showSlope,
    bikeRoads,
    centerRef,
    slopeTick,
    slopeLinesRef,
  })

  useRouteOverlay({
    mapRef,
    status,
    routeOverlay,
    routeLinesRef,
    routeMarkersRef,
  })

  // 길안내: 현재 위치 따라가기
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !followPosition || !window.kakao?.maps) return
    const maps = window.kakao.maps
    const ll = new maps.LatLng(followPosition.lat, followPosition.lng)
    map.setCenter(ll)
    if (map.getLevel() > 4) map.setLevel(3)
    myLocMarkerRef.current?.setMap(null)
    myLocMarkerRef.current = new maps.Marker({
      map,
      position: ll,
      zIndex: 10,
    })
  }, [followPosition, status])

  return (
    <div
      className={['relative overflow-hidden bg-slate-200', className].filter(Boolean).join(' ')}
    >
      {/* min-height: 부모가 absolute inset-0 일 때도 카카오 맵이 0px 높이로 안 뜨는 것 방지 */}
      <div
        ref={containerRef}
        className="h-full w-full min-h-[200px]"
        style={{ minHeight: '100%' }}
      />

      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
          <p className="text-sm font-medium text-blue-600">지도를 불러오는 중…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-slate-100 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-red-600">지도 로드 실패</p>
          <pre className="max-w-sm whitespace-pre-wrap text-left text-[11px] leading-relaxed text-slate-600">
            {errorMsg}
          </pre>
          <ul className="max-w-sm list-inside list-disc text-left text-[11px] text-slate-500">
            <li>
              접속 주소를 콘솔 등록 도메인과 맞추세요 (
              <code className="text-slate-700">localhost</code> vs{' '}
              <code className="text-slate-700">127.0.0.1</code>)
            </li>
            <li>
              <code className="text-slate-700">frontend/.env</code> 의{' '}
              <code className="text-slate-700">VITE_KAKAO_JS_KEY</code> 후 Vite 재시작
            </li>
            <li>카카오 콘솔 → JavaScript 키 · Web 도메인 확인</li>
          </ul>
        </div>
      )}

      {status === 'ready' && !compact && (
        <MapStatusOverlay
          showStations={showStations}
          showBikePaths={showBikePaths}
          showSlope={showSlope}
          stationCount={stations.length}
          roadCount={bikeRoads?.length ?? 0}
          roadsLoaded={bikeRoads != null}
          slopeLoading={slopeLoading}
          zoomLevel={zoomLevel}
          recommendHint={recommendHint}
          slopeHint={slopeHint}
          roadError={roadError}
        />
      )}
      {status === 'ready' && compact && (routeOverlay?.segments?.length || routeOverlay?.legs?.length) ? (
        <div className="pointer-events-none absolute bottom-2 left-2 max-w-[90%] rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
          {routeOverlay?.legs?.some((l) => l.kind === 'walk') && (
            <span className="mr-2 text-slate-500">╌ 도보 </span>
          )}
          <span className="text-slate-500">경로 전체 경사(일반도로 포함) </span>
          {routeOverlay?.segments?.length ? (
            <span className="mt-0.5 block">
              <span style={{ color: '#22c55e' }}>●평지 </span>
              <span style={{ color: '#eab308' }}>●완만 </span>
              <span style={{ color: '#ef4444' }}>●급경사(≥6%)</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
