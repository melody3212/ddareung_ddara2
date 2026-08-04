import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CourseList, coursesApi } from '../features/courses'
import { KakaoMap, MapButtons } from '../features/map'
import { stationsApi } from '../features/stations'
import {
  RidingScoreCard,
  WeatherCompact,
  WeatherDetails,
  weatherApi,
} from '../features/weather'
import { useUiStore } from '../shared/store/uiStore'
import { BottomNav } from '../shared/ui/BottomNav'
import { BottomSheet } from '../shared/ui/BottomSheet'

type SheetTab = 'weather' | 'courses'

export function HomePage() {
  const { showStations, showBikePaths, showSlope, sheetSnap } = useUiStore()
  const [locationRequestId, setLocationRequestId] = useState(0)
  const [sheetTab, setSheetTab] = useState<SheetTab>('weather')

  const stationsQ = useQuery({
    queryKey: ['stations'],
    queryFn: stationsApi.list,
    staleTime: 60_000,
  })
  const weatherQ = useQuery({
    queryKey: ['weather'],
    queryFn: () => weatherApi.get(),
    staleTime: 5 * 60_000,
  })
  const coursesQ = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesApi.list(),
  })
  const stationsMetaQ = useQuery({
    queryKey: ['stations-meta'],
    queryFn: stationsApi.meta,
    staleTime: 60_000,
  })

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-slate-100">
      <KakaoMap
        showStations={showStations}
        showBikePaths={showBikePaths}
        showSlope={showSlope}
        stations={stationsQ.data}
        locationRequestId={locationRequestId}
        className="absolute inset-0 h-full w-full"
      />

      <MapButtons onMyLocation={() => setLocationRequestId((n) => n + 1)} />

      {/* 좌상단 정보 — 한 줄로 겹침 최소화 */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-5.5rem)] flex-col gap-1.5">
        {stationsMetaQ.data && (
          <div className="w-fit rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
            대여소 {stationsMetaQ.data.count}곳 · {stationsMetaQ.data.source}
          </div>
        )}
        <Link
          to="/search-route"
          className="pointer-events-auto w-fit rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md hover:bg-blue-700"
        >
          길찾기
        </Link>
      </div>

      {stationsQ.isError && (
        <div className="absolute left-3 right-14 top-20 z-20 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600 shadow">
          API 연결 실패 — backend 실행 여부를 확인하세요.
        </div>
      )}

      <BottomSheet>
        {weatherQ.isLoading && (
          <p className="py-2 text-center text-sm text-slate-500">날씨 불러오는 중…</p>
        )}
        {weatherQ.isError && (
          <p className="py-2 text-center text-sm text-red-500">
            날씨 API 실패 — 백엔드 실행 여부를 확인하세요.
          </p>
        )}

        {weatherQ.data && sheetSnap === 'collapsed' && (
          <WeatherCompact weather={weatherQ.data} />
        )}

        {weatherQ.data && sheetSnap !== 'collapsed' && (
          <div className="space-y-3">
            <RidingScoreCard weather={weatherQ.data} />

            <div
              className="flex rounded-xl bg-slate-100 p-1"
              role="tablist"
              aria-label="바텀시트 내용"
            >
              <TabButton
                active={sheetTab === 'weather'}
                onClick={() => setSheetTab('weather')}
                label="날씨"
              />
              <TabButton
                active={sheetTab === 'courses'}
                onClick={() => setSheetTab('courses')}
                label="추천코스"
              />
            </div>

            {sheetTab === 'weather' && <WeatherDetails weather={weatherQ.data} />}
            {sheetTab === 'courses' && (
              <CourseList courses={coursesQ.data ?? []} />
            )}
          </div>
        )}
      </BottomSheet>

      <BottomNav />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 rounded-lg py-2 text-sm font-semibold transition',
        active
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
