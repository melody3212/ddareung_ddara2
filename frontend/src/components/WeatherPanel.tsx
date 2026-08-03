import type { Weather } from '../lib/api'

function gradeColor(grade: number) {
  if (grade <= 1) return 'text-sky-600 bg-sky-50'
  if (grade === 2) return 'text-emerald-700 bg-emerald-50'
  if (grade === 3) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function scoreTone(score: number) {
  if (score >= 85) return 'from-blue-500 to-sky-400'
  if (score >= 70) return 'from-emerald-500 to-teal-400'
  if (score >= 50) return 'from-amber-500 to-orange-400'
  return 'from-rose-500 to-red-400'
}

type Props = {
  weather: Weather
  compact?: boolean
}

/** 바텀시트용 날씨 + 라이딩 점수 패널 */
export function WeatherPanel({ weather: w, compact }: Props) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{w.icon}</span>
          <div>
            <p className="text-lg font-bold text-slate-800">
              {Math.round(w.temp_c)}°
              <span className="ml-1 text-xs font-normal text-slate-500">
                체감 {Math.round(w.feels_like_c)}°
              </span>
            </p>
            <p className="text-[11px] text-slate-500">{w.condition}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-blue-600">라이딩</p>
          <p className="text-xl font-bold text-blue-700">{w.score}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 라이딩 점수 */}
      <div
        className={[
          'rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm',
          scoreTone(w.score),
        ].join(' ')}
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-white/90">라이딩 점수</p>
            <p className="text-4xl font-bold leading-tight">{w.score}</p>
            <p className="mt-1 text-sm text-white/95">{w.message}</p>
          </div>
          <div className="text-right text-sm text-white/90">
            <p className="text-3xl leading-none">{w.icon}</p>
            <p className="mt-1">{w.condition}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-white/70">
          기온·체감·강수·바람·미세/초미세·황사(먼지)를 반영한 규칙 점수
        </p>
      </div>

      {/* 현재 날씨 요약 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">{w.location_name} 현재</p>
          <p className="text-[10px] text-slate-400">{w.source}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{w.icon}</span>
            <div>
              <p className="text-3xl font-bold text-slate-900">{Math.round(w.temp_c)}°</p>
              <p className="text-xs text-slate-500">체감 {Math.round(w.feels_like_c)}°</p>
            </div>
          </div>
          <div className="flex-1 space-y-0.5 text-xs text-slate-600">
            <p>
              {w.condition} · 강수확률 {Math.round(w.precip_prob)}%
            </p>
            <p>
              습도 {Math.round(w.humidity)}% · 바람 {w.wind_ms}m/s
            </p>
          </div>
        </div>

        {/* 대기질 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <AirChip
            label="미세"
            value={w.pm10 != null ? `${w.pm10}` : '-'}
            gradeLabel={w.pm10_label}
            grade={w.pm10_grade}
          />
          <AirChip
            label="초미세"
            value={w.pm25 != null ? `${w.pm25}` : '-'}
            gradeLabel={w.pm25_label}
            grade={w.pm25_grade}
          />
          <AirChip
            label="황사·먼지"
            value={w.dust != null ? `${w.dust}` : '-'}
            gradeLabel={w.dust_label}
            grade={w.dust_grade}
          />
        </div>
      </div>

      {/* 1시간 간격 예보 */}
      {w.hourly?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <p className="mb-2 text-sm font-bold text-slate-800">시간대별 날씨</p>
          <p className="mb-2 text-[10px] text-slate-400">1시간 간격 · 온도 / 체감 / 날씨</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {w.hourly.map((h) => (
              <div
                key={h.time}
                className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-slate-50 px-1 py-2 text-center"
              >
                <p className="text-[11px] font-medium text-slate-500">{h.hour}시</p>
                <p className="my-1 text-xl leading-none">{h.icon}</p>
                <p className="text-sm font-bold text-slate-800">{Math.round(h.temp_c)}°</p>
                <p className="text-[10px] text-slate-400">체감 {Math.round(h.feels_like_c)}°</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{h.condition}</p>
                {h.precip_prob > 0 && (
                  <p className="text-[10px] text-sky-600">💧{Math.round(h.precip_prob)}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AirChip({
  label,
  value,
  gradeLabel,
  grade,
}: {
  label: string
  value: string
  gradeLabel: string
  grade: number
}) {
  return (
    <div className={`rounded-xl px-2 py-2 text-center ${gradeColor(grade)}`}>
      <p className="text-[10px] opacity-80">{label}</p>
      <p className="text-sm font-bold">{gradeLabel}</p>
      <p className="text-[10px] opacity-70">{value} µg/m³</p>
    </div>
  )
}
