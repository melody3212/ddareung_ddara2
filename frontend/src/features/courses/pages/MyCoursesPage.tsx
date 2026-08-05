/**
 * 내 코스 탭 — 저장한 경로 · 추천에서 담은 코스
 * 분류: 여가 / 출퇴근 / 기타
 */
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KakaoMap } from '../../map'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { CourseList } from '../components/CourseList'
import { saveCourseForRide } from '../courseSession'
import { courseToRouteSearchQuery } from '../labels'
import {
  deleteLocalCourse,
  listLocalCourses,
  updateLocalCourseCategory,
} from '../localCourseStorage'
import type { Course, CourseCategory } from '../types'

export function MyCoursesPage() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<Course | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const courses = useMemo(() => {
    void tick
    return listLocalCourses() as Course[]
  }, [tick])

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  const overlay = useMemo(() => {
    const path = selected?.path
    if (!path || path.length < 2) return null
    return {
      path,
      fitBounds: true as const,
      variant: 'course' as const,
      focusKey,
      boundsPadding: [56, 36, 120, 36] as [number, number, number, number],
    }
  }, [selected, focusKey])

  const handleSelect = (c: Course | null) => {
    setSelected(c)
    if (c) setFocusKey((n) => n + 1)
  }

  const handleDelete = (c: Course) => {
    if (!window.confirm(`「${c.title}」을(를) 내 코스에서 삭제할까요?`)) return
    deleteLocalCourse(c.course_id)
    if (selected?.course_id === c.course_id) setSelected(null)
    refresh()
    setToast('삭제했습니다.')
    window.setTimeout(() => setToast(null), 2500)
  }

  const handleCategory = (c: Course, category: CourseCategory) => {
    updateLocalCourseCategory(c.course_id, category)
    refresh()
    if (selected?.course_id === c.course_id) {
      setSelected({ ...c, category })
    }
  }

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">내 코스</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          내가 탄 경로 · 추천에서 담은 코스를 여가/출퇴근으로 모아 두세요.
        </p>
      </header>

      <div className="relative h-[32vh] min-h-[180px] max-h-[260px] w-full shrink-0 border-b border-slate-200">
        {overlay ? (
          <KakaoMap
            showStations={false}
            showBikePaths={false}
            showSlope={false}
            routeOverlay={overlay}
            compact
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 bg-slate-100 px-6 text-center">
            <p className="text-sm text-slate-500">코스를 선택하면 지도에 경로가 표시됩니다</p>
            <p className="text-[11px] text-slate-400">
              추천코스는 홈에서 「내 코스에 담기」
            </p>
          </div>
        )}
        {selected && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-orange-200 bg-orange-50/95 px-2.5 py-1 text-[10px] font-semibold text-orange-900 shadow">
            {selected.title}
          </div>
        )}
      </div>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-20">
        {toast && (
          <div className="mb-2 rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white">
            {toast}
          </div>
        )}

        <CourseList
          mode="library"
          courses={courses}
          selectedId={selected?.course_id ?? null}
          onSelect={handleSelect}
          onStartRoute={(c) => {
            const qs = courseToRouteSearchQuery(c)
            if (!qs) {
              alert('경로 좌표가 없습니다.')
              return
            }
            navigate(`/search-route?${qs}`)
          }}
          onStartRide={(c) => {
            if (!c.path || c.path.length < 2) {
              alert('경로 좌표가 없습니다.')
              return
            }
            saveCourseForRide(c)
            navigate('/riding')
          }}
          onDeleteLocal={handleDelete}
          onChangeCategory={handleCategory}
        />

        {courses.length === 0 && (
          <div className="mt-4 text-center">
            <Link
              to="/home"
              className="inline-block rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white"
            >
              홈에서 추천코스 보기
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
