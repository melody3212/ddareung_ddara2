import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../lib/loadKakaoMap'
import type { BikePath, Station } from '../lib/api'
import type { MapMode } from '../store/uiStore'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

type Props = {
  mode: MapMode
  stations?: Station[]
  bikePaths?: BikePath[]
  className?: string
}

export function KakaoMap({ mode, stations = [], bikePaths = [], className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const t = window.setTimeout(() => map.relayout(), 100)
    return () => window.clearTimeout(t)
  }, [status, className])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()

    const showStations = mode === 'ddareung' || mode === 'personal'
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
        const count =
          s.bike_count != null ? `잔여 ${s.bike_count}대` : '잔여 정보 없음'
        const iw = infoRef.current
        if (iw) {
          iw.setContent(
            `<div style="padding:8px 10px;font-size:12px;min-width:120px;line-height:1.4;">
              <strong>${escapeHtml(s.name)}</strong><br/>
              <span style="color:#64748b">${escapeHtml(count)}</span>
            </div>`,
          )
          iw.open(map, marker)
        }
      })
      markersRef.current.push(marker)
    })

    if (stations.length > 0) {
      map.setBounds(bounds, 48)
    }
  }, [stations, mode, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const maps = window.kakao.maps
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []

    const showPaths = mode === 'road' || mode === 'personal' || mode === 'ddareung'
    if (!showPaths || bikePaths.length === 0) return

    bikePaths.forEach((path) => {
      const pathLatLng = path.coordinates.map(
        ([lng, lat]) => new maps.LatLng(lat, lng),
      )
      const color =
        path.grade === 'easy' ? '#22c55e' : path.grade === 'hard' ? '#f59e0b' : '#3b82f6'
      const line = new maps.Polyline({
        map,
        path: pathLatLng,
        strokeWeight: 5,
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeStyle: 'solid',
      })
      polylinesRef.current.push(line)
    })
  }, [bikePaths, mode, status])

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
          <p className="max-w-sm text-xs text-slate-500">
            카카오 개발자 콘솔 → 앱 → 플랫폼 → Web 에{' '}
            <code className="rounded bg-white px-1">http://localhost:5173</code> 등록 필요
          </p>
        </div>
      )}

      {status === 'ready' && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-[11px] text-slate-600 shadow">
          {mode === 'ddareung' && `따릉이 대여소 ${stations.length}곳`}
          {mode === 'road' && `자전거 도로 ${bikePaths.length}개`}
          {mode === 'personal' && `개인 · 대여소 ${stations.length} · 도로 ${bikePaths.length}`}
          {mode === 'route' && '길찾기 모드는 확장 예정'}
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
