import {
  formatRideCalories,
  formatRideDistance,
  formatRideDuration,
  formatRideSpeed,
} from '../format'
import { estimateCaloriesKcal } from '../lib/rideMetrics'
import {
  DEFAULT_RIDER_WEIGHT_KG,
  type RidePhoto,
  type RideStatus,
} from '../types'
import { RidePhotoStrip } from './RidePhotoStrip'

type Props = {
  status: RideStatus
  distanceM: number
  movingMs: number
  currentSpeedKmh: number
  maxSpeedKmh: number
  locating: boolean
  errorMsg: string | null
  accuracy: number | null
  weightKg?: number
  photos?: RidePhoto[]
  photoBusy?: boolean
  photoError?: string | null
  maxPhotos?: number
  onAddPhoto?: (file: File) => void | Promise<void>
  onRemovePhoto?: (photoId: string) => void
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
}

export function LiveRidePanel({
  status,
  distanceM,
  movingMs,
  currentSpeedKmh,
  maxSpeedKmh,
  locating,
  errorMsg,
  accuracy,
  weightKg = DEFAULT_RIDER_WEIGHT_KG,
  photos = [],
  photoBusy,
  photoError,
  maxPhotos = 5,
  onAddPhoto,
  onRemovePhoto,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: Props) {
  const active = status === 'recording' || status === 'paused'
  const liveKcal = estimateCaloriesKcal(distanceM, weightKg, movingMs)

  if (!active) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="text-center">
          <p className="text-3xl" aria-hidden>
            🚴
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">주행 시작</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            GPS로 경로·거리·시간·칼로리를 기록합니다.
            <br />
            기록은 이 기기에만 저장됩니다.
          </p>
        </div>
        {errorMsg && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            {errorMsg}
          </p>
        )}
        <button
          type="button"
          onClick={onStart}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99]"
        >
          주행 시작
        </button>
      </section>
    )
  }

  const statusLabel =
    status === 'paused' ? '일시정지' : locating ? 'GPS 잡는 중…' : '기록 중'

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={[
            'rounded-full px-2.5 py-1 text-[11px] font-bold',
            status === 'paused'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800',
          ].join(' ')}
        >
          {status === 'recording' && (
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
          )}
          {statusLabel}
        </span>
        {accuracy != null && (
          <span className="text-[10px] text-slate-400">
            정확도 ±{Math.round(accuracy)}m
          </span>
        )}
      </div>

      <div className="text-center">
        <p className="text-[11px] font-medium text-slate-500">거리</p>
        <p className="text-4xl font-bold tracking-tight text-slate-900">
          {formatRideDistance(distanceM)}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-600">
          {formatRideDuration(movingMs)}
        </p>
        <p className="text-[10px] text-slate-400">이동 시간 (일시정지 제외)</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
          <p className="text-[10px] text-slate-500">현재</p>
          <p className="text-base font-bold text-slate-800">
            {formatRideSpeed(status === 'paused' ? 0 : currentSpeedKmh)}
            <span className="text-[10px] font-medium text-slate-500"> km/h</span>
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
          <p className="text-[10px] text-slate-500">최고</p>
          <p className="text-base font-bold text-slate-800">
            {formatRideSpeed(maxSpeedKmh)}
            <span className="text-[10px] font-medium text-slate-500"> km/h</span>
          </p>
        </div>
        <div className="rounded-xl bg-orange-50 px-2 py-2 text-center">
          <p className="text-[10px] text-orange-700/80">칼로리</p>
          <p className="text-base font-bold text-orange-700">
            {formatRideCalories(liveKcal)}
            <span className="text-[10px] font-medium"> kcal</span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
          {errorMsg}
        </p>
      )}

      <RidePhotoStrip
        photos={photos}
        max={maxPhotos}
        busy={photoBusy}
        error={photoError}
        canAdd={Boolean(onAddPhoto)}
        canRemove={Boolean(onRemovePhoto)}
        onAddFile={onAddPhoto}
        onRemove={onRemovePhoto}
      />

      <div className="mt-4 flex gap-2">
        {status === 'recording' ? (
          <button
            type="button"
            onClick={onPause}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            일시정지
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            재개
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          종료·저장
        </button>
      </div>
      <button
        type="button"
        onClick={onDiscard}
        className="mt-2 w-full py-2 text-center text-[11px] font-medium text-slate-400 hover:text-red-500"
      >
        저장하지 않고 버리기
      </button>
    </section>
  )
}
