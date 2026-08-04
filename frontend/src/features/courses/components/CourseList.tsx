import type { Course } from '../types'

/** 추천 코스 탭 */
export function CourseList({ courses }: { courses: Course[] }) {
  if (!courses.length) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">추천 코스가 없습니다.</p>
    )
  }
  return (
    <ul className="space-y-2 pb-2">
      {courses.map((c) => (
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
              {c.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c.description}</p>
              )}
            </div>
            {c.rating != null && (
              <span className="text-sm font-medium text-amber-600">★ {c.rating}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
