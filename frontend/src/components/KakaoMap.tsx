import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../lib/loadKakaoMap'
import { api, type BikePath, type BikePathMeta, type Station } from '../lib/api'

/** mock 폴리라인 통일 색 (Safemap 키 없을 때만) */
const MOCK_PATH_COLOR = '#22c55e'
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

type Props = {
  showStations: boolean
  showBikePaths: boolean
  stations?: Station[]
  bikePaths?: BikePath[]
  className?: string
}

export function KakaoMap({
  showStations,
  showBikePaths,
  stations = [],
  bikePaths = [],
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const groundOverlayRef = useRef<kakao.maps.GroundOverlay | null>(null)
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)
  const didFitStationsRef = useRef(false)
  const idleTimerRef = useRef<number | null>(null)
  const showBikePathsRef = useRef(showBikePaths)
  const useWmsRef = useRef(false)
  const wmsReqIdRef = useRef(0)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pathMeta, setPathMeta] = useState<BikePathMeta | null>(null)
  const [wmsError, setWmsError] = useState<string | null>(null)

  showBikePathsRef.current = showBikePaths
  useWmsRef.current = Boolean(pathMeta?.configured)

  // Init map once
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
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      markersRef.current.forEach((m) => m.setMap(null))
      polylinesRef.current.forEach((p) => p.setMap(null))
      groundOverlayRef.current?.setMap(null)
      markersRef.current = []
      polylinesRef.current = []
      groundOverlayRef.current = null
      mapRef.current = null
    }
  }, [])

  // meta
  useEffect(() => {
    let cancelled = false
    api
      .bikePathsMeta()
      .then((m) => {
        if (!cancelled) setPathMeta(m)
      })
      .catch(() => {
        if (!cancelled) {
          setPathMeta({
            source: 'mock',
            configured: false,
            layer: null,
            note: '메타 조회 실패 — mock 사용',
            docs_url: 'https://www.safemap.go.kr/opna/data/dataViewRenew.do?objtId=219',
          })
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

    if (!didFitStationsRef.current && stations.length > 0) {
      map.setBounds(bounds, 48)
      didFitStationsRef.current = true
    }
  }, [stations, showStations, status])

  const clearPathLayers = () => {
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []
    groundOverlayRef.current?.setMap(null)
    groundOverlayRef.current = null
  }

  const refreshWmsOverlay = () => {
    const map = mapRef.current
    if (!map || !window.kakao?.maps) return
    if (!showBikePathsRef.current || !useWmsRef.current) return

    const b = map.getBounds()
    const sw = b.getSouthWest()
    const ne = b.getNorthEast()
    const minx = sw.getLng()
    const miny = sw.getLat()
    const maxx = ne.getLng()
    const maxy = ne.getLat()

    const url = api.bikePathsWmsUrl({
      minx,
      miny,
      maxx,
      maxy,
      width: 768,
      height: 768,
    })

    const reqId = ++wmsReqIdRef.current
    const img = new Image()
    img.onload = () => {
      if (reqId !== wmsReqIdRef.current) return
      if (!mapRef.current || !showBikePathsRef.current || !useWmsRef.current) return

      groundOverlayRef.current?.setMap(null)
      const lb = new window.kakao.maps.LatLngBounds()
      lb.extend(new window.kakao.maps.LatLng(miny, minx))
      lb.extend(new window.kakao.maps.LatLng(maxy, maxx))

      const overlay = new window.kakao.maps.GroundOverlay(url, lb, { opacity: 0.85 })
      overlay.setMap(mapRef.current)
      groundOverlayRef.current = overlay
      setWmsError(null)
    }
    img.onerror = () => {
      if (reqId !== wmsReqIdRef.current) return
      setWmsError('자전거길 WMS 로드 실패 — 키·사용신청·네트워크 확인')
    }
    img.src = url
  }

  // idle listener once (uses refs for toggle/mode)
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    const onIdle = () => {
      if (!showBikePathsRef.current || !useWmsRef.current) return
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(refreshWmsOverlay, 280)
    }

    window.kakao.maps.event.addListener(map, 'idle', onIdle)
  }, [status])

  // 자전거 도로 토글 / meta / mock data
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    clearPathLayers()
    setWmsError(null)

    if (!showBikePaths) return

    if (pathMeta?.configured) {
      refreshWmsOverlay()
      return
    }

    // mock 폴리라인 폴백
    const maps = window.kakao.maps
    bikePaths.forEach((path) => {
      const pathLatLng = path.coordinates.map(
        ([lng, lat]) => new maps.LatLng(lat, lng),
      )
      const line = new maps.Polyline({
        map,
        path: pathLatLng,
        strokeWeight: 5,
        strokeColor: MOCK_PATH_COLOR,
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
      })
      polylinesRef.current.push(line)
    })
  }, [showBikePaths, pathMeta?.configured, bikePaths, status])

  const layerHint = [
    showStations ? `대여소 ${stations.length}` : null,
    showBikePaths
      ? pathMeta?.configured
        ? '도로(생활안전지도 WMS)'
        : `도로 mock ${bikePaths.length}`
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
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[72%] rounded-lg bg-white/90 px-2 py-1 text-[11px] text-slate-600 shadow">
          <div>{layerHint || '레이어 꺼짐'}</div>
          {showBikePaths && pathMeta && !pathMeta.configured && (
            <div className="mt-0.5 text-[10px] text-amber-700">
              SAFEMAP 키 없음 → mock. 키 발급 후 backend/.env 에 SAFEMAP_SERVICE_KEY
            </div>
          )}
          {wmsError && <div className="mt-0.5 text-[10px] text-red-600">{wmsError}</div>}
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
