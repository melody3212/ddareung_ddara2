import {
  formatRideCalories,
  formatRideDistance,
  formatRideDuration,
} from '../format'
import type { RideTotals } from '../lib/rideStats'

type Props = {
  totals: RideTotals
}

export function RideTotalsCard({ totals }: Props) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium text-slate-500">전체 누적</p>
      <p className="mt-1 text-sm text-slate-700">
        {totals.count}회 · {formatRideDistance(totals.distanceM)} ·{' '}
        {formatRideCalories(totals.calories)} kcal
        {totals.movingMs > 0 && (
          <span className="text-slate-400">
            {' '}
            · {formatRideDuration(totals.movingMs)}
          </span>
        )}
      </p>
    </section>
  )
}
