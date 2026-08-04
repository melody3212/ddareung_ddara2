import type { Weather } from '../types'

function gradeColor(grade: number) {
  if (grade <= 1) return 'text-sky-600 bg-sky-50'
  if (grade === 2) return 'text-emerald-700 bg-emerald-50'
  if (grade === 3) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
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

/** 날씨 탭 내용 */
export function WeatherDetails({ weather: w }: { weather: Weather }) {
  return (
    <div className="space-y-3">
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

      {w.hourly?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <p className="mb-2 text-sm font-bold text-slate-800">시간대별 날씨</p>
          <p className="mb-2 text-[10px] text-slate-400">1시간 간격 · 온도 / 체감 / 날씨</p>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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
