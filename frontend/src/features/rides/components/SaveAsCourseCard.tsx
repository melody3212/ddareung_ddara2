import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildCourseFromRide,
  extractRidePath,
  listLocalCourses,
  saveLocalCourse,
  COURSE_CATEGORIES,
  type CourseCategory,
} from '../../courses'
import type { RideRecord } from '../types'

type Props = {
  record: RideRecord
}

export function SaveAsCourseCard({ record }: Props) {
  const navigate = useNavigate()
  const [courseTitle, setCourseTitle] = useState(() => {
    const d = new Date(record.startedAt)
    return `내 라이딩 ${d.getMonth() + 1}/${d.getDate()}`
  })
  const [category, setCategory] = useState<CourseCategory>('leisure')
  const [courseMsg, setCourseMsg] = useState<string | null>(null)
  const [savedCourseId, setSavedCourseId] = useState<number | null>(() => {
    const already = listLocalCourses().find((c) => c.fromRideId === record.id)
    return already?.course_id ?? null
  })

  const ridePathForCourse = useMemo(() => extractRidePath(record), [record])
  const canSaveCourse = ridePathForCourse.length >= 2

  const handleSaveAsCourse = () => {
    if (ridePathForCourse.length < 2) {
      setCourseMsg(
        `경로 좌표가 부족합니다. (현재 ${ridePathForCourse.length}점 · 최소 2점 필요) GPS가 잡힌 뒤 조금 더 이동해 저장해 주세요.`,
      )
      return
    }
    try {
      const built = buildCourseFromRide({
        ride: { ...record, path: ridePathForCourse },
        title: courseTitle.trim() || undefined,
        visibility: 'private',
        category,
      })
      if (!built) {
        setCourseMsg('경로를 코스로 변환하지 못했습니다.')
        return
      }
      const existing = listLocalCourses().find((c) => c.fromRideId === record.id)
      const toSave = existing
        ? {
            ...built,
            course_id: existing.course_id,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
            category,
          }
        : built
      saveLocalCourse(toSave)
      const ok = listLocalCourses().some((c) => c.course_id === toSave.course_id)
      if (!ok) {
        setCourseMsg('저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.')
        return
      }
      setSavedCourseId(toSave.course_id)
      setCourseMsg(
        existing
          ? '내 코스를 업데이트했습니다. 하단 「내 코스」 탭에서 확인하세요.'
          : '내 코스에 저장했습니다. 하단 「내 코스」 탭에서 확인하세요.',
      )
    } catch (e) {
      setCourseMsg(
        e instanceof Error ? `저장 오류: ${e.message}` : '저장 중 오류가 났습니다.',
      )
    }
  }

  const msgIsError =
    !!courseMsg &&
    (courseMsg.includes('실패') ||
      courseMsg.includes('부족') ||
      courseMsg.includes('오류'))

  return (
    <section className="relative z-10 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
      <h2 className="text-sm font-bold text-violet-900">이 경로를 내 코스에 저장</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-violet-800/80">
        하단 「내 코스」 탭에 모아 둡니다. 여가/출퇴근으로 분류할 수 있어요.
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        경로 점 {ridePathForCourse.length}개
        {canSaveCourse ? ' · 저장 가능' : ' · 2개 이상 필요'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {COURSE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setCategory(cat.key)}
            className={[
              'rounded-full px-2.5 py-1 text-[10px] font-semibold',
              category === cat.key
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200',
            ].join(' ')}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-[11px] font-medium text-slate-600">코스 이름</span>
        <input
          type="text"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
          maxLength={40}
          className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          placeholder="예: 여의도 저녁 한 바퀴"
        />
      </label>
      <button
        type="button"
        onClick={handleSaveAsCourse}
        className={[
          'mt-3 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md active:scale-[0.99]',
          canSaveCourse
            ? 'bg-violet-600 hover:bg-violet-700'
            : 'bg-violet-400 hover:bg-violet-500',
        ].join(' ')}
      >
        {savedCourseId != null ? '내 코스 다시 저장' : '코스로 저장'}
      </button>
      {courseMsg && (
        <p
          className={[
            'mt-2 text-center text-[11px] font-medium',
            msgIsError ? 'text-red-600' : 'text-violet-800',
          ].join(' ')}
          role="status"
        >
          {courseMsg}
        </p>
      )}
      {savedCourseId != null && (
        <button
          type="button"
          onClick={() => navigate('/my-courses')}
          className="mt-2 w-full rounded-xl border border-violet-200 bg-white py-2.5 text-xs font-bold text-violet-700"
        >
          내 코스 탭에서 보기
        </button>
      )}
      {!canSaveCourse && (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-amber-700">
          GPS 경로가 거의 없습니다. 실외에서 위치 권한을 켠 뒤 조금 이동하며 주행을
          다시 기록해 주세요. (버튼은 눌러도 안내가 표시됩니다)
        </p>
      )}
    </section>
  )
}
