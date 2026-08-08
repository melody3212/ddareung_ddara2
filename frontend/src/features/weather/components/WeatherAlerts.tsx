import { useState } from 'react'
import type { Weather, WeatherAlert } from '../types'

function levelMeta(level: string) {
  if (level === 'warning') {
    return {
      label: '경보',
      pill: 'bg-red-500 text-white',
      card: 'border-red-200/80 bg-gradient-to-br from-red-50 to-orange-50 text-red-950',
      bar: 'bg-red-500',
    }
  }
  if (level === 'watch') {
    return {
      label: '주의보',
      pill: 'bg-amber-500 text-white',
      card: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-950',
      bar: 'bg-amber-500',
    }
  }
  return {
    label: '안내',
    pill: 'bg-sky-500 text-white',
    card: 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-blue-50 text-sky-950',
    bar: 'bg-sky-500',
  }
}

function worstLevel(alerts: WeatherAlert[]): string {
  if (alerts.some((a) => a.level === 'warning')) return 'warning'
  if (alerts.some((a) => a.level === 'watch')) return 'watch'
  return 'info'
}

type Props = {
  weather?: Weather
  alerts?: WeatherAlert[]
  compact?: boolean
  /** 라이딩 점수 카드 안 */
  embedded?: boolean
  title?: string
  note?: string | null
  emptyText?: string | null
  /** 기본 접힘 여부 (기본: 펼침) */
  defaultOpen?: boolean
}

/** 폭염·강풍 등 특보/주의 — 접기/펼치기 가능 */
export function WeatherAlerts({
  weather,
  alerts: alertsProp,
  compact = false,
  embedded = false,
  title = '특보 · 주의',
  note,
  emptyText = null,
  defaultOpen = true,
}: Props) {
  const alerts = alertsProp ?? weather?.alerts ?? []
  const noteText = note !== undefined ? note : weather?.alerts_note
  const [open, setOpen] = useState(defaultOpen)

  if (!alerts.length) {
    if (emptyText) {
      return <p className="text-center text-[11px] text-slate-400">{emptyText}</p>
    }
    return null
  }

  const top = alerts[0]
  const worst = worstLevel(alerts)
  const meta = levelMeta(worst)
  const summary = `${top.title}${alerts.length > 1 ? ` 외 ${alerts.length - 1}` : ''}`

  // 접힌 시트 요약: 탭하면 펼침 안내는 부모에서 처리 — 여기선 칩만
  if (compact) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span
          className={[
            'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm',
            meta.pill,
          ].join(' ')}
        >
          <span className="text-[11px] leading-none">{top.icon}</span>
          <span className="truncate">{summary}</span>
        </span>
      </div>
    )
  }

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white/12 ring-1 ring-white/20">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
          aria-expanded={open}
        >
          <span className="text-sm leading-none">{top.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white/95">{title}</p>
            {!open && (
              <p className="truncate text-[10px] text-white/75">{summary}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">
            {alerts.length}
          </span>
          <Chevron open={open} light />
        </button>
        {open && (
          <div className="space-y-1.5 border-t border-white/15 px-2 pb-2.5 pt-2">
            {alerts.map((a) => (
              <EmbeddedAlert key={a.code + a.title} alert={a} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // 일반 (날씨 탭 전체 특보 등)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50/80"
        aria-expanded={open}
      >
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm',
            worst === 'warning'
              ? 'bg-red-50'
              : worst === 'watch'
                ? 'bg-amber-50'
                : 'bg-sky-50',
          ].join(' ')}
        >
          {top.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-slate-800">{title}</p>
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                meta.pill,
              ].join(' ')}
            >
              {alerts.length}건
            </span>
          </div>
          {!open && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{summary}</p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-slate-400">
          {open ? '접기' : '펼치기'}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-2 border-t border-slate-100 px-3 py-3">
          {alerts.map((a) => (
            <AlertCard key={a.code + a.message.slice(0, 24)} alert={a} />
          ))}
          {noteText && (
            <p className="px-0.5 text-[10px] leading-relaxed text-slate-400">
              {noteText}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Chevron({ open, light }: { open: boolean; light?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={[
        'h-4 w-4 shrink-0 transition-transform duration-200',
        open ? 'rotate-180' : '',
        light ? 'text-white/80' : 'text-slate-400',
      ].join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  )
}

function EmbeddedAlert({ alert: a }: { alert: WeatherAlert }) {
  const meta = levelMeta(a.level)
  const isOfficial = a.source === 'kma'
  return (
    <div className="overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20">
      <div className="flex">
        <div className={['w-1 shrink-0', meta.bar].join(' ')} />
        <div className="min-w-0 flex-1 px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{a.icon}</span>
            <p className="truncate text-[12px] font-bold text-white">{a.title}</p>
            <span className="shrink-0 rounded-md bg-white/25 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {meta.label}
            </span>
            {isOfficial && (
              <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-800">
                공식
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/85">
            {a.message}
          </p>
        </div>
      </div>
    </div>
  )
}

function AlertCard({ alert: a }: { alert: WeatherAlert }) {
  const meta = levelMeta(a.level)
  const isOfficial = a.source === 'kma'
  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border shadow-sm',
        meta.card,
      ].join(' ')}
    >
      <div className="flex">
        <div className={['w-1.5 shrink-0', meta.bar].join(' ')} />
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-lg shadow-sm">
              {a.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[13px] font-bold tracking-tight">{a.title}</p>
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                    meta.pill,
                  ].join(' ')}
                >
                  {meta.label}
                </span>
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                    isOfficial
                      ? 'bg-slate-800 text-white'
                      : 'bg-white/80 text-slate-600 ring-1 ring-slate-200/80',
                  ].join(' ')}
                >
                  {isOfficial ? '기상청' : '조건'}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                {a.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
