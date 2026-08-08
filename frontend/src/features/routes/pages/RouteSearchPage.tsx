import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { analyzeBikeRoadCoverage, loadBikeRoads } from '../../bike-roads'
import { KakaoMap } from '../../map'
import type { SelectedPlace } from '../../places'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { routesApi } from '../api'
import { RouteResultCard } from '../components/RouteResultCard'
import { RouteSearchForm } from '../components/RouteSearchForm'
import { saveNavSession } from '../navSession'
import { loadPreferences } from '../../profile/preferencesStorage'
import { ROUTE_PRESETS } from '../presets'
import type { RouteMode, RoutePreference, RouteSearchResult } from '../types'

const DEFAULT = ROUTE_PRESETS[0]

/** 라이딩 구간 path 추출 (따릉이는 bike leg만) */
function bikePathOf(route: RouteSearchResult): number[][] {
  const bikeLegs = route.legs?.filter((l) => l.kind === 'bike') ?? []
  if (bikeLegs.length > 0) {
    const merged: number[][] = []
    for (const leg of bikeLegs) {
      if (!leg.path?.length) continue
      if (!merged.length) merged.push(...leg.path)
      else merged.push(...leg.path.slice(1))
    }
    if (merged.length >= 2) return merged
  }
  return route.path
}

async function enrichWithBikeRoadShare(
  routes: RouteSearchResult[],
): Promise<RouteSearchResult[]> {
  try {
    const roads = await loadBikeRoads()
    return routes.map((r) => {
      const path = bikePathOf(r)
      const cov = analyzeBikeRoadCoverage(path, roads)
      return {
        ...r,
        bike_road_share: {
          on_bike_road_pct: cov.on_bike_road_pct,
          off_bike_road_pct: cov.off_bike_road_pct,
          on_bike_road_m: cov.on_bike_road_m,
          off_bike_road_m: cov.off_bike_road_m,
          dedicated_pct: cov.dedicated_pct,
          shared_road_pct: cov.shared_road_pct,
        },
      }
    })
  } catch {
    return routes
  }
}

function placeFromParams(
  lat: string | null,
  lng: string | null,
  name: string | null,
): SelectedPlace | null {
  if (lat == null || lng == null) return null
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  return {
    name: name?.trim() || '선택한 지점',
    lat: la,
    lng: ln,
    address: null,
  }
}

export function RouteSearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoSearchDone = useRef(false)

  const fromQueryOrigin = placeFromParams(
    searchParams.get('olat'),
    searchParams.get('olng'),
    searchParams.get('oname'),
  )
  const fromQueryDest = placeFromParams(
    searchParams.get('dlat'),
    searchParams.get('dlng'),
    searchParams.get('dname'),
  )
  const courseId = searchParams.get('courseId')
  const wantAutoSearch = searchParams.get('autosearch') === '1'

  const [origin, setOrigin] = useState<SelectedPlace | null>(
    () => fromQueryOrigin ?? DEFAULT.origin,
  )
  const [destination, setDestination] = useState<SelectedPlace | null>(
    () => fromQueryDest ?? DEFAULT.destination,
  )
  const [mode, setMode] = useState<RouteMode>(
    () => loadPreferences().defaultRouteMode,
  )
  const [preference, setPreference] = useState<RoutePreference>('safe')
  const [routes, setRoutes] = useState<RouteSearchResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startNavigation = (route: RouteSearchResult) => {
    if (!route.path?.length) {
      alert('경로 좌표가 없습니다.')
      return
    }
    if (!route.steps?.length && !route.legs?.some((l) => l.steps?.length)) {
      // steps 없어도 경로 추적은 가능
    }
    saveNavSession(route, {
      originName: origin?.name,
      destinationName: destination?.name,
    })
    navigate('/navigate')
  }

  const searchM = useMutation({
    mutationFn: async (places?: {
      origin: SelectedPlace
      destination: SelectedPlace
    }) => {
      const o = places?.origin ?? origin
      const d = places?.destination ?? destination
      if (!o || !d) {
        throw new Error('출발·도착 장소를 선택하세요')
      }
      const data = await routesApi.search({
        origin: { lat: o.lat, lng: o.lng },
        destination: { lat: d.lat, lng: d.lng },
        mode,
        preference,
      })
      const enriched = await enrichWithBikeRoadShare(data.routes)
      return { ...data, routes: enriched }
    },
    onSuccess: (data) => {
      setError(null)
      setRoutes(data.routes)
      setSelectedId(data.routes[0]?.route_id ?? null)
    },
    onError: (e) => {
      setRoutes([])
      setSelectedId(null)
      setError(e instanceof Error ? e.message : String(e))
    },
  })

  // 추천코스 등에서 쿼리로 진입 시 1회 자동 검색
  useEffect(() => {
    if (autoSearchDone.current) return
    if (!wantAutoSearch || !fromQueryOrigin || !fromQueryDest) return
    autoSearchDone.current = true
    setOrigin(fromQueryOrigin)
    setDestination(fromQueryDest)
    searchM.mutate({
      origin: fromQueryOrigin,
      destination: fromQueryDest,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once from query
  }, [])

  const selected = useMemo(
    () => routes.find((r) => r.route_id === selectedId) ?? routes[0] ?? null,
    [routes, selectedId],
  )

  const routeOverlay = useMemo(() => {
    if (!selected) return null
    return {
      path: selected.path,
      segments: selected.segments,
      legs: selected.legs?.map((l) => ({ kind: l.kind, path: l.path })),
      fitBounds: true,
    }
  }, [selected])

  const onUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({
          name: '현재 위치',
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          address: null,
        })
      },
      () => alert('위치 정보를 불러올 수 없습니다.'),
    )
  }

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-100">
      {/* 상단 지도 — 앱 폭 안에서만 */}
      <div className="relative h-[32vh] min-h-[180px] max-h-[280px] w-full shrink-0">
        <KakaoMap
          showStations={mode === 'ddareung'}
          showBikePaths={false}
          showSlope={false}
          routeOverlay={routeOverlay}
          compact
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          <Link
            to="/home"
            className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow"
          >
            ← 홈
          </Link>
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow">
            길찾기
          </span>
        </div>
        {(origin || destination) && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
            {origin?.name ?? '출발?'} → {destination?.name ?? '도착?'}
            {courseId ? ` · 코스#${courseId}` : ''}
          </div>
        )}
      </div>

      {/* 하단 패널 */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-20 pt-3">
        {courseId && (
          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
            추천코스 출발·도착으로 채웠습니다. 실제 도로는 경로 검색으로
            다시 계산됩니다.
          </div>
        )}

        <RouteSearchForm
          origin={origin}
          destination={destination}
          mode={mode}
          preference={preference}
          loading={searchM.isPending}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onModeChange={setMode}
          onPreferenceChange={setPreference}
          onSearch={() => searchM.mutate(undefined)}
          onSwap={() => {
            setOrigin(destination)
            setDestination(origin)
          }}
          onUseMyLocation={onUseMyLocation}
        />

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
            검색 실패 — 장소 선택과 백엔드 실행 여부를 확인하세요.
            <p className="mt-1 line-clamp-2 opacity-80">{error}</p>
          </div>
        )}

        {routes.length > 0 && (
          <div className="mt-4 space-y-2 pb-4">
            <p className="text-xs font-semibold text-slate-600">
              {origin?.name} → {destination?.name} · 경로 {routes.length}개
            </p>
            {routes.map((r) => (
              <RouteResultCard
                key={r.route_id}
                route={r}
                selected={r.route_id === selected?.route_id}
                onSelect={() => setSelectedId(r.route_id)}
                onStartNav={
                  r.route_id === selected?.route_id
                    ? () => startNavigation(r)
                    : undefined
                }
              />
            ))}

            {selected && (
              <button
                type="button"
                onClick={() => startNavigation(selected)}
                className="sticky bottom-2 z-10 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-700"
              >
                선택한 경로로 길안내 시작
                {selected.steps?.length
                  ? ` · ${selected.steps.length}단계`
                  : ''}
              </button>
            )}

            {selected?.notes && selected.notes.length > 1 && (
              <ul className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
                {selected.notes.map((n, i) => (
                  <li key={i} className="list-inside list-disc">
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!routes.length && !error && !searchM.isPending && (
          <p className="mt-6 text-center text-xs text-slate-400">
            장소·상호명을 검색해 출발·도착을 고른 뒤
            <br />
            경로 검색을 눌러 보세요. 경사 %도 함께 표시됩니다.
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
