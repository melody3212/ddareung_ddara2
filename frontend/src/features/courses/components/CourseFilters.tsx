import type { ReactNode } from 'react'
import {
  DIFFICULTY_FILTERS,
  RECOMMEND_TAG_CHIPS,
  type CourseListFilterState,
  type CourseListMode,
} from '../lib/filterCourses'
import { COURSE_CATEGORIES, type CourseCategory } from '../types'

type Props = {
  mode: CourseListMode
  filter: CourseListFilterState
  onChange: (next: CourseListFilterState) => void
}

export function CourseFilters({ mode, filter, onChange }: Props) {
  return (
    <div className="space-y-2">
      {mode === 'library' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="분류">
          <Chip
            active={filter.category === 'all'}
            onClick={() => onChange({ ...filter, category: 'all' })}
            activeClass="bg-violet-600 text-white shadow-sm"
            idleClass="bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            전체
          </Chip>
          {COURSE_CATEGORIES.map((f) => (
            <Chip
              key={f.key}
              active={filter.category === f.key}
              onClick={() => onChange({ ...filter, category: f.key })}
              activeClass="bg-violet-600 text-white shadow-sm"
              idleClass="bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              {f.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="난이도 필터">
        {DIFFICULTY_FILTERS.map((f) => (
          <Chip
            key={f.key}
            active={filter.difficulty === f.key}
            onClick={() => onChange({ ...filter, difficulty: f.key })}
            activeClass="bg-blue-600 text-white shadow-sm"
            idleClass="bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {mode === 'recommend' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="태그 필터">
          {RECOMMEND_TAG_CHIPS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onChange({ ...filter, tag: t.key })}
              className={[
                'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
                filter.tag === t.key
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryPickRow({
  value,
  onChange,
}: {
  value: CourseCategory
  onChange: (c: CourseCategory) => void
}) {
  return (
    <div className="flex w-full flex-wrap gap-1">
      {COURSE_CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          type="button"
          onClick={() => onChange(cat.key)}
          className={[
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            value === cat.key
              ? 'bg-violet-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200',
          ].join(' ')}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  activeClass,
  idleClass,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  activeClass: string
  idleClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
        active ? activeClass : idleClass,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
