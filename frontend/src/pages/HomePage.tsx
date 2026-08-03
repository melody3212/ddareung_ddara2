import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useUiStore, type MapMode } from '../store/uiStore'
import { BottomNav } from '../components/BottomNav'
import { KakaoMap } from '../components/KakaoMap'

const modes: { id: MapMode; label: string }[] = [
  { id: 'personal', label: '개인' },
  { id: 'ddareung', label: '따릉이' },
  { id: 'road', label: '도로' },
  { id: 'route', label: '길찾기' },
]

export function HomePage() {
  const { mapMode, setMapMode, bottomSheetOpen, setBottomSheetOpen } = useUiStore()

  const stationsQ = useQuery({ queryKey: ['stations'], queryFn: api.stations })
  const weatherQ = useQuery({ queryKey: ['weather'], queryFn: () => api.weather() })
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() })
  const pathsQ = useQuery({ queryKey: ['bike-paths'], queryFn: api.bikePaths })

  return (
    <div className="relative min-h-full bg-slate-100 pb-16">
      <div className="absolute left-0 right-0 top-0 z-20 flex justify-center gap-1 p-3">
        <div className="flex rounded-full bg-white/95 p-1 shadow">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMapMode(m.id)}
              className={[
                'rounded-full px-3 py-1.5 text-sm font-medium',
                mapMode === m.id ? 'bg-blue-500 text-white' : 'text-slate-600',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <KakaoMap
        mode={mapMode}
        stations={stationsQ.data}
        bikePaths={pathsQ.data}
        className="h-[58vh] min-h-[320px] w-full"
      />

      {stationsQ.isError && (
        <div className="absolute left-3 right-3 top-16 z-20 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600 shadow">
          API 연결 실패 — backend를 실행하면 대여소·날씨·코스가 표시됩니다.
        </div>
      )}

      <div
        className={[
          'relative z-10 -mt-4 rounded-t-3xl bg-white shadow-xl transition-all',
          bottomSheetOpen ? 'min-h-[38vh]' : 'min-h-[72px]',
        ].join(' ')}
      >
        <button
          type="button"
          className="flex w-full flex-col items-center pt-2"
          onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
        >
          <span className="mb-2 h-1 w-10 rounded-full bg-slate-300" />
        </button>

        <div className="px-4 pb-6">
          {weatherQ.data && (
            <div className="mb-4 rounded-2xl bg-blue-50 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">라이딩 점수</p>
                  <p className="text-3xl font-bold text-blue-700">{weatherQ.data.score}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>
                    {weatherQ.data.temp_c}°C · 체감 {weatherQ.data.feels_like_c}°C
                  </p>
                  <p>미세먼지 {weatherQ.data.pm10_label}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700">{weatherQ.data.message}</p>
            </div>
          )}

          {bottomSheetOpen && (
            <>
              <h2 className="mb-3 text-base font-bold text-slate-800">추천 여가 코스</h2>
              <ul className="space-y-2">
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
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
