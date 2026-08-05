import {
  formatRideCalories,
  formatRideDistance,
  formatRideDuration,
} from '../format'
import { formatWeekRange, type WeekRideStats } from '../lib/rideStats'

type Props = {
  thisWeek: WeekRideStats
}

export function RideWeekSummary({ thisWeek }: Props) {
  return (
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
  )
}
