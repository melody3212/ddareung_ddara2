import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useUiStore } from '../store/uiStore'
import { BottomNav } from '../components/BottomNav'
import { BottomSheet } from '../components/BottomSheet'
import { KakaoMap } from '../components/KakaoMap'
import { MapButtons } from '../components/MapButtons'
import {
  CourseList,
  RidingScoreCard,
  WeatherCompact,
  WeatherDetails,
} from '../components/WeatherPanel'

type SheetTab = 'weather' | 'courses'

export function HomePage() {
  const { showStations, showBikePaths, sheetSnap } = useUiStore()
  const [locationRequestId, setLocationRequestId] = useState(0)
  const [sheetTab, setSheetTab] = useState<SheetTab>('weather')

  const stationsQ = useQuery({
    queryKey: ['stations'],
    queryFn: api.stations,
    staleTime: 60_000,
  })
  const weatherQ = useQuery({
    queryKey: ['weather'],
    queryFn: () => api.weather(),
    staleTime: 5 * 60_000,
  })
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() })
  const stationsMetaQ = useQuery({
    queryKey: ['stations-meta'],
    queryFn: api.stationsMeta,
    staleTime: 60_000,
  })

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-100">
      <KakaoMap
        showStations={showStations}
        showBikePaths={showBikePaths}
        stations={stationsQ.data}
        locationRequestId={locationRequestId}
        className="absolute inset-0 h-full w-full"
      />

      <MapButtons onMyLocation={() => setLocationRequestId((n) => n + 1)} />

      {stationsQ.isError && (
        <div className="absolute left-3 right-14 top-3 z-20 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600 shadow">
          API 연결 실패 — backend 실행 여부를 확인하세요.
        </div>
      )}

      {stationsMetaQ.data && (
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
          대여소 {stationsMetaQ.data.count}곳 · {stationsMetaQ.data.source}
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

        {/* 접힘: 요약만 */}
        {weatherQ.data && sheetSnap === 'collapsed' && (
          <WeatherCompact weather={weatherQ.data} />
        )}

        {/* 펼침: 점수 + 탭 */}
        {weatherQ.data && sheetSnap !== 'collapsed' && (
          <div className="space-y-3">
            <RidingScoreCard weather={weatherQ.data} />

            {/* 날씨 | 추천코스 */}
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
