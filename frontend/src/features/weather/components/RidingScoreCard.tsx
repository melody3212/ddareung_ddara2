import type { Weather } from '../types'
import { WeatherAlerts } from './WeatherAlerts'

function scoreTheme(score: number) {
  if (score >= 85) {
    return {
      bg: 'from-blue-600 via-sky-500 to-cyan-400',
      ring: 'ring-blue-200/50',
      label: '최고',
      labelBg: 'bg-white/25',
    }
  }
  if (score >= 70) {
    return {
      bg: 'from-emerald-600 via-teal-500 to-cyan-400',
      ring: 'ring-emerald-200/50',
      label: '좋음',
      labelBg: 'bg-white/25',
    }
  }
  if (score >= 50) {
    return {
      bg: 'from-amber-500 via-orange-500 to-rose-400',
      ring: 'ring-amber-200/50',
      label: '보통',
      labelBg: 'bg-white/25',
    }
  }
  return {
    bg: 'from-rose-600 via-red-500 to-orange-400',
    ring: 'ring-rose-200/50',
    label: '주의',
    labelBg: 'bg-white/25',
  }
}

/** 라이딩 점수 배너 + 해당 지역 특보 */
export function RidingScoreCard({ weather: w }: { weather: Weather }) {
  const localAlerts = w.alerts ?? []
  const theme = scoreTheme(w.score)

  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white shadow-lg ring-1',
        theme.bg,
        theme.ring,
      ].join(' ')}
    >
      {/* soft glow */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-black/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-white/90">
              오늘의 라이딩
            </p>
            <span
              className={[
                'rounded-full px-2 py-0.5 text-[10px] font-bold text-white',
                theme.labelBg,
              ].join(' ')}
            >
              {theme.label}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <p className="text-[44px] font-black leading-none tracking-tight tabular-nums">
              {w.score}
            </p>
            <span className="pb-1 text-sm font-semibold text-white/75">/ 100</span>
          </div>
          <p className="mt-2 text-[13px] font-medium leading-snug text-white/95">
            {w.message}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 text-center shadow-inner ring-1 ring-white/20 backdrop-blur-[2px]">
          <span className="text-3xl leading-none drop-shadow-sm">{w.icon}</span>
          <p className="mt-1.5 max-w-[4.5rem] text-[11px] font-semibold leading-tight text-white/95">
            {w.condition}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums leading-none">
            {Math.round(w.temp_c)}°
          </p>
          <p className="mt-0.5 text-[10px] text-white/70">
            체감 {Math.round(w.feels_like_c)}°
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        <MiniStat label="강수" value={`${Math.round(w.precip_prob)}%`} />
        <MiniStat label="바람" value={`${w.wind_ms}m/s`} />
        <MiniStat label="습도" value={`${Math.round(w.humidity)}%`} />
      </div>

      {localAlerts.length > 0 && (
        <div className="relative mt-3.5 border-t border-white/20 pt-3">
          <WeatherAlerts
            alerts={localAlerts}
            embedded
            title="이 지역 특보 · 주의"
            note={null}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/15">
      <span className="text-[10px] font-medium text-white/70">{label} </span>
      <span className="text-[11px] font-bold tabular-nums text-white">{value}</span>
    </div>
  )
}
