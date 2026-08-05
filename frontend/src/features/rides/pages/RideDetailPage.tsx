/**
 * 주행 기록 상세 — 경로 지도 + 통계 + 추억 사진 + 코스 저장 + 삭제
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  buildCourseFromRide,
  extractRidePath,
  listLocalCourses,
  saveLocalCourse,
} from '../../courses'
import { KakaoMap } from '../../map'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { RidePhotoStrip } from '../components/RidePhotoStrip'
import {
  formatRideCalories,
  formatRideDate,
  formatRideDistance,
  formatRideDuration,
  formatRideSpeed,
} from '../format'
import {
  compressImageFile,
  MAX_RIDE_PHOTOS,
  newPhotoId,
} from '../lib/photoCompress'
import { deleteRideRecord, getRideRecord, saveRideRecord } from '../storage'
import type { RidePhoto, RideRecord } from '../types'

export function RideDetailPage() {
  const { rideId } = useParams<{ rideId: string }>()
  const navigate = useNavigate()
  const [gone, setGone] = useState(false)
  const [record, setRecord] = useState<RideRecord | null>(() =>
    rideId ? getRideRecord(rideId) : null,
  )
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [courseMsg, setCourseMsg] = useState<string | null>(null)
  const [savedCourseId, setSavedCourseId] = useState<number | null>(null)

  useEffect(() => {
    if (!rideId || gone) {
      setRecord(null)
      return
    }
    const rec = getRideRecord(rideId)
    setRecord(rec)
    if (rec) {
      const d = new Date(rec.startedAt)
      setCourseTitle(`내 라이딩 ${d.getMonth() + 1}/${d.getDate()}`)
      const already = listLocalCourses().find((c) => c.fromRideId === rec.id)
      setSavedCourseId(already?.course_id ?? null)
    }
    setCourseMsg(null)
  }, [rideId, gone])

  const routeOverlay = useMemo(() => {
    if (!record?.path?.length) return null
    return {
      path: record.path,
      fitBounds: true,
      variant: 'course' as const,
    }
  }, [record])

  const ridePathForCourse = useMemo(
    () => (record ? extractRidePath(record) : []),
    [record],
  )
  const canSaveCourse = ridePathForCourse.length >= 2

  const handleSaveAsCourse = () => {
    if (!record) {
      setCourseMsg('기록을 불러오지 못했습니다.')
      return
    }
    if (ridePathForCourse.length < 2) {
      setCourseMsg(
        `경로 좌표가 부족합니다. (현재 ${ridePathForCourse.length}점 · 최소 2점 필요) GPS가 잡힌 뒤 조금 더 이동해 저장해 주세요.`,
      )
      return
    }
    try {
      const built = buildCourseFromRide({
        ride: {
          ...record,
          // 정규화된 path로 저장 보장
          path: ridePathForCourse,
        },
        title: courseTitle.trim() || undefined,
        visibility: 'private',
      })
      if (!built) {
        setCourseMsg('경로를 코스로 변환하지 못했습니다.')
        return
      }
      // 같은 주행에서 다시 저장하면 이전 로컬 코스 갱신
      const existing = listLocalCourses().find((c) => c.fromRideId === record.id)
      const toSave = existing
        ? {
            ...built,
            course_id: existing.course_id,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
          }
        : built
      saveLocalCourse(toSave)
      // 저장 검증
      const ok = listLocalCourses().some((c) => c.course_id === toSave.course_id)
      if (!ok) {
        setCourseMsg('저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.')
        return
      }
      setSavedCourseId(toSave.course_id)
      setCourseMsg(
        existing
          ? '내 코스를 업데이트했습니다. 홈 → 추천코스에서 볼 수 있어요.'
          : '내 코스로 저장했습니다. 홈 → 추천코스에서 볼 수 있어요.',
      )
    } catch (e) {
      setCourseMsg(
        e instanceof Error ? `저장 오류: ${e.message}` : '저장 중 오류가 났습니다.',
      )
    }
  }

  const photos = record?.photos ?? []

  const persist = useCallback((next: RideRecord) => {
    saveRideRecord(next)
    setRecord(next)
  }, [])

  const handleAddPhoto = async (file: File) => {
    if (!record) return
    if (photos.length >= MAX_RIDE_PHOTOS) {
      setPhotoError(`사진은 최대 ${MAX_RIDE_PHOTOS}장까지입니다.`)
      return
    }
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const dataUrl = await compressImageFile(file)
      const photo: RidePhoto = {
        id: newPhotoId(),
        dataUrl,
        takenAt: Date.now(),
        lat: null,
        lng: null,
      }
      const next: RideRecord = {
        ...record,
        photos: [...photos, photo],
      }
      persist(next)
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : '사진 추가 실패')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleRemovePhoto = (photoId: string) => {
    if (!record) return
    const next: RideRecord = {
      ...record,
      photos: photos.filter((p) => p.id !== photoId),
    }
    persist(next)
    setPhotoError(null)
  }

  const handleDelete = () => {
    if (!record) return
    if (!window.confirm('이 주행 기록을 삭제할까요? 되돌릴 수 없습니다.')) return
    deleteRideRecord(record.id)
    setGone(true)
    navigate('/riding', { replace: true })
  }

  if (!record) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
        <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
          <Link
            to="/riding"
            className="rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            ← 목록
          </Link>
          <h1 className="text-lg font-bold text-slate-800">기록 상세</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <p className="text-sm text-slate-500">기록을 찾을 수 없습니다.</p>
          <Link
            to="/riding"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            주행 탭으로
          </Link>
        </main>
        <BottomNav />
      </div>
    )
  }

  const elapsedWall = Math.max(0, record.endedAt - record.startedAt)

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
        <Link
          to="/riding"
          className="rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ← 목록
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-slate-800">주행 상세</h1>
          <p className="truncate text-[11px] text-slate-500">
            {formatRideDate(record.startedAt)}
          </p>
        </div>
      </header>

      <div className="relative h-[36vh] min-h-[200px] max-h-[320px] w-full shrink-0 border-b border-slate-200">
        {record.path.length >= 2 ? (
          <KakaoMap
            showStations={false}
            showBikePaths={false}
            showSlope={false}
            routeOverlay={routeOverlay}
            compact
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
            저장된 경로 좌표가 없습니다
          </div>
        )}
      </div>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-center text-[11px] font-medium text-slate-500">거리</p>
          <p className="text-center text-3xl font-bold text-slate-900">
            {formatRideDistance(record.distanceM)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="이동 시간" value={formatRideDuration(record.movingMs)} />
            <Stat label="전체 경과" value={formatRideDuration(elapsedWall)} />
            <Stat
              label="평균 속도"
              value={`${formatRideSpeed(record.avgSpeedKmh)} km/h`}
            />
            <Stat
              label="최고 속도"
              value={`${formatRideSpeed(record.maxSpeedKmh)} km/h`}
            />
            <Stat
              label="칼로리"
              value={`${formatRideCalories(record.caloriesKcal)} kcal`}
            />
            <Stat
              label="경로 점"
              value={`${record.points?.length ?? record.path.length}개`}
            />
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-400">
            칼로리는 속도·체중(기본 70kg) 기반 추정치입니다
          </p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <RidePhotoStrip
            photos={photos}
            max={MAX_RIDE_PHOTOS}
            busy={photoBusy}
            error={photoError}
            canAdd
            canRemove
            onAddFile={handleAddPhoto}
            onRemove={handleRemovePhoto}
            onOpen={(p) => setLightbox(p.dataUrl)}
          />
          <p className="mt-2 text-center text-[10px] text-slate-400">
            사진은 이 기기에만 저장됩니다 · 최대 {MAX_RIDE_PHOTOS}장
          </p>
        </section>

        {record.note && (
          <section className="rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-600 shadow-sm">
            {record.note}
          </section>
        )}

        {/* 주행 경로 → 내 코스 (로컬, 공유는 추후) */}
        <section className="relative z-10 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-violet-900">이 경로를 코스로 저장</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-violet-800/80">
            추천코스 탭에 「내 코스」로 올라갑니다. 지금은 이 기기에만 저장되며,
            나중에 다른 사람과 공유하는 기능으로 확장할 예정이에요.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            경로 점 {ridePathForCourse.length}개
            {canSaveCourse ? ' · 저장 가능' : ' · 2개 이상 필요'}
          </p>
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
                courseMsg.includes('실패') ||
                courseMsg.includes('부족') ||
                courseMsg.includes('오류')
                  ? 'text-red-600'
                  : 'text-violet-800',
              ].join(' ')}
              role="status"
            >
              {courseMsg}
            </p>
          )}
          {savedCourseId != null && (
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="mt-2 w-full rounded-xl border border-violet-200 bg-white py-2.5 text-xs font-bold text-violet-700"
            >
              홈 추천코스에서 보기
            </button>
          )}
          {!canSaveCourse && (
            <p className="mt-2 text-center text-[10px] leading-relaxed text-amber-700">
              GPS 경로가 거의 없습니다. 실외에서 위치 권한을 켠 뒤 조금 이동하며
              주행을 다시 기록해 주세요. (버튼은 눌러도 안내가 표시됩니다)
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={handleDelete}
          className="mb-6 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
        >
          이 기록 삭제
        </button>
      </main>

      {lightbox && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          aria-label="사진 닫기"
        >
          <img
            src={lightbox}
            alt="확대"
            className="max-h-[85dvh] max-w-full rounded-lg object-contain"
          />
        </button>
      )}

      <BottomNav />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}
