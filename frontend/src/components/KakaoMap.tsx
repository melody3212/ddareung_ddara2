import { useEffect, useRef, useState } from 'react'
import markerImgUrl from '../assets/images/ddareungMarker.png'
import { loadKakaoMaps } from '../lib/loadKakaoMap'
import type { Station } from '../lib/api'
import {
  courseTypeColor,
  loadBikeRoads,
  type BikeRoadLine,
} from '../lib/bikeRoad'
import { formatDistance, getDistanceMeters } from '../lib/geo'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

type Props = {
  showStations: boolean
  showBikePaths: boolean
  stations?: Station[]
  className?: string
}

export function KakaoMap({
  showStations,
  showBikePaths,
  stations = [],
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const highlightRef = useRef<kakao.maps.Polyline | null>(null)
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)
  const markerImageRef = useRef<kakao.maps.MarkerImage | null>(null)
  const didFitStationsRef = useRef(false)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bikeRoads, setBikeRoads] = useState<BikeRoadLine[] | null>(null)
  const [roadError, setRoadError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(7)
  const [nearestHint, setNearestHint] = useState<string | null>(null)

  // Init map + clusterer
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setStatus('loading')
        const maps = await loadKakaoMaps()
        if (cancelled || !containerRef.current) return

        const center = new maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
        const map = new maps.Map(containerRef.current, {
          center,
          level: 7,
        })
        mapRef.current = map
        infoRef.current = new maps.InfoWindow({ zIndex: 3 })

        // 원본 offset 12,12 / size 25x20
        markerImageRef.current = new maps.MarkerImage(
          markerImgUrl,
          new maps.Size(25, 20),
          { offset: new maps.Point(12, 12) },
        )

        // MarkerClusterer (libraries=clusterer)
        if (typeof maps.MarkerClusterer === 'function') {
          clustererRef.current = new maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
            gridSize: 60,
          })
        }

        maps.event.addListener(map, 'zoom_changed', () => {
          setZoomLevel(map.getLevel())
        })
        setZoomLevel(map.getLevel())

        setStatus('ready')
        requestAnimationFrame(() => map.relayout())
        setTimeout(() => map.relayout(), 200)
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(e instanceof Error ? e.message : String(e))
      }
    }

    void init()
    return () => {
      cancelled = true
      clearStations()
      clearRoads()
      highlightRef.current?.setMap(null)
      clustererRef.current?.setMap(null)
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const t = window.setTimeout(() => map.relayout(), 100)
    return () => window.clearTimeout(t)
  }, [status, className])

  function clearStations() {
    if (clustererRef.current) {
      clustererRef.current.clear()
    }
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()
  }

  function clearRoads() {
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []
  }

  // 따릉이 대여소 + 클러스터
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    clearStations()

    if (!showStations || stations.length === 0) return

    const bounds = new maps.LatLngBounds()
    const markers: kakao.maps.Marker[] = []

    stations.forEach((s) => {
      const pos = new maps.LatLng(s.lat, s.lng)
      bounds.extend(pos)
      const marker = new maps.Marker({
        position: pos,
        title: s.name,
        image: markerImageRef.current ?? undefined,
      })
      maps.event.addListener(marker, 'click', () => {
        const detail = [
          s.bike_count != null ? `대여가능 ${s.bike_count}대` : null,
          s.rack_tot_cnt != null ? `거치대 ${s.rack_tot_cnt}` : null,
          s.shared != null ? `거치율 ${s.shared}%` : null,
        ].filter(Boolean)
        const iw = infoRef.current
        if (iw) {
          iw.setContent(
            `<div style="padding:8px 10px;font-size:12px;min-width:140px;line-height:1.4;">
              <strong>${escapeHtml(s.name)}</strong><br/>
              <span style="color:#64748b">${escapeHtml(detail.join(' · ') || '정보 없음')}</span>
            </div>`,
          )
          iw.open(map, marker)
        }
      })
      markers.push(marker)
    })

    markersRef.current = markers

    if (clustererRef.current) {
      clustererRef.current.addMarkers(markers)
    } else {
      markers.forEach((m) => m.setMap(map))
    }

    if (!didFitStationsRef.current && stations.length > 0) {
      map.setBounds(bounds, 48)
      didFitStationsRef.current = true
    }
  }, [stations, showStations, status])

  // 자전거도로 Polyline
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    clearRoads()

    if (!showBikePaths || !bikeRoads?.length) return

    let i = 0
    const batch = 200
    let cancelled = false
    let raf = 0

    const drawBatch = () => {
      if (cancelled || !mapRef.current) return
      const end = Math.min(i + batch, bikeRoads.length)
      for (; i < end; i++) {
        const { path, type } = bikeRoads[i]
        const pathLatLng = path.map((p) => new maps.LatLng(p.lat, p.lng))
        const line = new maps.Polyline({
          map: mapRef.current,
          path: pathLatLng,
          strokeWeight: 4,
          strokeColor: courseTypeColor(type),
          strokeOpacity: 0.45,
          strokeStyle: 'solid',
        })
        polylinesRef.current.push(line)
      }
      if (i < bikeRoads.length) {
        raf = requestAnimationFrame(drawBatch)
      }
    }

    drawBatch()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearRoads()
    }
  }, [showBikePaths, bikeRoads, status])

  /** 지도 중심 기준 가장 가까운 하천/공원형 구간 하이라이트 */
  const focusNearestParkPath = () => {
    const map = mapRef.current
    if (!map || !window.kakao?.maps || !bikeRoads?.length) {
      setNearestHint('도로 데이터가 아직 없습니다.')
      return
    }

    const center = map.getCenter()
    const origin = { lat: center.getLat(), lng: center.getLng() }
    const parks = bikeRoads.filter((r) => r.type === '하천/공원형')
    if (!parks.length) {
      setNearestHint('하천/공원형 구간을 찾지 못했습니다.')
      return
    }

    let best: BikeRoadLine | null = null
    let bestDist = Infinity
    let bestPoint = origin

    for (const line of parks) {
      // 샘플 포인트로 근사 (전 점 스캔은 무거움 → 양 끝+중간)
      const pts = [
        line.path[0],
        line.path[Math.floor(line.path.length / 2)],
        line.path[line.path.length - 1],
      ]
      for (const p of pts) {
        const d = getDistanceMeters(origin, p)
        if (d < bestDist) {
          bestDist = d
          best = line
          bestPoint = p
        }
      }
    }

    if (!best) return

    const maps = window.kakao.maps
    highlightRef.current?.setMap(null)
    const pathLatLng = best.path.map((p) => new maps.LatLng(p.lat, p.lng))
    highlightRef.current = new maps.Polyline({
      map,
      path: pathLatLng,
      strokeWeight: 7,
      strokeColor: '#16a34a',
      strokeOpacity: 1,
      strokeStyle: 'solid',
    })

    map.setCenter(new maps.LatLng(bestPoint.lat, bestPoint.lng))
    if (map.getLevel() > 5) map.setLevel(5)
    setNearestHint(`가장 가까운 하천/공원형 · 약 ${formatDistance(bestDist)}`)
  }

  const roadCount = bikeRoads?.length ?? 0
  const layerHint = [
    showStations ? `대여소 ${stations.length}` : null,
    showBikePaths
      ? bikeRoads
        ? `도로 ${roadCount}구간`
        : '도로 로딩…'
      : null,
    `줌 ${zoomLevel}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={['relative overflow-hidden bg-slate-200', className].filter(Boolean).join(' ')}>
      <div ref={containerRef} className="h-full w-full" />

      {/* 좌측 하단: 최근접 하천/공원형 */}
      {status === 'ready' && (
        <div className="absolute bottom-12 left-3 z-20">
          <button
            type="button"
            onClick={focusNearestParkPath}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700"
          >
            가까운 하천/공원형
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
          <p className="text-sm font-medium text-blue-600">지도를 불러오는 중…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 px-6 text-center">
          <p className="text-sm font-semibold text-red-600">지도 로드 실패</p>
          <p className="max-w-sm text-xs text-slate-600">{errorMsg}</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[75%] rounded-lg bg-white/90 px-2 py-1 text-[11px] text-slate-600 shadow">
          <div>{layerHint || '레이어 꺼짐'}</div>
          {showBikePaths && (
            <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
              <span className="text-emerald-600">● 하천/공원형</span>
              <span className="text-red-500">● 도로변형</span>
              <span className="text-slate-400">● 기타</span>
            </div>
          )}
          {nearestHint && (
            <div className="mt-0.5 text-[10px] font-medium text-emerald-700">{nearestHint}</div>
          )}
          {roadError && (
            <div className="mt-0.5 text-[10px] text-red-600">도로: {roadError}</div>
          )}
        </div>
      )}
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
