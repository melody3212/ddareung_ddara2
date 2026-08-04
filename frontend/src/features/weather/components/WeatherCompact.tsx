import type { Weather } from '../types'

/** 접힌 시트 요약 */
export function WeatherCompact({ weather: w }: { weather: Weather }) {
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
