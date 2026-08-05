import { difficultyLabel, type Course } from '../../courses'

type Props = {
  course: Course
  onDismiss: () => void
}

export function CourseGuideBanner({ course, onDismiss }: Props) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-blue-800">추천코스 가이드</p>
        <p className="truncate text-sm font-semibold text-slate-800">
          {course.title}
        </p>
        <p className="text-[11px] text-slate-600">
          {course.distance_km}km · {course.duration_min}분 ·{' '}
          {difficultyLabel(course.difficulty)}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
      >
        해제
      </button>
    </div>
  )
}
