import {
  formatRideCalories,
  formatRideDistance,
  formatRideDuration,
  formatRideSpeed,
} from '../format'
import type { RideRecord } from '../types'

type Props = {
  record: RideRecord
}

export function RideDetailStats({ record }: Props) {
  const elapsedWall = Math.max(0, record.endedAt - record.startedAt)

  return (
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
