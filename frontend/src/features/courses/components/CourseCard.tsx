import type { ReactNode } from 'react'
import { findSavedOfficial, isLocalCourse } from '../localCourseStorage'
import type { CourseListMode } from '../lib/filterCourses'
import {
  difficultyBadgeClass,
  difficultyLabel,
} from '../labels'
import {
  categoryLabel,
  type Course,
  type CourseCategory,
} from '../types'
import { CategoryPickRow } from './CourseFilters'

type Props = {
  course: Course
  mode: CourseListMode
  selected: boolean
  saveCategory: CourseCategory
  onSelect: () => void
  onMapFocus: () => void
  onStartRoute?: () => void
  onStartRide?: () => void
  onSaveToMy?: () => void
  onChangeCategory?: (category: CourseCategory) => void
  onDelete?: () => void
  onSaveCategoryChange?: (category: CourseCategory) => void
}

export function CourseCard({
  course: c,
  mode,
  selected,
  saveCategory,
  onSelect,
  onMapFocus,
  onStartRoute,
  onStartRide,
  onSaveToMy,
  onChangeCategory,
  onDelete,
  onSaveCategoryChange,
}: Props) {
  const hasPath = Boolean(c.path && c.path.length >= 2)
  const mine = mode === 'library' || isLocalCourse(c)
  const alreadySaved =
    mode === 'recommend' && findSavedOfficial(c.course_id) != null

  return (
    <li
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
      <button type="button" onClick={onSelect} className="w-full text-left">
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
            <p className="mt-1 text-xs text-blue-600">{c.tags.join(' ')}</p>
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
          <ActionBtn onClick={onMapFocus} tone="ghost">
            지도에서 보기
          </ActionBtn>
          <ActionBtn onClick={onStartRoute} disabled={!hasPath} tone="primary">
            이 코스로 길찾기
          </ActionBtn>
          <ActionBtn onClick={onStartRide} disabled={!hasPath} tone="green">
            주행 시작
          </ActionBtn>

          {mode === 'recommend' && onSaveToMy && onSaveCategoryChange && (
            <>
              <CategoryPickRow
                value={saveCategory}
                onChange={onSaveCategoryChange}
              />
              <ActionBtn onClick={onSaveToMy} disabled={!hasPath} tone="violet">
                {alreadySaved ? '내 코스 갱신' : '내 코스에 담기'}
              </ActionBtn>
            </>
          )}

          {mode === 'library' && onChangeCategory && (
            <CategoryPickRow
              value={c.category ?? 'other'}
              onChange={onChangeCategory}
            />
          )}
          {mode === 'library' && onDelete && (
            <ActionBtn onClick={onDelete} tone="danger">
              삭제
            </ActionBtn>
          )}

          {!hasPath && (
            <p className="w-full text-[10px] text-slate-400">
              경로 좌표가 없어 지도·길찾기를 열 수 없습니다.
            </p>
          )}
          {hasPath && mode === 'recommend' && (
            <p className="w-full text-[10px] text-slate-400">
              탭하면 지도에 경로가 표시됩니다. 「내 코스에 담기」로 모아 둘 수
              있어요.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tone: 'ghost' | 'primary' | 'green' | 'violet' | 'danger'
}) {
  const tones: Record<typeof tone, string> = {
    ghost:
      'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200',
    primary: 'bg-blue-600 text-white shadow-sm',
    green: 'bg-emerald-600 text-white shadow-sm',
    violet: 'bg-violet-600 text-white shadow-sm',
    danger: 'bg-white text-red-600 shadow-sm ring-1 ring-red-200',
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-xl px-3 py-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40',
        tones[tone],
      ].join(' ')}
    >
      {children}
    </button>
  )
}
