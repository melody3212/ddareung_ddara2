import { useMemo, useState } from 'react'
import {
  DEFAULT_COURSE_FILTER,
  filterCourses,
  type CourseListMode,
} from '../lib/filterCourses'
import type { Course, CourseCategory } from '../types'
import { CourseCard } from './CourseCard'
import { CourseFilters } from './CourseFilters'

type Props = {
  courses: Course[]
  mode?: CourseListMode
  selectedId?: number | null
  onSelect?: (course: Course | null) => void
  onStartRoute?: (course: Course) => void
  onStartRide?: (course: Course) => void
  onDeleteLocal?: (course: Course) => void
  onSaveToMy?: (course: Course, category: CourseCategory) => void
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
  const [filter, setFilter] = useState(DEFAULT_COURSE_FILTER)
  const [saveCategory, setSaveCategory] = useState<CourseCategory>('leisure')

  const filtered = useMemo(
    () => filterCourses(courses, mode, filter),
    [courses, mode, filter],
  )

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

      <CourseFilters mode={mode} filter={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          조건에 맞는 코스가 없습니다. 필터를 바꿔 보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const selected = selectedId === c.course_id
            return (
              <CourseCard
                key={c.course_id}
                course={c}
                mode={mode}
                selected={selected}
                saveCategory={saveCategory}
                onSelect={() => onSelect?.(selected ? null : c)}
                onMapFocus={() => onSelect?.(c)}
                onStartRoute={() => onStartRoute?.(c)}
                onStartRide={() => onStartRide?.(c)}
                onSaveToMy={
                  onSaveToMy ? () => onSaveToMy(c, saveCategory) : undefined
                }
                onSaveCategoryChange={setSaveCategory}
                onChangeCategory={
                  onChangeCategory
                    ? (cat) => onChangeCategory(c, cat)
                    : undefined
                }
                onDelete={onDeleteLocal ? () => onDeleteLocal(c) : undefined}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
