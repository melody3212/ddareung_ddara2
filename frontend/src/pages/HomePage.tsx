import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CourseList,
  courseToRouteSearchQuery,
  coursesApi,
  deleteLocalCourse,
  isLocalCourse,
  mergeCoursesWithLocal,
  saveCourseForRide,
  type Course,
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

type SheetTab = 'weather' | 'courses'

export function HomePage() {
  const navigate = useNavigate()
  const { showStations, showBikePaths, showSlope, sheetSnap, setSheetSnap } =
    useUiStore()
  const [locationRequestId, setLocationRequestId] = useState(0)
  const [sheetTab, setSheetTab] = useState<SheetTab>('weather')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  /** 같은 코스 재클릭·지도에서 보기 시 fitBounds 강제 */
  const [courseFocusKey, setCourseFocusKey] = useState(0)

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
  /** 로컬 내 코스 변경 시 목록 갱신 */
  const [localTick, setLocalTick] = useState(0)
  useEffect(() => {
    const bump = () => setLocalTick((n) => n + 1)
    window.addEventListener('focus', bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener('focus', bump)
      window.removeEventListener('storage', bump)
    }
  }, [])

  const stationsMetaQ = useQuery({
    queryKey: ['stations-meta'],
    queryFn: stationsApi.meta,
    staleTime: 60_000,
  })

  const allCourses = useMemo(
    () => mergeCoursesWithLocal(coursesQ.data ?? []),
    // localTick: 내 코스 저장/삭제 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coursesQ.data, localTick],
  )

  const courseOverlay = useMemo(() => {
    const path = selectedCourse?.path
    if (!path || path.length < 2) return null
    return {
      path,
      fitBounds: true as const,
      variant: 'course' as const,
      focusKey: courseFocusKey,
      // 상단 칩 + 하단 네비·접힌 시트 영역 피해서 경로가 보이게
      boundsPadding: [72, 40, 160, 40] as [number, number, number, number],
    }
  }, [selectedCourse, courseFocusKey])

  const handleSelectCourse = (course: Course | null) => {
    setSelectedCourse(course)
    if (course) {
      setSheetTab('courses')
      // 지도 대부분이 보이도록 시트 접기 + 경로 재포커스
      setSheetSnap('collapsed')
      setCourseFocusKey((n) => n + 1)
    }
  }

  const handleStartRoute = (course: Course) => {
    const qs = courseToRouteSearchQuery(course)
    if (!qs) {
      alert('이 코스에는 경로 좌표가 없습니다.')
      return
    }
    navigate(`/search-route?${qs}`)
  }

  const handleStartRide = (course: Course) => {
    if (!course.path || course.path.length < 2) {
      alert('이 코스에는 경로 좌표가 없습니다.')
      return
    }
    saveCourseForRide(course)
    navigate('/riding')
  }

  const handleDeleteLocal = (course: Course) => {
    if (!isLocalCourse(course)) return
    if (!window.confirm(`「${course.title}」 내 코스를 삭제할까요?`)) return
    deleteLocalCourse(course.course_id)
    if (selectedCourse?.course_id === course.course_id) {
      setSelectedCourse(null)
    }
    setLocalTick((n) => n + 1)
  }

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-slate-100">
      <KakaoMap
        showStations={selectedCourse ? false : showStations}
        showBikePaths={selectedCourse ? false : showBikePaths}
        showSlope={selectedCourse ? false : showSlope}
        stations={stationsQ.data}
        locationRequestId={locationRequestId}
        routeOverlay={courseOverlay}
        // 코스 선택 시 파란 추천선 숨겨 강조 경로만 보이게
        compact={Boolean(selectedCourse)}
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
        {selectedCourse && (
          <div className="pointer-events-auto flex w-fit max-w-full items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/95 px-2.5 py-1 text-[10px] font-semibold text-orange-900 shadow">
            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
            <span className="truncate">코스 · {selectedCourse.title}</span>
            <button
              type="button"
              className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-600 shadow-sm"
              onClick={() => {
                setCourseFocusKey((n) => n + 1)
                setSheetSnap('collapsed')
              }}
            >
              다시 보기
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm"
              onClick={() => setSelectedCourse(null)}
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
        {/* 접힘: 날씨 요약 (실패 시에도 시트 안내) */}
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

        {/* 펼침: 날씨 실패해도 탭·코스는 항상 표시 */}
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
                {!coursesQ.isLoading && (
                  <CourseList
                    courses={allCourses}
                    selectedId={selectedCourse?.course_id ?? null}
                    onSelect={handleSelectCourse}
                    onStartRoute={handleStartRoute}
                    onStartRide={handleStartRide}
                    onDeleteLocal={handleDeleteLocal}
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
