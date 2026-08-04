/**
 * 지도 본체 — 원본 MapPage 동작 이식
 * 참고: https://github.com/melody3212/ddareung-ddara/blob/main/frontend/src/pages/MapPage.jsx
 */
import { useEffect, useRef, useState } from 'react'
import markerImgUrl from '../assets/images/ddareungMarker.png'
import { loadKakaoMaps } from '../lib/loadKakaoMap'
import { api, type ElevationProfile, type Station } from '../lib/api'
import {
  courseTypeColor,
  loadBikeRoads,
  type BikeRoadLine,
} from '../lib/bikeRoad'
import { formatDistance, getDistanceMeters } from '../lib/geo'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

/** 지도 중심 근처 도로만 경사 분석 (성능) */
const SLOPE_NEAR_M = 1800
const SLOPE_MAX_ROADS = 36
const SLOPE_MIN_PATH_POINTS = 2

type Props = {
  showStations: boolean
  showBikePaths: boolean
  /** 급경사 구간을 붉은색 계열로 강조 */
  showSlope?: boolean
  stations?: Station[]
  className?: string
  /** 부모에서 내 위치 요청 시 증가/변경 */
  locationRequestId?: number
}

export function KakaoMap({
  showStations,
  showBikePaths,
  showSlope = false,
  stations = [],
  className,
  locationRequestId = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylinesRef = useRef<kakao.maps.Polyline[]>([])
  const slopeLinesRef = useRef<kakao.maps.Polyline[]>([])
  const recommendLineRef = useRef<kakao.maps.Polyline | null>(null)
  const myLocMarkerRef = useRef<kakao.maps.Marker | null>(null)
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null)
  const markerImageRef = useRef<kakao.maps.MarkerImage | null>(null)
  const didFitStationsRef = useRef(false)
  const centerRef = useRef(SEOUL_CENTER)
  const slopeCacheRef = useRef<Map<number, ElevationProfile>>(new Map())

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bikeRoads, setBikeRoads] = useState<BikeRoadLine[] | null>(null)
  const [roadError, setRoadError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(4)
  const [recommendHint, setRecommendHint] = useState<string | null>(null)
  const [slopeHint, setSlopeHint] = useState<string | null>(null)
  const [slopeLoading, setSlopeLoading] = useState(false)
  const [slopeTick, setSlopeTick] = useState(0)

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
        // 경사 레이어: 지도 이동 후 잠시 멈출 때 재분석
        let idleTimer: number | undefined
        maps.event.addListener(map, 'idle', () => {
          window.clearTimeout(idleTimer)
          idleTimer = window.setTimeout(() => setSlopeTick((n) => n + 1), 450)
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
      clearSlopeLines()
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

  function clearSlopeLines() {
    slopeLinesRef.current.forEach((p) => p.setMap(null))
    slopeLinesRef.current = []
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

  // 자전거도로 (경사 토글 ON이면 타입 색을 옅게 깔고, 경사 세그먼트를 위에 그림)
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
    const opacity = showSlope ? 0.18 : 0.45

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
          strokeOpacity: opacity,
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
  }, [showBikePaths, showSlope, bikeRoads, status])

  // 경사도 레이어 — 지도 중심 근처 도로 고도 분석 후 구간 색칠
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !window.kakao?.maps) return

    clearSlopeLines()
    if (!showSlope || !bikeRoads?.length) {
      setSlopeHint(null)
      setSlopeLoading(false)
      return
    }

    let cancelled = false
    const { lat: cLat, lng: cLng } = centerRef.current

    type Cand = { index: number; road: BikeRoadLine; dist: number }
    const cands: Cand[] = []
    for (let idx = 0; idx < bikeRoads.length; idx++) {
      const road = bikeRoads[idx]
      if (!road.path || road.path.length < SLOPE_MIN_PATH_POINTS) continue
      // 도로 중점 기준 거리
      const mid = road.path[Math.floor(road.path.length / 2)] ?? road.path[0]
      const dist = getDistanceMeters({ lat: cLat, lng: cLng }, mid)
      if (dist > SLOPE_NEAR_M) continue
      cands.push({ index: idx, road, dist })
    }
    cands.sort((a, b) => a.dist - b.dist)
    const picked = cands.slice(0, SLOPE_MAX_ROADS)

    if (!picked.length) {
      setSlopeHint('이 위치 근처 도로 없음 · 지도를 이동해 보세요')
      return
    }

    const uncached = picked.filter((p) => !slopeCacheRef.current.has(p.index))

    async function run() {
      setSlopeLoading(true)
      try {
        if (uncached.length) {
          const paths = uncached.map((p) => ({
            path_id: p.index,
            coordinates: p.road.path.map((pt) => [pt.lng, pt.lat]),
          }))
          const res = await api.elevationBatch(paths, 12)
          if (cancelled) return
          for (const profile of res.profiles) {
            const id = Number(profile.path_id)
            if (Number.isFinite(id)) slopeCacheRef.current.set(id, profile)
          }
        }
        if (cancelled || !mapRef.current || !window.kakao?.maps) return

        const maps = window.kakao.maps
        clearSlopeLines()
        let steepSegs = 0
        let maxGrade = 0
        let drawn = 0

        for (const { index } of picked) {
          const profile = slopeCacheRef.current.get(index)
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
              strokeWeight: seg.is_steep ? 7 : 5,
              strokeColor: seg.color || '#ef4444',
              strokeOpacity: seg.is_steep ? 0.95 : 0.75,
              strokeStyle: 'solid',
              zIndex: seg.is_steep ? 4 : 3,
            })
            slopeLinesRef.current.push(line)
            drawn += 1
          }
        }

        setSlopeHint(
          `경사 분석 ${picked.length}개 도로 · 급경사 구간 ${steepSegs} · 최대 ${maxGrade.toFixed(1)}%` +
            (drawn ? '' : ' · 데이터 없음'),
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
      clearSlopeLines()
    }
  }, [showSlope, bikeRoads, status, slopeTick])

  const roadCount = bikeRoads?.length ?? 0
  const layerHint = [
    showStations ? `대여소 ${stations.length}` : null,
    showBikePaths ? (bikeRoads ? `도로 ${roadCount}` : '도로 로딩…') : null,
    showSlope ? (slopeLoading ? '경사 분석 중…' : '경사 ON') : null,
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
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[80%] rounded-lg bg-white/90 px-2 py-1 text-[11px] text-slate-600 shadow">
          <div>{layerHint || '레이어 꺼짐'}</div>
          {showBikePaths && !showSlope && (
            <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
              <span style={{ color: 'green' }}>● 하천/공원형</span>
              <span style={{ color: 'gray' }}>● 도로변형</span>
              <span style={{ color: 'red' }}>● 기타</span>
              <span style={{ color: 'blue' }}>━ 추천</span>
            </div>
          )}
          {showSlope && (
            <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
              <span style={{ color: '#22c55e' }}>● &lt;2%</span>
              <span style={{ color: '#eab308' }}>● 2–4%</span>
              <span style={{ color: '#f97316' }}>● 4–6%</span>
              <span style={{ color: '#ef4444' }}>● 6–8%</span>
              <span style={{ color: '#991b1b' }}>● ≥8%</span>
            </div>
          )}
          {recommendHint && (
            <div className="mt-0.5 text-[10px] font-medium text-blue-700">{recommendHint}</div>
          )}
          {slopeHint && (
            <div className="mt-0.5 text-[10px] font-medium text-red-700">{slopeHint}</div>
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
