import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../lib/loadKakaoMap'
import type { Station } from '../lib/api'
import {
  courseTypeColor,
  loadBikeRoads,
  type BikeRoadLine,
} from '../lib/bikeRoad'

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
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)
  const didFitStationsRef = useRef(false)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bikeRoads, setBikeRoads] = useState<BikeRoadLine[] | null>(null)
  const [roadError, setRoadError] = useState<string | null>(null)

  // Init map
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
        infoRef.current = new maps.InfoWindow({ zIndex: 2 })
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
      markersRef.current.forEach((m) => m.setMap(null))
      polylinesRef.current.forEach((p) => p.setMap(null))
      markersRef.current = []
      polylinesRef.current = []
      mapRef.current = null
    }
  }, [])

  // GeoJSON 자전거도로 (원본과 동일 경로)
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

  // 따릉이 대여소
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()

    if (!showStations || stations.length === 0) return

    const bounds = new maps.LatLngBounds()
    stations.forEach((s) => {
      const pos = new maps.LatLng(s.lat, s.lng)
      bounds.extend(pos)
      const marker = new maps.Marker({
        map,
        position: pos,
        title: s.name,
      })
      maps.event.addListener(marker, 'click', () => {
        const lines = [
          s.bike_count != null ? `대여가능 ${s.bike_count}대` : null,
          s.rack_tot_cnt != null ? `거치대 ${s.rack_tot_cnt}` : null,
          s.shared != null ? `거치율 ${s.shared}%` : null,
        ].filter(Boolean)
        const iw = infoRef.current
        if (iw) {
          iw.setContent(
            `<div style="padding:8px 10px;font-size:12px;min-width:140px;line-height:1.4;">
              <strong>${escapeHtml(s.name)}</strong><br/>
              <span style="color:#64748b">${escapeHtml(lines.join(' · ') || '정보 없음')}</span>
            </div>`,
          )
          iw.open(map, marker)
        }
      })
      markersRef.current.push(marker)
    })

    if (!didFitStationsRef.current && stations.length > 0) {
      map.setBounds(bounds, 48)
      didFitStationsRef.current = true
    }
  }, [stations, showStations, status])

  // 자전거도로 Polyline (원본 MapPage 렌더 로직)
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []

    if (!showBikePaths || !bikeRoads?.length) return

    // 대량 라인: 한 프레임에 너무 많이 그리면 멈출 수 있어 배치 처리
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
      polylinesRef.current.forEach((p) => p.setMap(null))
      polylinesRef.current = []
    }
  }, [showBikePaths, bikeRoads, status])

  const roadCount = bikeRoads?.length ?? 0
  const layerHint = [
    showStations ? `대여소 ${stations.length}` : null,
    showBikePaths
      ? bikeRoads
        ? `도로 GeoJSON ${roadCount}구간`
        : '도로 로딩…'
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={['relative overflow-hidden bg-slate-200', className].filter(Boolean).join(' ')}>
      <div ref={containerRef} className="h-full w-full" />

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
          {roadError && (
            <div className="mt-0.5 text-[10px] text-red-600">도로 데이터: {roadError}</div>
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
