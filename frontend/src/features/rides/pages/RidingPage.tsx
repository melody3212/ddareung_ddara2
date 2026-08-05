/**
 * 주행 탭 — 목록 + 라이브 추적 + 주간/누적 요약
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearCourseForRide,
  loadCourseForRide,
  type Course,
} from '../../courses'
import { KakaoMap } from '../../map'
import { BottomNav } from '../../../shared/ui/BottomNav'
import { CourseGuideBanner } from '../components/CourseGuideBanner'
import { DemoRideSeedCard } from '../components/DemoRideSeedCard'
import { LiveRidePanel } from '../components/LiveRidePanel'
import { RideRecordList } from '../components/RideRecordList'
import { RideTotalsCard } from '../components/RideTotalsCard'
import { RideWeekSummary } from '../components/RideWeekSummary'
import {
  formatRideCalories,
  formatRideDistance,
} from '../format'
import { useRideRecords } from '../hooks/useRideRecords'
import { useRideTracker } from '../hooks/useRideTracker'
import { useToast } from '../hooks/useToast'
import {
  buildGuideRouteOverlay,
  buildLiveRouteOverlay,
  pickRideMapOverlay,
} from '../lib/mapOverlay'
import { seedDemoRideRecord } from '../lib/seedDemoRide'

export function RidingPage() {
  const navigate = useNavigate()
  const tracker = useRideTracker()
  const { records, refresh, allTotals, thisWeek } = useRideRecords()
  const { toast, showToast } = useToast()
  const [guideCourse, setGuideCourse] = useState<Course | null>(() =>
    loadCourseForRide(),
  )

  useEffect(() => {
    setGuideCourse(loadCourseForRide())
  }, [])

  const liveOverlay = useMemo(
    () =>
      buildLiveRouteOverlay(
        tracker.isActive,
        tracker.path,
        tracker.position,
      ),
    [tracker.isActive, tracker.path, tracker.position],
  )

  const guideOverlay = useMemo(
    () =>
      buildGuideRouteOverlay(
        guideCourse,
        tracker.isActive,
        tracker.path.length,
      ),
    [guideCourse, tracker.isActive, tracker.path.length],
  )

  const routeOverlay = pickRideMapOverlay(liveOverlay, guideOverlay)
  const showMap = tracker.isActive || Boolean(guideOverlay)

  const handleStop = () => {
    const rec = tracker.stop()
    refresh()
    if (rec) {
      showToast(
        `저장됨 · ${formatRideDistance(rec.distanceM)} · ${formatRideCalories(rec.caloriesKcal)} kcal · 상세에서 코스 저장 가능`,
        4500,
      )
    } else {
      showToast('이동이 너무 짧아 저장하지 않았습니다. (20m 또는 30초 이상)')
    }
  }

  const handleDiscard = () => {
    if (!window.confirm('현재 주행을 저장하지 않고 버릴까요?')) return
    tracker.discard()
    showToast('주행을 취소했습니다.', 2500)
  }

  const handleSeedDemo = () => {
    const rec = seedDemoRideRecord()
    refresh()
    showToast(
      `데모 기록 추가됨 · ${formatRideDistance(rec.distanceM)} · 상세에서 코스 저장 가능`,
      4000,
    )
    navigate(`/riding/${rec.id}`)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">주행</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          기록은 이 기기에만 저장됩니다. 로그인 없이도 사용할 수 있어요.
        </p>
      </header>

      {guideCourse && (
        <CourseGuideBanner
          course={guideCourse}
          onDismiss={() => {
            clearCourseForRide()
            setGuideCourse(null)
          }}
        />
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
            <RideWeekSummary thisWeek={thisWeek} />
            <RideTotalsCard totals={allTotals} />
            <DemoRideSeedCard onSeed={handleSeedDemo} />
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
          <RideRecordList records={records} onRefresh={refresh} />
        )}
      </main>

      <BottomNav />
    </div>
  )
}
