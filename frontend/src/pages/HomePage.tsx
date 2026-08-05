import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CourseList,
  coursesApi,
  saveOfficialToMyCourses,
  useCourseActions,
  useCourseSelection,
  withOfficialSource,
  categoryLabel,
  type Course,
  type CourseCategory,
} from '../features/courses'
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
import { useToast } from '../features/rides'

type SheetTab = 'weather' | 'courses'

export function HomePage() {
  const { showStations, showBikePaths, showSlope, sheetSnap, setSheetSnap } =
    useUiStore()
  const [locationRequestId, setLocationRequestId] = useState(0)
  const [sheetTab, setSheetTab] = useState<SheetTab>('weather')
  const { startRoute, startRide } = useCourseActions()
  const { toast, showToast } = useToast()

  const selection = useCourseSelection({
    onSelectExtra: (course) => {
      if (course) {
        setSheetTab('courses')
        setSheetSnap('collapsed')
      }
    },
  })

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

  const recommendCourses = useMemo(
    () => withOfficialSource(coursesQ.data ?? []),
    [coursesQ.data],
  )

  const selectedCourse = selection.selected

  const handleSaveToMy = (course: Course, category: CourseCategory) => {
    try {
      saveOfficialToMyCourses(course, category)
      showToast(`내 코스(${categoryLabel(category)})에 담았습니다`, 2800)
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패')
    }
  }

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-slate-100">
      <KakaoMap
        showStations={selectedCourse ? false : showStations}
        showBikePaths={selectedCourse ? false : showBikePaths}
        showSlope={selectedCourse ? false : showSlope}
        stations={stationsQ.data}
        locationRequestId={locationRequestId}
        routeOverlay={selection.overlay}
        compact={Boolean(selectedCourse)}
        className="absolute inset-0 h-full w-full"
      />

      <MapButtons onMyLocation={() => setLocationRequestId((n) => n + 1)} />

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
        {selectedCourse && (
          <div className="pointer-events-auto flex w-fit max-w-full items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/95 px-2.5 py-1 text-[10px] font-semibold text-orange-900 shadow">
            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
            <span className="truncate">코스 · {selectedCourse.title}</span>
            <button
              type="button"
              className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-600 shadow-sm"
              onClick={() => {
                selection.refocus()
                setSheetSnap('collapsed')
              }}
            >
              다시 보기
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm"
              onClick={() => selection.clear()}
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {stationsQ.isError && (
        <div className="absolute left-3 right-14 top-20 z-20 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600 shadow">
          API 연결 실패 — backend 실행 여부를 확인하세요.
        </div>
      )}

      <BottomSheet>
        {sheetSnap === 'collapsed' && (
          <>
            {selectedCourse ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <p className="text-center text-xs font-medium text-orange-700">
                  {selectedCourse.title}
                </p>
                <button
                  type="button"
                  className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800"
                  onClick={() => setSheetSnap('half')}
                >
                  액션 열기
                </button>
              </div>
            ) : weatherQ.isLoading ? (
              <p className="py-2 text-center text-sm text-slate-500">
                날씨 불러오는 중…
              </p>
            ) : weatherQ.isError ? (
              <p className="py-2 text-center text-xs text-red-500">
                날씨 연결 실패 · 올려서 추천코스는 볼 수 있어요
              </p>
            ) : weatherQ.data ? (
              <WeatherCompact weather={weatherQ.data} />
            ) : null}
          </>
        )}

        {sheetSnap !== 'collapsed' && (
          <div className="space-y-3">
            {weatherQ.data ? (
              <RidingScoreCard weather={weatherQ.data} />
            ) : weatherQ.isLoading ? (
              <p className="py-2 text-center text-sm text-slate-500">
                라이딩 점수 불러오는 중…
              </p>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-3 py-3 text-center text-xs text-slate-600">
                날씨를 불러오지 못했습니다. 추천 코스는 아래에서 볼 수 있어요.
              </div>
            )}

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

            {sheetTab === 'weather' && (
              <>
                {weatherQ.data && <WeatherDetails weather={weatherQ.data} />}
                {weatherQ.isError && (
                  <p className="py-4 text-center text-sm text-red-500">
                    날씨 API 실패 — 백엔드 실행 여부를 확인하세요.
                  </p>
                )}
                {weatherQ.isLoading && !weatherQ.data && (
                  <p className="py-4 text-center text-sm text-slate-500">
                    불러오는 중…
                  </p>
                )}
              </>
            )}

            {sheetTab === 'courses' && (
              <>
                {coursesQ.isError && (
                  <p className="py-2 text-center text-sm text-red-500">
                    추천 코스를 불러오지 못했습니다.
                  </p>
                )}
                {coursesQ.isLoading && (
                  <p className="py-4 text-center text-sm text-slate-500">
                    코스 불러오는 중…
                  </p>
                )}
                {toast && (
                  <p className="rounded-xl bg-violet-600 px-3 py-2 text-center text-[11px] font-semibold text-white">
                    {toast} ·{' '}
                    <Link to="/my-courses" className="underline">
                      내 코스 보기
                    </Link>
                  </p>
                )}
                {!coursesQ.isLoading && (
                  <CourseList
                    mode="recommend"
                    courses={recommendCourses}
                    selectedId={selection.selectedId}
                    onSelect={selection.select}
                    onStartRoute={startRoute}
                    onStartRide={startRide}
                    onSaveToMy={handleSaveToMy}
                  />
                )}
              </>
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
