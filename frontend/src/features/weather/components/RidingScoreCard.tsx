import { useState } from 'react'
import type { Weather } from '../types'
import { WeatherAlerts } from './WeatherAlerts'

function scoreTheme(score: number) {
  if (score >= 85) {
    return {
      bg: 'from-blue-600 via-sky-500 to-cyan-400',
      ring: 'ring-blue-200/40',
      label: '최고',
      face: '🤩',
      faceLabel: '최고예요',
    }
  }
  if (score >= 70) {
    return {
      bg: 'from-emerald-600 via-teal-500 to-cyan-400',
      ring: 'ring-emerald-200/40',
      label: '좋음',
      face: '😊',
      faceLabel: '좋아요',
    }
  }
  if (score >= 50) {
    return {
      bg: 'from-amber-500 via-orange-500 to-rose-400',
      ring: 'ring-amber-200/40',
      label: '보통',
      face: '😐',
      faceLabel: '보통이에요',
    }
  }
  return {
    bg: 'from-rose-600 via-red-500 to-orange-400',
    ring: 'ring-rose-200/40',
    label: '주의',
    face: '😓',
    faceLabel: '조심해요',
  }
}

/** 접힌 요약 토글 + 펼치면 상세·지역 특보 */
export function RidingScoreCard({ weather: w }: { weather: Weather }) {
  const [open, setOpen] = useState(false)
  const localAlerts = w.alerts ?? []
  const theme = scoreTheme(w.score)
  const alertCount = localAlerts.length

  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl bg-gradient-to-br text-white shadow-md ring-1 transition-shadow',
        theme.bg,
        theme.ring,
        open ? 'shadow-lg' : '',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />

      {/* 토글 헤더 — 항상 보임 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center gap-3 px-3.5 py-3 text-left"
        aria-expanded={open}
        aria-label={open ? '라이딩 점수 접기' : '라이딩 점수 펼치기'}
      >
        {/* 점수에 따른 표정 */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-[28px] shadow-inner ring-1 ring-white/25 backdrop-blur-[2px]">
          {theme.face}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] font-semibold text-white/90">오늘의 라이딩</p>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {theme.label}
            </span>
            {alertCount > 0 && (
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-rose-600">
                특보 {alertCount}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[28px] font-black leading-none tabular-nums tracking-tight">
              {w.score}
            </span>
            <span className="text-xs font-semibold text-white/70">점</span>
            <span className="text-[12px] font-medium text-white/85">
              · {theme.faceLabel}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xl leading-none opacity-95">{w.icon}</span>
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-white/80">
            {open ? '접기' : '상세'}
            <svg
              viewBox="0 0 20 20"
              className={[
                'h-3.5 w-3.5 transition-transform duration-200',
                open ? 'rotate-180' : '',
              ].join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 7.5 10 12.5 15 7.5"
              />
            </svg>
          </span>
        </div>
      </button>

      {/* 펼침: 상세 */}
      {open && (
        <div className="relative border-t border-white/20 px-3.5 pb-3.5 pt-3">
          <p className="text-[13px] font-medium leading-snug text-white/95">
            {w.message}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              <MiniStat label="기온" value={`${Math.round(w.temp_c)}°`} />
              <MiniStat label="체감" value={`${Math.round(w.feels_like_c)}°`} />
              <MiniStat label="강수" value={`${Math.round(w.precip_prob)}%`} />
              <MiniStat label="바람" value={`${w.wind_ms}m/s`} />
              <MiniStat label="습도" value={`${Math.round(w.humidity)}%`} />
            </div>
            <div className="flex shrink-0 flex-col items-center rounded-2xl bg-white/15 px-2.5 py-2 text-center ring-1 ring-white/20">
              <span className="text-2xl leading-none">{w.icon}</span>
              <p className="mt-1 max-w-[3.5rem] text-[10px] font-semibold leading-tight text-white/90">
                {w.condition}
              </p>
            </div>
          </div>

          <p className="mt-2.5 text-[10px] text-white/65">
            기온·체감·강수·바람·미세/초미세·황사 반영 · 탭해서 접을 수 있어요
          </p>

          {localAlerts.length > 0 && (
            <div className="mt-3">
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
