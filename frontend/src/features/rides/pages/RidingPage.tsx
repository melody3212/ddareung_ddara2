/**
 * 주행 탭 — 목록 + 라이브 추적 + 주간/누적 요약
 * 추천코스에서 진입 시 가이드 경로·배너 표시
 */
import { useEffect, useMemo, useState } from 'react'
import {
  clearCourseForRide,
  difficultyLabel,
  loadCourseForRide,
  type Course,
} from '../../courses'
import { KakaoMap } from '../../map'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { LiveRidePanel } from '../components/LiveRidePanel'
import { RideRecordCard } from '../components/RideRecordCard'
import {
  formatRideCalories,
  formatRideDistance,
  formatRideDuration,
} from '../format'
import { useRideTracker } from '../hooks/useRideTracker'
import { seedDemoRideRecord } from '../lib/seedDemoRide'
import { formatWeekRange, sumRecords, weekStats } from '../lib/rideStats'
import { listRideRecords } from '../storage'
import type { RideRecord } from '../types'
import { useNavigate } from 'react-router-dom'

export function RidingPage() {
  const navigate = useNavigate()
  const tracker = useRideTracker()
  const [records, setRecords] = useState<RideRecord[]>(() => listRideRecords())
  const [toast, setToast] = useState<string | null>(null)
  const [guideCourse, setGuideCourse] = useState<Course | null>(() =>
    loadCourseForRide(),
  )

  const allTotals = useMemo(() => sumRecords(records), [records])
  const thisWeek = useMemo(() => weekStats(records), [records])

  useEffect(() => {
    setGuideCourse(loadCourseForRide())
  }, [])

  const refresh = () => setRecords(listRideRecords())

  const guideOverlay = useMemo(() => {
    const path = guideCourse?.path
    if (!path || path.length < 2) return null
    // 라이브 추적 중에는 GPS 경로 우선
    if (tracker.isActive && tracker.path.length >= 2) return null
    return { path, fitBounds: !tracker.isActive }
  }, [guideCourse, tracker.isActive, tracker.path.length])

  const liveOverlay = useMemo(() => {
    if (!tracker.isActive || tracker.path.length < 2) {
      if (tracker.isActive && tracker.position) {
        return {
          path: [[tracker.position.lng, tracker.position.lat]],
          fitBounds: false,
        }
      }
      return null
    }
    return {
      path: tracker.path,
      fitBounds: tracker.path.length < 4,
    }
  }, [tracker.isActive, tracker.path, tracker.position])

  const routeOverlay = liveOverlay ?? guideOverlay

  const handleStop = () => {
    const rec = tracker.stop()
    refresh()
    if (rec) {
      setToast(
        `저장됨 · ${formatRideDistance(rec.distanceM)} · ${formatRideCalories(rec.caloriesKcal)} kcal · 상세에서 코스 저장 가능`,
      )
      window.setTimeout(() => setToast(null), 4500)
    } else {
      setToast('이동이 너무 짧아 저장하지 않았습니다. (20m 또는 30초 이상)')
      window.setTimeout(() => setToast(null), 3500)
    }
  }

  const handleDiscard = () => {
    if (!window.confirm('현재 주행을 저장하지 않고 버릴까요?')) return
    tracker.discard()
    setToast('주행을 취소했습니다.')
    window.setTimeout(() => setToast(null), 2500)
  }

  const dismissGuide = () => {
    clearCourseForRide()
    setGuideCourse(null)
  }

  /** 실외 이동 없이 코스 저장 UI 테스트용 */
  const handleSeedDemo = () => {
    const rec = seedDemoRideRecord()
    refresh()
    setToast(
      `데모 기록 추가됨 · ${formatRideDistance(rec.distanceM)} · 상세에서 코스 저장 가능`,
    )
    window.setTimeout(() => setToast(null), 4000)
    navigate(`/riding/${rec.id}`)
  }

  const showMap = tracker.isActive || Boolean(guideOverlay)

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">주행</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          기록은 이 기기에만 저장됩니다. 로그인 없이도 사용할 수 있어요.
        </p>
      </header>

      {guideCourse && (
        <div className="flex items-start justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-800">추천코스 가이드</p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {guideCourse.title}
            </p>
            <p className="text-[11px] text-slate-600">
              {guideCourse.distance_km}km · {guideCourse.duration_min}분 ·{' '}
              {difficultyLabel(guideCourse.difficulty)}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissGuide}
            className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
          >
            해제
          </button>
        </div>
      )}

      {showMap && (
        <div className="relative h-[28vh] min-h-[160px] max-h-[240px] w-full shrink-0 border-b border-slate-200">
          <KakaoMap
            showStations={false}
            showBikePaths={false}
            showSlope={false}
            routeOverlay={routeOverlay}
            followPosition={
              tracker.position
                ? { lat: tracker.position.lat, lng: tracker.position.lng }
                : null
            }
            compact
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {toast && (
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white">
            {toast}
          </div>
        )}

        {!tracker.isActive && (
          <>
            {/* 이번 주 */}
            <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-blue-700">이번 주</p>
                <p className="text-[10px] text-blue-500/80">
                  {formatWeekRange(thisWeek.weekStart)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-800">{thisWeek.count}</p>
                  <p className="text-[10px] text-slate-500">횟수</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {formatRideDistance(thisWeek.distanceM)}
                  </p>
                  <p className="text-[10px] text-slate-500">거리</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">
                    {formatRideCalories(thisWeek.calories)}
                    <span className="text-xs font-medium text-slate-500"> kcal</span>
                  </p>
                  <p className="text-[10px] text-slate-500">칼로리</p>
                </div>
              </div>
              {thisWeek.movingMs > 0 && (
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  이동 {formatRideDuration(thisWeek.movingMs)}
                </p>
              )}
            </section>

            {/* 전체 누적 */}
            <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500">전체 누적</p>
              <p className="mt-1 text-sm text-slate-700">
                {allTotals.count}회 · {formatRideDistance(allTotals.distanceM)} ·{' '}
                {formatRideCalories(allTotals.calories)} kcal
                {allTotals.movingMs > 0 && (
                  <span className="text-slate-400">
                    {' '}
                    · {formatRideDuration(allTotals.movingMs)}
                  </span>
                )}
              </p>
            </section>

            {/* 실외 이동 없이 코스 저장 테스트용 */}
            <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 p-3">
              <p className="text-[11px] font-bold text-amber-900">테스트용</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-amber-800/90">
                밖에 나가지 않고도 「코스로 저장」을 시험할 수 있어요. 여의도 샘플
                경로가 있는 가짜 주행 기록을 추가합니다.
              </p>
              <button
                type="button"
                onClick={handleSeedDemo}
                className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 active:scale-[0.99]"
              >
                데모 주행 기록 추가 → 상세로
              </button>
            </section>
          </>
        )}

        <LiveRidePanel
          status={tracker.status}
          distanceM={tracker.distanceM}
          movingMs={tracker.movingMs}
          currentSpeedKmh={tracker.currentSpeedKmh}
          maxSpeedKmh={tracker.maxSpeedKmh}
          locating={tracker.locating}
          errorMsg={tracker.errorMsg}
          accuracy={tracker.accuracy}
          photos={tracker.photos}
          photoBusy={tracker.photoBusy}
          photoError={tracker.photoError}
          maxPhotos={tracker.maxPhotos}
          onAddPhoto={(file) => {
            void tracker.addPhotoFromFile(file)
          }}
          onRemovePhoto={tracker.removePhoto}
          onStart={tracker.start}
          onPause={tracker.pause}
          onResume={tracker.resume}
          onStop={handleStop}
          onDiscard={handleDiscard}
        />

        {!tracker.isActive && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">최근 기록</h2>
              <button
                type="button"
                onClick={refresh}
                className="text-[11px] font-medium text-blue-600"
              >
                새로고침
              </button>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-8 text-center shadow-sm">
                <p className="text-sm text-slate-500">아직 저장된 주행이 없습니다.</p>
                <p className="mt-1 text-xs text-slate-400">
                  주행을 종료하면 여기에 목록이 쌓입니다.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {records.map((r) => (
                  <li key={r.id}>
                    <RideRecordCard record={r} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
