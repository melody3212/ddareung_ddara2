import { useMemo, useState } from 'react'
import {
  findSavedOfficial,
  isLocalCourse,
} from '../localCourseStorage'
import type {
  Course,
  CourseCategory,
  CourseFilter,
} from '../types'
import {
  COURSE_CATEGORIES,
  categoryLabel,
} from '../types'
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

const TAG_CHIPS_RECOMMEND = [
  { key: null as string | null, label: '전체' },
  { key: '한강', label: '한강' },
  { key: '평지', label: '평지' },
  { key: '언덕', label: '언덕' },
  { key: '장거리', label: '장거리' },
  { key: '야경', label: '야경' },
]

type Mode = 'recommend' | 'library'

type Props = {
  courses: Course[]
  mode?: Mode
  selectedId?: number | null
  onSelect?: (course: Course | null) => void
  onStartRoute?: (course: Course) => void
  onStartRide?: (course: Course) => void
  onDeleteLocal?: (course: Course) => void
  /** 추천 → 내 코스 담기 */
  onSaveToMy?: (course: Course, category: CourseCategory) => void
  /** 내 코스 분류 변경 */
  onChangeCategory?: (course: Course, category: CourseCategory) => void
  emptyHint?: string
}

/** 추천 / 내 코스 공통 카드 리스트 */
export function CourseList({
  courses,
  mode = 'recommend',
  selectedId = null,
  onSelect,
  onStartRoute,
  onStartRide,
  onDeleteLocal,
  onSaveToMy,
  onChangeCategory,
  emptyHint,
}: Props) {
  const [difficulty, setDifficulty] =
    useState<CourseFilter['difficulty']>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [category, setCategory] = useState<'all' | CourseCategory>('all')
  const [saveCategory, setSaveCategory] = useState<CourseCategory>('leisure')

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (difficulty !== 'all' && c.difficulty !== difficulty) return false
      if (mode === 'library' && category !== 'all') {
        if ((c.category ?? 'other') !== category) return false
      }
      if (mode === 'recommend' && tag) {
        const needle = tag.toLowerCase()
        if (!c.tags.some((t) => t.toLowerCase().includes(needle))) return false
      }
      return true
    })
  }, [courses, difficulty, tag, category, mode])

  if (!courses.length) {
    return (
      <div className="space-y-2 py-4 text-center">
        <p className="text-sm text-slate-500">
          {mode === 'library' ? '저장된 코스가 없습니다.' : '추천 코스가 없습니다.'}
        </p>
        <p className="text-[11px] text-slate-400">
          {emptyHint ??
            (mode === 'library'
              ? '주행 상세에서 저장하거나, 홈 추천코스에서 「내 코스에 담기」를 눌러 보세요.'
              : '홈 추천코스에서 경로를 확인해 보세요.')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-2">
      {mode === 'library' && (
        <p className="text-[11px] text-slate-500">
          저장 {courses.length}개 · 이 기기에만 보관 (공유는 추후)
        </p>
      )}

      {/* 내 코스: 여가 / 출퇴근 */}
      {mode === 'library' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="분류">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={[
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
              category === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            전체
          </button>
          {COURSE_CATEGORIES.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setCategory(f.key)}
              className={[
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                category === f.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
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

      {/* 추천 태그 */}
      {mode === 'recommend' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="태그 필터">
          {TAG_CHIPS_RECOMMEND.map((t) => (
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
      )}

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          조건에 맞는 코스가 없습니다. 필터를 바꿔 보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const selected = selectedId === c.course_id
            const hasPath = Boolean(c.path && c.path.length >= 2)
            const mine = mode === 'library' || isLocalCourse(c)
            const alreadySaved =
              mode === 'recommend' && findSavedOfficial(c.course_id) != null

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
                        {mode === 'library' && (
                          <span className="rounded-md border border-violet-200 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                            {categoryLabel(c.category)}
                          </span>
                        )}
                        {mode === 'library' && c.savedFrom === 'official' && (
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            추천에서
                          </span>
                        )}
                        {mode === 'library' && c.savedFrom === 'ride' && (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            내 경로
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

                    {/* 추천: 내 코스에 담기 */}
                    {mode === 'recommend' && onSaveToMy && (
                      <>
                        <div className="flex w-full flex-wrap gap-1">
                          {COURSE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => setSaveCategory(cat.key)}
                              className={[
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                saveCategory === cat.key
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-white text-slate-600 ring-1 ring-slate-200',
                              ].join(' ')}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={!hasPath}
                          onClick={() => onSaveToMy(c, saveCategory)}
                          className="rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm disabled:opacity-40"
                        >
                          {alreadySaved ? '내 코스 갱신' : '내 코스에 담기'}
                        </button>
                      </>
                    )}

                    {/* 내 코스: 분류 변경 · 삭제 */}
                    {mode === 'library' && onChangeCategory && (
                      <div className="flex w-full flex-wrap gap-1">
                        {COURSE_CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => onChangeCategory(c, cat.key)}
                            className={[
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              (c.category ?? 'other') === cat.key
                                ? 'bg-violet-600 text-white'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200',
                            ].join(' ')}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {mode === 'library' && onDeleteLocal && (
                      <button
                        type="button"
                        onClick={() => onDeleteLocal(c)}
                        className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-red-600 shadow-sm ring-1 ring-red-200"
                      >
                        삭제
                      </button>
                    )}

                    {!hasPath && (
                      <p className="w-full text-[10px] text-slate-400">
                        경로 좌표가 없어 지도·길찾기를 열 수 없습니다.
                      </p>
                    )}
                    {hasPath && mode === 'recommend' && courseToRouteSearchQuery(c) && (
                      <p className="w-full text-[10px] text-slate-400">
                        탭하면 지도에 경로가 표시됩니다. 「내 코스에 담기」로 모아
                        둘 수 있어요.
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
