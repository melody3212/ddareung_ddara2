import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useUiStore } from '../store/uiStore'
import { BottomNav } from '../components/BottomNav'
import { BottomSheet } from '../components/BottomSheet'
import { KakaoMap } from '../components/KakaoMap'
import { MapButtons, MyLocationButton } from '../components/MapButtons'

export function HomePage() {
  const { showStations, showBikePaths, sheetSnap } = useUiStore()
  const [locationRequestId, setLocationRequestId] = useState(0)

  const stationsQ = useQuery({
    queryKey: ['stations'],
    queryFn: api.stations,
    staleTime: 60_000,
  })
  const weatherQ = useQuery({ queryKey: ['weather'], queryFn: () => api.weather() })
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() })
  const stationsMetaQ = useQuery({
    queryKey: ['stations-meta'],
    queryFn: api.stationsMeta,
    staleTime: 60_000,
  })

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-100">
      {/* 지도: 전체 화면 (네비·시트 아래) */}
      <KakaoMap
        showStations={showStations}
        showBikePaths={showBikePaths}
        stations={stationsQ.data}
        locationRequestId={locationRequestId}
        className="absolute inset-0 h-full w-full"
      />

      {/* 우측: 도로 / 대여소 */}
      <MapButtons />

      {/* 우측 하단: 내 위치 */}
      <MyLocationButton onClick={() => setLocationRequestId((n) => n + 1)} />

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

      {/* 하단 플로팅 시트 (드래그 스냅) */}
      <BottomSheet>
        {weatherQ.data && (
          <div
            className={[
              'mb-3 rounded-2xl bg-blue-50 p-3',
              sheetSnap === 'collapsed' ? 'py-2' : '',
            ].join(' ')}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600">라이딩 점수</p>
                <p className="text-2xl font-bold text-blue-700">{weatherQ.data.score}</p>
              </div>
              {sheetSnap !== 'collapsed' && (
                <div className="text-right text-sm text-slate-600">
                  <p>
                    {weatherQ.data.temp_c}°C · 체감 {weatherQ.data.feels_like_c}°C
                  </p>
                  <p>미세먼지 {weatherQ.data.pm10_label}</p>
                </div>
              )}
            </div>
            {sheetSnap !== 'collapsed' && (
              <p className="mt-1 text-sm text-slate-700">{weatherQ.data.message}</p>
            )}
          </div>
        )}

        {sheetSnap !== 'collapsed' && (
          <>
            <h2 className="mb-2 text-base font-bold text-slate-800">추천 여가 코스</h2>
            <ul className="space-y-2 pb-2">
              {(coursesQ.data ?? []).map((c) => (
                <li
                  key={c.course_id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.distance_km}km · {c.duration_min}분 · {c.difficulty}
                      </p>
                      <p className="mt-1 text-xs text-blue-600">{c.tags.join(' ')}</p>
                    </div>
                    {c.rating != null && (
                      <span className="text-sm font-medium text-amber-600">★ {c.rating}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </BottomSheet>

      <BottomNav />
    </div>
  )
}
