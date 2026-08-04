/**
 * 주행 탭 — 목록 + 라이브 추적 + 주간/누적 요약
 */
import { useMemo, useState } from 'react'
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
import { formatWeekRange, sumRecords, weekStats } from '../lib/rideStats'
import { listRideRecords } from '../storage'
import type { RideRecord } from '../types'

export function RidingPage() {
  const tracker = useRideTracker()
  const [records, setRecords] = useState<RideRecord[]>(() => listRideRecords())
  const [toast, setToast] = useState<string | null>(null)

  const allTotals = useMemo(() => sumRecords(records), [records])
  const thisWeek = useMemo(() => weekStats(records), [records])

  const refresh = () => setRecords(listRideRecords())

  const routeOverlay = useMemo(() => {
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

  const handleStop = () => {
    const rec = tracker.stop()
    refresh()
    if (rec) {
      setToast(
        `저장됨 · ${formatRideDistance(rec.distanceM)} · ${formatRideCalories(rec.caloriesKcal)} kcal`,
      )
      window.setTimeout(() => setToast(null), 3500)
      // 방금 저장한 기록 상세로 이동할지 선택 — 목록에 남기고 토스트만
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">주행</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          기록은 이 기기에만 저장됩니다. 로그인 없이도 사용할 수 있어요.
        </p>
      </header>

      {tracker.isActive && (
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
          onAddPhoto={tracker.addPhotoFromFile}
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
