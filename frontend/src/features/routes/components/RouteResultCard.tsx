import { formatLegDistance, type RouteSearchResult } from '../types'

type Props = {
  route: RouteSearchResult
  selected?: boolean
  onSelect?: () => void
  onStartNav?: () => void
}

export function RouteResultCard({ route, selected, onSelect, onStartNav }: Props) {
  const elev = route.elevation
  const steepPct = Math.round((elev.steep_ratio ?? 0) * 100)
  const isDdareung = route.mode === 'ddareung'
  const walkLegs = route.legs?.filter((l) => l.kind === 'walk') ?? []
  const walkTotal =
    route.walk_distance_m ??
    walkLegs.reduce((s, l) => s + (l.distance_m || 0), 0)
  const bikeTotal =
    route.bike_distance_m ??
    (route.legs?.filter((l) => l.kind === 'bike').reduce((s, l) => s + l.distance_m, 0) ||
      route.distance_m)
  const walkMin =
    route.walk_duration_min ??
    walkLegs.reduce((s, l) => s + (l.duration_min ?? 0), 0)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full rounded-2xl border p-3 text-left shadow-sm transition',
        selected
          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-200'
          : 'border-slate-100 bg-white hover:border-slate-200',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800">
            {isDdareung ? '따릉이' : '내 자전거'} ·{' '}
            {(route.distance_m / 1000).toFixed(1)}km
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            약 {route.duration_min}분 · 선호 {route.preference}
            {route.is_stub ? (
              <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800">
                stub
              </span>
            ) : (
              <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-800">
                도로
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">최대 경사</p>
          <p
            className={[
              'text-lg font-bold',
              elev.max_grade_pct >= 6 ? 'text-red-600' : 'text-emerald-600',
            ].join(' ')}
          >
            {elev.max_grade_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 따릉이: 도보(대여소) / 라이딩 요약 */}
      {isDdareung && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-xl bg-slate-100 px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-500">🚶 도보 (대여소)</p>
            <p className="text-sm font-bold text-slate-800">
              {formatLegDistance(walkTotal, 'walk')}
            </p>
            <p className="text-[10px] text-slate-500">
              약 {walkMin || '—'}분 · 대여·반납 접근
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-2.5 py-2">
            <p className="text-[10px] font-medium text-emerald-700">🚲 라이딩</p>
            <p className="text-sm font-bold text-emerald-800">
              {formatLegDistance(bikeTotal, 'bike')}
            </p>
            <p className="text-[10px] text-emerald-700/80">
              약 {route.bike_duration_min ?? '—'}분
            </p>
          </div>
        </div>
      )}

      {/* 자전거 도로 비율 (라이딩 구간 기준) */}
      {route.bike_road_share && (
        <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-emerald-800">
            라이딩 구간 · 자전거 도로 비율
          </p>
          <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full shrink-0 bg-emerald-500 transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, route.bike_road_share.on_bike_road_pct))}%`,
              }}
              title="자전거 도로"
            />
            <div className="h-full min-w-0 flex-1 bg-slate-400" title="일반 도로" />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            <span className="font-semibold text-emerald-700">
              자전거 도로 {route.bike_road_share.on_bike_road_pct}%
              <span className="ml-1 font-normal text-emerald-700/80">
                ({formatLegDistance(route.bike_road_share.on_bike_road_m, 'bike')})
              </span>
            </span>
            <span className="font-semibold text-slate-600">
              일반 도로 {route.bike_road_share.off_bike_road_pct}%
              <span className="ml-1 font-normal text-slate-500">
                ({formatLegDistance(route.bike_road_share.off_bike_road_m, 'bike')})
              </span>
            </span>
          </div>
          {(route.bike_road_share.dedicated_pct > 0 ||
            route.bike_road_share.shared_road_pct > 0) && (
            <p className="mt-1 text-[10px] text-slate-500">
              전용·공원형 약 {route.bike_road_share.dedicated_pct}% · 우선·도로형 약{' '}
              {route.bike_road_share.shared_road_pct}%
              <span className="text-slate-400"> (전체 라이딩 대비)</span>
            </p>
          )}
        </div>
      )}

      {/* 경사 요약 — 빨강 = 급경사(≥6%) */}
      <div className="mt-2">
        <p className="mb-1 text-[10px] font-medium text-slate-500">
          경사도 · 지도 색상 = 오르막/내리막 기울기
        </p>
        <div className="mb-1.5 flex flex-wrap gap-1 text-[9px] text-slate-500">
          <span style={{ color: '#22c55e' }}>●&lt;2% 평지</span>
          <span style={{ color: '#eab308' }}>●2–4%</span>
          <span style={{ color: '#f97316' }}>●4–6%</span>
          <span style={{ color: '#ef4444' }} className="font-semibold">
            ●6–8% 급경사
          </span>
          <span style={{ color: '#991b1b' }} className="font-semibold">
            ●≥8% 매우 급함
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="상승" value={`${elev.elevation_gain_m.toFixed(0)}m`} />
          <Chip label="하강" value={`${elev.elevation_loss_m.toFixed(0)}m`} />
          <Chip label="평균|경사|" value={`${elev.avg_abs_grade_pct.toFixed(1)}%`} />
          <Chip
            label="급경사(≥6%) 구간"
            value={`${steepPct}%`}
            danger={steepPct >= 5}
          />
        </div>
      </div>

      {/* 레그 — 도보는 m·분 강조 */}
      {route.legs?.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
          {route.legs.map((leg, i) => {
            const isWalk = leg.kind === 'walk'
            return (
              <li
                key={i}
                className={[
                  'flex items-start gap-2 rounded-lg px-1.5 py-1 text-[11px]',
                  isWalk ? 'bg-slate-50 text-slate-700' : 'text-slate-600',
                ].join(' ')}
              >
                <span
                  className={[
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    isWalk
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-emerald-50 text-emerald-700',
                  ].join(' ')}
                >
                  {isWalk ? '도보' : '자전거'}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block truncate">
                    {leg.from_label} → {leg.to_label}
                  </span>
                  {isWalk && (
                    <span className="mt-0.5 block text-[10px] font-medium text-blue-700">
                      도보 {formatLegDistance(leg.distance_m, 'walk')}
                      {leg.duration_min != null ? ` · 약 ${leg.duration_min}분` : ''}
                    </span>
                  )}
                </span>
                {!isWalk && (
                  <span className="shrink-0 text-right text-slate-500">
                    <span className="block font-medium">
                      {formatLegDistance(leg.distance_m, 'bike')}
                    </span>
                    {leg.duration_min != null && (
                      <span className="block text-[10px]">약 {leg.duration_min}분</span>
                    )}
                  </span>
                )}
                {isWalk && (
                  <span className="shrink-0 text-right font-semibold text-slate-800">
                    {formatLegDistance(leg.distance_m, 'walk')}
                    {leg.duration_min != null && (
                      <span className="block text-[10px] font-normal text-slate-500">
                        약 {leg.duration_min}분
                      </span>
                    )}
                  </span>
                )}
                {leg.grade_summary && !isWalk && (
                  <span
                    className={
                      leg.grade_summary.max_grade_pct >= 6
                        ? 'shrink-0 font-medium text-red-600'
                        : 'shrink-0 text-slate-400'
                    }
                  >
                    max {leg.grade_summary.max_grade_pct.toFixed(1)}%
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {route.notes?.length > 0 && (
        <p className="mt-2 line-clamp-2 text-[10px] text-slate-400">
          {route.notes.find((n) => n.includes('도보')) ?? route.notes[0]}
        </p>
      )}

      {(route.steps?.length ?? 0) > 0 && (
        <p className="mt-1.5 text-[10px] font-medium text-blue-600">
          길안내 {route.steps!.length}단계 포함
          {selected ? ' · 아래에서 시작' : ''}
        </p>
      )}

      {onStartNav && selected && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onStartNav()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation()
              onStartNav()
            }
          }}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white"
        >
          이 경로 길안내
        </span>
      )}
    </button>
  )
}

function Chip({
  label,
  value,
  danger,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <span
      className={[
        'rounded-lg px-2 py-1 text-[10px]',
        danger ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600',
      ].join(' ')}
    >
      <span className="opacity-70">{label} </span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}
