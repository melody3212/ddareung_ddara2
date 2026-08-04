import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KakaoMap } from '../../map'
import { useRouteNavigation } from '../hooks/useRouteNavigation'
import { clearNavSession, loadNavSession } from '../navSession'
import { formatLegDistance } from '../types'
import { iconEmoji } from '../lib/routeProgress'

export function NavigationPage() {
  const navigate = useNavigate()
  const [session] = useState(() => loadNavSession())
  const route = session?.route ?? null
  const meta = session?.meta

  const nav = useRouteNavigation({ route, enabled: Boolean(route) })

  const routeOverlay = useMemo(() => {
    if (!route) return null
    return {
      path: route.path,
      segments: route.segments,
      legs: route.legs?.map((l) => ({ kind: l.kind, path: l.path })),
      fitBounds: !nav.position,
    }
  }, [route, nav.position])

  const endNav = () => {
    clearNavSession()
    navigate('/search-route')
  }

  if (!route) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <p className="text-4xl">🗺️</p>
        <p className="text-sm font-semibold text-slate-800">안내 중인 경로가 없습니다</p>
        <p className="text-xs text-slate-500">
          길찾기에서 경로를 검색한 뒤
          <br />
          「길안내 시작」을 눌러 주세요.
        </p>
        <button
          type="button"
          onClick={() => navigate('/search-route')}
          className="mt-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          길찾기로 이동
        </button>
      </div>
    )
  }

  const primary = nav.nextStep ?? nav.currentStep
  const modeLabel = route.mode === 'ddareung' ? '따릉이' : '내 자전거'
  const stepMode =
    primary?.leg_kind === 'walk' ? '도보' : primary?.leg_kind === 'bike' ? '자전거' : modeLabel

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-900">
      {/* 지도 */}
      <div className="relative min-h-0 flex-1">
        <KakaoMap
          showStations={false}
          showBikePaths={false}
          showSlope={false}
          routeOverlay={routeOverlay}
          followPosition={
            nav.position
              ? { lat: nav.position.lat, lng: nav.position.lng }
              : null
          }
          compact
          className="absolute inset-0 h-full w-full"
        />

        <div className="absolute left-3 top-3 z-20 flex gap-2">
          <button
            type="button"
            onClick={endNav}
            className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow"
          >
            안내 종료
          </button>
          <Link
            to="/search-route"
            className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow"
          >
            경로 목록
          </Link>
        </div>

        {/* 상태 배지 */}
        <div className="absolute right-3 top-3 z-20">
          <StatusBadge status={nav.status} offM={nav.distToRoute} />
        </div>
      </div>

      {/* 안내 패널 */}
      <div className="z-30 shrink-0 rounded-t-3xl bg-white px-4 pb-6 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {meta?.originName ?? '출발'} → {meta?.destinationName ?? '도착'} · {modeLabel}
          </span>
          <span>
            남은 {formatLegDistance(nav.remaining_m, 'bike')} · 약{' '}
            {Math.max(1, Math.ceil((nav.remaining_m / 15000) * 60))}분
          </span>
        </div>

        {/* 진행 바 */}
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${Math.round(nav.progress * 100)}%` }}
          />
        </div>

        {nav.status === 'arrived' ? (
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-3xl">🏁</p>
            <p className="mt-1 text-lg font-bold text-emerald-800">도착했습니다</p>
            <button
              type="button"
              onClick={endNav}
              className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
            >
              안내 종료
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-2xl bg-slate-900 p-4 text-white">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                {primary ? iconEmoji(primary.icon) : '↑'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-white/60">
                  {stepMode} · 다음 안내
                  {nav.distToNextM < 5000 && (
                    <span className="ml-1 text-sky-300">
                      {formatLegDistance(nav.distToNextM, 'walk')} 앞
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-lg font-bold leading-snug">
                  {primary?.instruction ??
                    (nav.status === 'locating'
                      ? 'GPS 위치를 잡는 중…'
                      : '경로를 따라 이동하세요')}
                </p>
                {primary?.road_name && (
                  <p className="mt-1 truncate text-xs text-white/50">{primary.road_name}</p>
                )}
              </div>
            </div>

            {nav.currentStep && nav.nextStep && (
              <p className="mt-2 text-[11px] text-slate-500">
                그 다음: {nav.nextStep.instruction}
              </p>
            )}

            {nav.status === 'offroute' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                경로에서 벗어난 것 같습니다 (약 {Math.round(nav.distToRoute)}m).
                경로로 돌아가 주세요.
              </p>
            )}

            {nav.errorMsg && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {nav.errorMsg}
              </p>
            )}

            {/* 스텝 미리보기 */}
            {nav.steps.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                  전체 안내 {nav.steps.length}단계
                  {nav.stepIndex >= 0 ? ` · 현재 ${nav.stepIndex + 1}` : ''}
                </summary>
                <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-[11px] text-slate-600">
                  {nav.steps.map((s, i) => (
                    <li
                      key={i}
                      className={[
                        'flex gap-2 rounded-lg px-2 py-1',
                        i === nav.stepIndex ? 'bg-blue-50 font-semibold text-blue-800' : '',
                      ].join(' ')}
                    >
                      <span className="w-5 shrink-0">{iconEmoji(s.icon)}</span>
                      <span className="min-w-0 flex-1">{s.instruction}</span>
                      <span className="shrink-0 text-slate-400">
                        {formatLegDistance(s.distance_m, s.leg_kind)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  offM,
}: {
  status: string
  offM: number
}) {
  const map: Record<string, { label: string; className: string }> = {
    locating: { label: 'GPS 수신 중', className: 'bg-slate-800 text-white' },
    navigating: { label: '안내 중', className: 'bg-blue-600 text-white' },
    offroute: {
      label: `경로 이탈 ${Math.round(offM)}m`,
      className: 'bg-amber-500 text-white',
    },
    arrived: { label: '도착', className: 'bg-emerald-600 text-white' },
    error: { label: '위치 오류', className: 'bg-red-600 text-white' },
    idle: { label: '대기', className: 'bg-slate-500 text-white' },
  }
  const s = map[status] ?? map.idle
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${s.className}`}>
      {s.label}
    </span>
  )
}
