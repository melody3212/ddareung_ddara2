import { Link } from 'react-router-dom'
import {
  formatRideCalories,
  formatRideDate,
  formatRideDistance,
  formatRideDuration,
} from '../format'
import type { RideRecord } from '../types'

type Props = {
  record: RideRecord
}

export function RideRecordCard({ record }: Props) {
  const thumb = record.photos?.[0]?.dataUrl
  const photoCount = record.photos?.length ?? 0

  return (
    <Link
      to={`/riding/${record.id}`}
      className="block rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {thumb ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img src={thumb} alt="" className="h-full w-full object-cover" />
            {photoCount > 1 && (
              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                +{photoCount - 1}
              </span>
            )}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {formatRideDate(record.startedAt)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatRideDuration(record.movingMs)} · 평균{' '}
                {record.avgSpeedKmh.toFixed(1)} km/h
                {photoCount > 0 && (
                  <span className="text-slate-400"> · 📷 {photoCount}</span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-blue-600">
                {formatRideDistance(record.distanceM)}
              </p>
              <p className="text-[11px] text-slate-500">
                {formatRideCalories(record.caloriesKcal)} kcal
              </p>
            </div>
          </div>
          <p className="mt-2 text-right text-[10px] font-medium text-blue-500">
            상세 보기 →
          </p>
        </div>
      </div>
    </Link>
  )
}
