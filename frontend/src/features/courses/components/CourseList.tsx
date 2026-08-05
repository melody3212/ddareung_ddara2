import { useMemo, useState } from 'react'
import { isLocalCourse } from '../localCourseStorage'
import type { Course, CourseFilter } from '../types'
import {
  courseToRouteSearchQuery,
  difficultyBadgeClass,
  difficultyLabel,
} from '../labels'

const DIFF_FILTERS: Array<{ key: CourseFilter['difficulty']; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'beginner', label: '초급' },
  { key: 'intermediate', label: '중급' },
  { key: 'advanced', label: '고급' },
]

const TAG_CHIPS = [
  { key: null as string | null, label: '전체' },
  { key: '내코스', label: '내 코스' },
  { key: '한강', label: '한강' },
  { key: '평지', label: '평지' },
  { key: '언덕', label: '언덕' },
  { key: '장거리', label: '장거리' },
  { key: '야경', label: '야경' },
]

type Props = {
  courses: Course[]
  selectedId?: number | null
  onSelect?: (course: Course | null) => void
  onStartRoute?: (course: Course) => void
  onStartRide?: (course: Course) => void
  onDeleteLocal?: (course: Course) => void
}

/** 추천 코스 탭 — 필터·선택·지도/길찾기/주행 액션 */
export function CourseList({
  courses,
  selectedId = null,
  onSelect,
  onStartRoute,
  onStartRide,
  onDeleteLocal,
}: Props) {
  const [difficulty, setDifficulty] =
    useState<CourseFilter['difficulty']>('all')
  const [tag, setTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (difficulty !== 'all' && c.difficulty !== difficulty) return false
      if (tag) {
        if (tag === '내코스') {
          if (!isLocalCourse(c)) return false
        } else {
          const needle = tag.toLowerCase()
          const hit = c.tags.some((t) => t.toLowerCase().includes(needle))
          if (!hit) return false
        }
      }
      return true
    })
  }, [courses, difficulty, tag])

  const localCount = useMemo(
    () => courses.filter((c) => isLocalCourse(c)).length,
    [courses],
  )

  if (!courses.length) {
    return (
      <div className="space-y-2 py-4 text-center">
        <p className="text-sm text-slate-500">추천 코스가 없습니다.</p>
        <p className="text-[11px] text-slate-400">
          주행 기록 상세에서 「코스로 저장」하면 여기에 나타납니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-2">
      {localCount > 0 && (
        <p className="text-[11px] text-slate-500">
          내 코스 {localCount}개 · 이 기기에만 저장 (공유는 추후)
        </p>
      )}

      {/* 난이도 */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="난이도 필터">
        {DIFF_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setDifficulty(f.key)}
            className={[
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
              difficulty === f.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 태그 */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="태그 필터">
        {TAG_CHIPS.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setTag(t.key)}
            className={[
              'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
              tag === t.key
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          조건에 맞는 코스가 없습니다. 필터를 바꿔 보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const selected = selectedId === c.course_id
            const hasPath = Boolean(c.path && c.path.length >= 2)
            const mine = isLocalCourse(c)
            return (
              <li
                key={c.course_id}
                className={[
                  'rounded-2xl border p-3 transition',
                  selected
                    ? mine
                      ? 'border-violet-400 bg-violet-50/80 shadow-sm ring-1 ring-violet-200'
                      : 'border-blue-400 bg-blue-50/80 shadow-sm ring-1 ring-blue-200'
                    : mine
                      ? 'border-violet-100 bg-violet-50/40 hover:border-violet-200 hover:bg-white'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(selected ? null : c)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold text-slate-800">{c.title}</p>
                        {mine && (
                          <span className="rounded-md border border-violet-200 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                            내 코스
                          </span>
                        )}
                        <span
                          className={[
                            'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                            difficultyBadgeClass(c.difficulty),
                          ].join(' ')}
                        >
                          {difficultyLabel(c.difficulty)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.distance_km}km · {c.duration_min}분
                        {hasPath ? ' · 지도 경로' : ''}
                        {mine && c.visibility === 'private' ? ' · 비공개' : ''}
                      </p>
                      <p className="mt-1 text-xs text-blue-600">
                        {c.tags.join(' ')}
                      </p>
                      {c.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </div>
                    {c.rating != null && (
                      <span className="shrink-0 text-sm font-medium text-amber-600">
                        ★ {c.rating}
                      </span>
                    )}
                  </div>
                </button>

                {selected && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-blue-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onSelect?.(c)}
                      className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-blue-700 shadow-sm ring-1 ring-blue-200"
                    >
                      지도에서 보기
                    </button>
                    <button
                      type="button"
                      disabled={!hasPath}
                      onClick={() => onStartRoute?.(c)}
                      className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      이 코스로 길찾기
                    </button>
                    <button
                      type="button"
                      disabled={!hasPath}
                      onClick={() => onStartRide?.(c)}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      주행 시작
                    </button>
                    {mine && onDeleteLocal && (
                      <button
                        type="button"
                        onClick={() => onDeleteLocal(c)}
                        className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-red-600 shadow-sm ring-1 ring-red-200"
                      >
                        내 코스 삭제
                      </button>
                    )}
                    {mine && (
                      <p className="w-full text-[10px] text-violet-600/80">
                        지금은 이 기기에만 저장됩니다. 나중에 다른 사람과 공유할
                        수 있어요.
                      </p>
                    )}
                    {!hasPath && (
                      <p className="w-full text-[10px] text-slate-400">
                        경로 좌표가 없어 지도·길찾기를 열 수 없습니다.
                      </p>
                    )}
                    {hasPath && !mine && courseToRouteSearchQuery(c) && (
                      <p className="w-full text-[10px] text-slate-400">
                        탭하면 지도에 경로가 표시됩니다. 길찾기는 실제 도로
                        경로로 다시 계산합니다.
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
