import type { Weather } from '../types'
import { WeatherAlerts } from './WeatherAlerts'

function scoreColor(score: number) {
  if (score >= 85) return 'text-blue-600 bg-blue-50 ring-blue-100'
  if (score >= 70) return 'text-emerald-600 bg-emerald-50 ring-emerald-100'
  if (score >= 50) return 'text-amber-600 bg-amber-50 ring-amber-100'
  return 'text-rose-600 bg-rose-50 ring-rose-100'
}

/** 접힌 시트 요약 */
export function WeatherCompact({ weather: w }: { weather: Weather }) {
  return (
    <div className="rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 text-2xl shadow-inner ring-1 ring-slate-100">
            {w.icon}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold tabular-nums leading-tight text-slate-900">
              {Math.round(w.temp_c)}°
              <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                체감 {Math.round(w.feels_like_c)}°
              </span>
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500">
              {w.condition}
              {(w.alerts?.length ?? 0) > 0 ? ' · 특보 있음' : ''}
            </p>
          </div>
        </div>

        <div
          className={[
            'flex h-12 min-w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-2xl px-2 ring-1',
            scoreColor(w.score),
          ].join(' ')}
        >
          <span className="text-[9px] font-semibold opacity-80">라이딩</span>
          <span className="text-lg font-black tabular-nums leading-none">
            {w.score}
          </span>
        </div>
      </div>
      <WeatherAlerts weather={w} alerts={w.alerts} compact />
    </div>
  )
}
