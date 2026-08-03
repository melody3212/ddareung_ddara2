/**
 * 지도 본체 — 원본 MapPage 동작 이식
 * 참고: https://github.com/melody3212/ddareung-ddara/blob/main/frontend/src/pages/MapPage.jsx
 */
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
  /** 부모에서 내 위치 요청 시 증가/변경 */
  locationRequestId?: number
}

export function KakaoMap({
  showStations,
  showBikePaths,
  stations = [],
  className,
  locationRequestId = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const recommendLineRef = useRef<kakao.maps.Polyline | null>(null)
  const myLocMarkerRef = useRef<kakao.maps.Marker | null>(null)
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)
  const markerImageRef = useRef<kakao.maps.MarkerImage | null>(null)
  const didFitStationsRef = useRef(false)
  const centerRef = useRef(SEOUL_CENTER)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bikeRoads, setBikeRoads] = useState<BikeRoadLine[] | null>(null)
  const [roadError, setRoadError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(4)
  const [recommendHint, setRecommendHint] = useState<string | null>(null)

  // Init map
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setStatus('loading')
        const maps = await loadKakaoMaps()
        if (cancelled || !containerRef.current) return

        const center = new maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
        // 원본 level={4}
        const map = new maps.Map(containerRef.current, {
          center,
          level: 4,
        })
        mapRef.current = map
        infoRef.current = new maps.InfoWindow({ zIndex: 3 })

        markerImageRef.current = new maps.MarkerImage(
          markerImgUrl,
          new maps.Size(25, 20),
          { offset: new maps.Point(12, 12) },
        )

        if (typeof maps.MarkerClusterer === 'function') {
          clustererRef.current = new maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 6,
            gridSize: 60,
          })
        }

        // 현재 위치 마커 (원본 MapMarker position={center})
        myLocMarkerRef.current = new maps.Marker({
          map,
          position: center,
          zIndex: 2,
        })

        maps.event.addListener(map, 'zoom_changed', () => {
          setZoomLevel(map.getLevel())
        })
        maps.event.addListener(map, 'center_changed', () => {
          const c = map.getCenter()
          centerRef.current = { lat: c.getLat(), lng: c.getLng() }
        })
        maps.event.addListener(map, 'click', () => {
          infoRef.current?.close()
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
      recommendLineRef.current?.setMap(null)
      myLocMarkerRef.current?.setMap(null)
      clustererRef.current?.setMap(null)
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // GeoJSON
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

  // 내 위치 요청
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
        // 추천 경로 갱신
        updateRecommendedPath(lat, lng)
      },
      (err) => {
        console.error(err)
        alert('위치 정보를 불러올 수 없습니다.')
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRequestId, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const t = window.setTimeout(() => map.relayout(), 100)
    return () => window.clearTimeout(t)
  }, [status, className])

  function clearStations() {
    clustererRef.current?.clear()
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()
  }

  function clearRoads() {
    polylinesRef.current.forEach((p) => p.setMap(null))
    polylinesRef.current = []
  }

  /** 원본: center 기준 가장 가까운 하천/공원형 → 파란 dash Polyline */
  function updateRecommendedPath(lat: number, lng: number) {
    const map = mapRef.current
    if (!map || !window.kakao?.maps || !bikeRoads?.length) return

    const riverPark = bikeRoads.filter((item) => item.type === '하천/공원형')
    if (!riverPark.length) {
      setRecommendHint(null)
      recommendLineRef.current?.setMap(null)
      return
    }

    let best: BikeRoadLine | null = null
    let bestDist = Infinity
    for (const cur of riverPark) {
      const p0 = cur.path[0]
      if (!p0) continue
      const dist = getDistanceMeters({ lat, lng }, p0)
      if (dist < bestDist) {
        bestDist = dist
        best = cur
      }
    }
    if (!best) return

    const maps = window.kakao.maps
    recommendLineRef.current?.setMap(null)
    const pathLatLng = best.path.map((p) => new maps.LatLng(p.lat, p.lng))
    recommendLineRef.current = new maps.Polyline({
      map,
      path: pathLatLng,
      strokeWeight: 6,
      strokeColor: 'blue',
      strokeOpacity: 1,
      strokeStyle: 'dash',
    })
    setRecommendHint(`추천(하천/공원형) · 약 ${formatDistance(bestDist)}`)
  }

  // 도로 로드 후 / 중심 기준 추천 (원본 useEffect [center, bikePaths])
  useEffect(() => {
    if (status !== 'ready' || !bikeRoads?.length) return
    const { lat, lng } = centerRef.current
    updateRecommendedPath(lat, lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bikeRoads, status])

  // 대여소 + 클러스터
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
          s.bike_count != null ? `남은 자전거: ${s.bike_count} 대` : null,
          s.rack_tot_cnt != null ? `거치대 ${s.rack_tot_cnt}` : null,
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

    if (!didFitStationsRef.current && stations.length > 5) {
      // sample/소량일 때는 서울 전체 fit 안 함
      didFitStationsRef.current = true
    }
  }, [stations, showStations, status])

  // 자전거도로
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
      if (i < bikeRoads.length) raf = requestAnimationFrame(drawBatch)
    }
    drawBatch()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearRoads()
    }
  }, [showBikePaths, bikeRoads, status])

  const roadCount = bikeRoads?.length ?? 0
  const layerHint = [
    showStations ? `대여소 ${stations.length}` : null,
    showBikePaths ? (bikeRoads ? `도로 ${roadCount}` : '도로 로딩…') : null,
    `줌 ${zoomLevel}`,
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
              <span style={{ color: 'green' }}>● 하천/공원형</span>
              <span style={{ color: 'gray' }}>● 도로변형</span>
              <span style={{ color: 'red' }}>● 기타</span>
              <span style={{ color: 'blue' }}>━ 추천</span>
            </div>
          )}
          {recommendHint && (
            <div className="mt-0.5 text-[10px] font-medium text-blue-700">{recommendHint}</div>
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
