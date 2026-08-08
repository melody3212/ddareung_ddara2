import type { Weather } from '../types'
import { WeatherAlerts } from './WeatherAlerts'

function gradeStyle(grade: number) {
  if (grade <= 1)
    return {
      wrap: 'from-sky-50 to-blue-50 text-sky-800 ring-sky-100',
      dot: 'bg-sky-500',
    }
  if (grade === 2)
    return {
      wrap: 'from-emerald-50 to-teal-50 text-emerald-800 ring-emerald-100',
      dot: 'bg-emerald-500',
    }
  if (grade === 3)
    return {
      wrap: 'from-amber-50 to-orange-50 text-amber-900 ring-amber-100',
      dot: 'bg-amber-500',
    }
  return {
    wrap: 'from-rose-50 to-red-50 text-rose-900 ring-rose-100',
    dot: 'bg-rose-500',
  }
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
  const s = gradeStyle(grade)
  return (
    <div
      className={[
        'rounded-2xl bg-gradient-to-b px-2 py-2.5 text-center ring-1',
        s.wrap,
      ].join(' ')}
    >
      <div className="mb-1 flex items-center justify-center gap-1">
        <span className={['h-1.5 w-1.5 rounded-full', s.dot].join(' ')} />
        <p className="text-[10px] font-semibold opacity-80">{label}</p>
      </div>
      <p className="text-sm font-extrabold tracking-tight">{gradeLabel}</p>
      <p className="mt-0.5 text-[10px] font-medium opacity-60">{value}</p>
    </div>
  )
}

/** 날씨 탭 — 현재 / 시간대 / 전체 특보 */
export function WeatherDetails({ weather: w }: { weather: Weather }) {
  const national = w.alerts_all ?? []

  return (
    <div className="space-y-3 pb-1">
      {/* 현재 날씨 */}
      <section className="overflow-hidden rounded-3xl border border-slate-100/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-sm">
              📍
            </span>
            <p className="text-sm font-bold text-slate-800">
              {w.location_name}
              <span className="ml-1 font-medium text-slate-400">현재</span>
            </p>
          </div>
          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-100">
            {w.source.includes('kma') ? 'Open-Meteo · 기상청' : w.source}
          </span>
        </div>

        <div className="px-3.5 py-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 text-4xl shadow-inner ring-1 ring-slate-100">
              {w.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[40px] font-black leading-none tracking-tight text-slate-900 tabular-nums">
                {Math.round(w.temp_c)}
                <span className="text-2xl font-bold text-slate-400">°</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {w.condition}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                체감 {Math.round(w.feels_like_c)}° · 강수 {Math.round(w.precip_prob)}% ·
                습도 {Math.round(w.humidity)}% · 바람 {w.wind_ms}m/s
              </p>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <AirChip
              label="미세"
              value={w.pm10 != null ? `${w.pm10} µg` : '—'}
              gradeLabel={w.pm10_label}
              grade={w.pm10_grade}
            />
            <AirChip
              label="초미세"
              value={w.pm25 != null ? `${w.pm25} µg` : '—'}
              gradeLabel={w.pm25_label}
              grade={w.pm25_grade}
            />
            <AirChip
              label="황사"
              value={w.dust != null ? `${w.dust} µg` : '—'}
              gradeLabel={w.dust_label}
              grade={w.dust_grade}
            />
          </div>
        </div>
      </section>

      {/* 시간대별 */}
      {w.hourly?.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-slate-100/80 bg-white p-3.5 shadow-sm">
          <div className="mb-2.5 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">시간대별 예보</p>
              <p className="text-[10px] text-slate-400">1시간 간격 · 가로로 넘겨 보세요</p>
            </div>
          </div>
          <div className="no-scrollbar -mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5">
            {w.hourly.map((h, i) => (
              <div
                key={h.time}
                className={[
                  'flex w-[4.25rem] shrink-0 flex-col items-center rounded-2xl px-1.5 py-2.5 text-center transition',
                  i === 0
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-slate-50 text-slate-700 ring-1 ring-slate-100',
                ].join(' ')}
              >
                <p
                  className={[
                    'text-[11px] font-semibold',
                    i === 0 ? 'text-white/85' : 'text-slate-500',
                  ].join(' ')}
                >
                  {i === 0 ? '지금' : `${h.hour}시`}
                </p>
                <p className="my-1.5 text-xl leading-none">{h.icon}</p>
                <p className="text-[15px] font-extrabold tabular-nums leading-none">
                  {Math.round(h.temp_c)}°
                </p>
                <p
                  className={[
                    'mt-1 text-[10px]',
                    i === 0 ? 'text-white/75' : 'text-slate-400',
                  ].join(' ')}
                >
                  체감 {Math.round(h.feels_like_c)}°
                </p>
                {h.precip_prob > 0 && (
                  <p
                    className={[
                      'mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                      i === 0
                        ? 'bg-white/20 text-white'
                        : 'bg-sky-50 text-sky-600',
                    ].join(' ')}
                  >
                    💧{Math.round(h.precip_prob)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 전체 기상특보 — 접기/펼치기 */}
      {national.length > 0 ? (
        <WeatherAlerts
          alerts={national}
          title="전체 기상특보"
          note={
            (w.alerts_note ? `${w.alerts_note} ` : '') +
            '전국 발효 현황 · 내 지역은 위 라이딩 카드 참고'
          }
          defaultOpen={false}
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-100/80 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-base">📢</span>
            <p className="text-sm font-bold text-slate-800">전체 기상특보</p>
          </div>
          <div className="mt-2.5 rounded-2xl bg-slate-50 px-3 py-5 text-center ring-1 ring-slate-100">
            <p className="text-2xl">🌤️</p>
            <p className="mt-1.5 text-[12px] font-semibold text-slate-600">
              전국 발효 특보 없음
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {w.alerts_note || '특보가 발표되면 여기에 표시됩니다.'}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
