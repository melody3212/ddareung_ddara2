import type { Weather } from '../types'

function scoreTone(score: number) {
  if (score >= 85) return 'from-blue-500 to-sky-400'
  if (score >= 70) return 'from-emerald-500 to-teal-400'
  if (score >= 50) return 'from-amber-500 to-orange-400'
  return 'from-rose-500 to-red-400'
}

/** 라이딩 점수 배너 (탭 위 고정) */
export function RidingScoreCard({ weather: w }: { weather: Weather }) {
  return (
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
        기온·체감·강수·바람·미세/초미세·황사(먼지) 반영
      </p>
    </div>
  )
}
